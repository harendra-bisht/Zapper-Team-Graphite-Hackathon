"""
Student Performance Analytics & Management System (SPAMS)
=========================================================
Main Flask Application & REST API
"""

import os
import csv
import io
from datetime import datetime, date
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from werkzeug.security import generate_password_hash

import database as db
from auth import (
    token_required,
    role_required,
    verify_password,
    generate_token,
    get_current_user_from_request
)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})


# -----------------------------------------------------------------------------
# Global Error Handlers & Health Check
# -----------------------------------------------------------------------------
@app.errorhandler(400)
def bad_request(e):
    return jsonify({'error': 'Bad Request', 'message': str(e)}), 400

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Resource Not Found'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal Server Error', 'message': 'An unexpected error occurred.'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    db_type = db.get_db_type()
    return jsonify({
        'status': 'healthy',
        'database_backend': db_type.upper(),
        'timestamp': datetime.now().isoformat()
    })


# -----------------------------------------------------------------------------
# Module 1: Authentication & User Profile
# -----------------------------------------------------------------------------
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400

    user = db.query_one("""
        SELECT u.id, u.username, u.email, u.password_hash, u.role, u.full_name,
               u.department, u.status,
               s.id AS student_id, s.roll_number, s.course_id, s.current_semester_id,
               fp.id AS faculty_id, fp.employee_id, fp.designation
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id
        LEFT JOIN faculty_profiles fp ON u.id = fp.user_id
        WHERE u.username = %s OR u.email = %s
    """, (username, username))

    if not user or not verify_password(password, user['password_hash']):
        return jsonify({'error': 'Invalid username or password.'}), 401

    if user.get('status') != 'active':
        return jsonify({'error': 'Account is inactive. Please contact administration.'}), 403

    token = generate_token(user['id'], user['username'], user['role'])

    # Build sanitized user payload
    safe_user = {
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'role': user['role'],
        'full_name': user['full_name'],
        'department': user['department'],
        'student_id': user.get('student_id'),
        'roll_number': user.get('roll_number'),
        'faculty_id': user.get('faculty_id'),
        'employee_id': user.get('employee_id'),
        'designation': user.get('designation')
    }

    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': safe_user
    })


@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user_profile(current_user):
    return jsonify({'user': current_user})


# -----------------------------------------------------------------------------
# Module 2: Academic Setup (Admin Role)
# -----------------------------------------------------------------------------
@app.route('/api/courses', methods=['GET'])
@token_required
def get_courses(current_user):
    courses = db.query_all("SELECT * FROM courses ORDER BY code ASC")
    return jsonify(courses)


@app.route('/api/courses', methods=['POST'])
@token_required
@role_required(['admin'])
def create_course(current_user):
    data = request.get_json() or {}
    code = data.get('code', '').strip().upper()
    name = data.get('name', '').strip()
    department = data.get('department', '').strip()
    duration_years = int(data.get('duration_years', 4))
    total_semesters = int(data.get('total_semesters', 8))

    if not code or not name or not department:
        return jsonify({'error': 'Course code, name, and department are required.'}), 400

    existing = db.query_one("SELECT id FROM courses WHERE code = %s", (code,))
    if existing:
        return jsonify({'error': f"Course with code '{code}' already exists."}), 409

    course_id = db.execute("""
        INSERT INTO courses (code, name, department, duration_years, total_semesters)
        VALUES (%s, %s, %s, %s, %s)
    """, (code, name, department, duration_years, total_semesters))

    return jsonify({'message': 'Course created successfully', 'course_id': course_id}), 201


@app.route('/api/semesters', methods=['GET'])
@token_required
def get_semesters(current_user):
    course_id = request.args.get('course_id')
    sql = """
        SELECT sem.*, c.code AS course_code, c.name AS course_name
        FROM semesters sem
        JOIN courses c ON sem.course_id = c.id
    """
    params = []
    if course_id:
        sql += " WHERE sem.course_id = %s"
        params.append(course_id)
    sql += " ORDER BY sem.course_id, sem.semester_number ASC"
    
    semesters = db.query_all(sql, params)
    return jsonify(semesters)


@app.route('/api/semesters', methods=['POST'])
@token_required
@role_required(['admin'])
def create_semester(current_user):
    data = request.get_json() or {}
    course_id = data.get('course_id')
    sem_num = data.get('semester_number')
    academic_year = data.get('academic_year')
    term = data.get('term', 'Odd')
    is_current = 1 if data.get('is_current') else 0

    if not course_id or not sem_num or not academic_year:
        return jsonify({'error': 'course_id, semester_number, and academic_year are required.'}), 400

    existing = db.query_one("""
        SELECT id FROM semesters WHERE course_id = %s AND semester_number = %s AND academic_year = %s
    """, (course_id, sem_num, academic_year))
    if existing:
        return jsonify({'error': 'This semester already exists for the given course and academic year.'}), 409

    sem_id = db.execute("""
        INSERT INTO semesters (course_id, semester_number, academic_year, term, is_current)
        VALUES (%s, %s, %s, %s, %s)
    """, (course_id, sem_num, academic_year, term, is_current))

    return jsonify({'message': 'Semester created successfully', 'semester_id': sem_id}), 201


@app.route('/api/subjects', methods=['GET'])
@token_required
def get_subjects(current_user):
    course_id = request.args.get('course_id')
    semester_number = request.args.get('semester_number')
    
    sql = """
        SELECT s.*, c.name AS course_name
        FROM subjects s
        JOIN courses c ON s.course_id = c.id
        WHERE 1=1
    """
    params = []
    if course_id:
        sql += " AND s.course_id = %s"
        params.append(course_id)
    if semester_number:
        sql += " AND s.semester_number = %s"
        params.append(semester_number)
    sql += " ORDER BY s.code ASC"

    subjects = db.query_all(sql, params)
    return jsonify(subjects)


@app.route('/api/subjects', methods=['POST'])
@token_required
@role_required(['admin'])
def create_subject(current_user):
    data = request.get_json() or {}
    code = data.get('code', '').strip().upper()
    name = data.get('name', '').strip()
    course_id = data.get('course_id')
    sem_num = data.get('semester_number')
    credits = int(data.get('credits', 4))
    subject_type = data.get('subject_type', 'Theory')
    max_internal = float(data.get('max_internal_marks', 40.0))
    max_external = float(data.get('max_external_marks', 60.0))

    if not code or not name or not course_id or not sem_num:
        return jsonify({'error': 'code, name, course_id, and semester_number are required.'}), 400

    existing = db.query_one("SELECT id FROM subjects WHERE code = %s", (code,))
    if existing:
        return jsonify({'error': f"Subject code '{code}' already exists."}), 409

    db_type = db.get_db_type()
    if db_type == 'mysql':
        sub_id = db.execute("""
            INSERT INTO subjects (code, name, course_id, semester_number, credits, subject_type, max_internal_marks, max_external_marks)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (code, name, course_id, sem_num, credits, subject_type, max_internal, max_external))
    else:
        total = max_internal + max_external
        sub_id = db.execute("""
            INSERT INTO subjects (code, name, course_id, semester_number, credits, subject_type, max_internal_marks, max_external_marks, total_marks)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (code, name, course_id, sem_num, credits, subject_type, max_internal, max_external, total))

    return jsonify({'message': 'Subject created successfully', 'subject_id': sub_id}), 201


@app.route('/api/faculty', methods=['GET'])
@token_required
def get_faculty_list(current_user):
    faculty = db.query_all("""
        SELECT fp.id AS faculty_id, fp.employee_id, fp.designation, fp.specialization,
               u.id AS user_id, u.full_name, u.email, u.phone, u.department
        FROM faculty_profiles fp
        JOIN users u ON fp.user_id = u.id
        ORDER BY u.full_name ASC
    """)
    return jsonify(faculty)


@app.route('/api/faculty/assignments', methods=['GET'])
@token_required
def get_faculty_assignments(current_user):
    faculty_id = request.args.get('faculty_id')
    semester_id = request.args.get('semester_id')

    # If role is faculty, default or restrict to their own ID
    if current_user.get('role') == 'faculty':
        faculty_id = current_user.get('faculty_id')

    sql = """
        SELECT fa.id, fa.faculty_id, fa.subject_id, fa.semester_id, fa.section,
               u.full_name AS faculty_name, fp.employee_id,
               sub.code AS subject_code, sub.name AS subject_name, sub.credits,
               sem.semester_number, sem.academic_year
        FROM faculty_assignments fa
        JOIN faculty_profiles fp ON fa.faculty_id = fp.id
        JOIN users u ON fp.user_id = u.id
        JOIN subjects sub ON fa.subject_id = sub.id
        JOIN semesters sem ON fa.semester_id = sem.id
        WHERE 1=1
    """
    params = []
    if faculty_id:
        sql += " AND fa.faculty_id = %s"
        params.append(faculty_id)
    if semester_id:
        sql += " AND fa.semester_id = %s"
        params.append(semester_id)
    sql += " ORDER BY sub.code ASC"

    assignments = db.query_all(sql, params)
    return jsonify(assignments)


@app.route('/api/faculty/assignments', methods=['POST'])
@token_required
@role_required(['admin'])
def assign_faculty_subject(current_user):
    data = request.get_json() or {}
    faculty_id = data.get('faculty_id')
    subject_id = data.get('subject_id')
    semester_id = data.get('semester_id')
    section = data.get('section', 'A')

    if not faculty_id or not subject_id or not semester_id:
        return jsonify({'error': 'faculty_id, subject_id, and semester_id are required.'}), 400

    existing = db.query_one("""
        SELECT id FROM faculty_assignments
        WHERE faculty_id = %s AND subject_id = %s AND semester_id = %s AND section = %s
    """, (faculty_id, subject_id, semester_id, section))
    if existing:
        return jsonify({'error': 'This faculty is already assigned to this subject/semester/section.'}), 409

    assign_id = db.execute("""
        INSERT INTO faculty_assignments (faculty_id, subject_id, semester_id, section)
        VALUES (%s, %s, %s, %s)
    """, (faculty_id, subject_id, semester_id, section))

    return jsonify({'message': 'Faculty assigned to subject successfully', 'id': assign_id}), 201


@app.route('/api/students', methods=['GET'])
@token_required
def get_students(current_user):
    # If student, restrict to self
    if current_user.get('role') == 'student':
        student_id = current_user.get('student_id')
        students = db.query_all("""
            SELECT s.id AS student_id, s.roll_number, s.admission_year, s.batch, s.section,
                   u.id AS user_id, u.full_name, u.email, u.phone, u.department,
                   c.name AS course_name, c.code AS course_code,
                   sem.semester_number, sem.academic_year
            FROM students s
            JOIN users u ON s.user_id = u.id
            JOIN courses c ON s.course_id = c.id
            LEFT JOIN semesters sem ON s.current_semester_id = sem.id
            WHERE s.id = %s
        """, (student_id,))
        return jsonify(students)

    course_id = request.args.get('course_id')
    semester_id = request.args.get('semester_id')
    subject_id = request.args.get('subject_id')

    sql = """
        SELECT s.id AS student_id, s.roll_number, s.admission_year, s.batch, s.section,
               u.id AS user_id, u.full_name, u.email, u.phone, u.department,
               c.name AS course_name, c.code AS course_code,
               sem.semester_number, sem.academic_year
        FROM students s
        JOIN users u ON s.user_id = u.id
        JOIN courses c ON s.course_id = c.id
        LEFT JOIN semesters sem ON s.current_semester_id = sem.id
        WHERE 1=1
    """
    params = []
    if course_id:
        sql += " AND s.course_id = %s"
        params.append(course_id)
    if semester_id:
        sql += " AND s.current_semester_id = %s"
        params.append(semester_id)
    if subject_id:
        sql += " AND s.id IN (SELECT student_id FROM student_enrollments WHERE subject_id = %s)"
        params.append(subject_id)
    sql += " ORDER BY s.roll_number ASC"

    students = db.query_all(sql, params)
    return jsonify(students)


# -----------------------------------------------------------------------------
# Module 3: Marks Management
# -----------------------------------------------------------------------------
@app.route('/api/marks', methods=['GET'])
@token_required
def get_marks(current_user):
    student_id = request.args.get('student_id')
    subject_id = request.args.get('subject_id')
    semester_id = request.args.get('semester_id')

    # Security check: Student can only view their own marks
    if current_user.get('role') == 'student':
        student_id = current_user.get('student_id')

    # Security check: Faculty can only view marks for their assigned subjects
    if current_user.get('role') == 'faculty' and not request.args.get('override_faculty'):
        faculty_id = current_user.get('faculty_id')
        assigned_subs = db.query_all("SELECT subject_id FROM faculty_assignments WHERE faculty_id = %s", (faculty_id,))
        allowed_ids = [s['subject_id'] for s in assigned_subs]
        if subject_id and int(subject_id) not in allowed_ids:
            return jsonify({'error': 'Forbidden. You are not assigned to teach this subject.'}), 403

    sql = """
        SELECT m.id, m.student_id, m.subject_id, m.semester_id, m.assessment_type,
               m.max_marks, m.marks_obtained, m.remarks, m.updated_at,
               s.roll_number, u.full_name AS student_name,
               sub.code AS subject_code, sub.name AS subject_name,
               sem.semester_number
        FROM marks m
        JOIN students s ON m.student_id = s.id
        JOIN users u ON s.user_id = u.id
        JOIN subjects sub ON m.subject_id = sub.id
        JOIN semesters sem ON m.semester_id = sem.id
        WHERE 1=1
    """
    params = []
    if student_id:
        sql += " AND m.student_id = %s"
        params.append(student_id)
    if subject_id:
        sql += " AND m.subject_id = %s"
        params.append(subject_id)
    if semester_id:
        sql += " AND m.semester_id = %s"
        params.append(semester_id)
    sql += " ORDER BY m.subject_id, s.roll_number ASC"

    records = db.query_all(sql, params)
    return jsonify(records)


@app.route('/api/marks', methods=['POST'])
@token_required
@role_required(['admin', 'faculty'])
def save_marks(current_user):
    payload = request.get_json() or {}
    items = payload if isinstance(payload, list) else [payload]

    if not items:
        return jsonify({'error': 'No marks records provided.'}), 400

    # Authorization verification for faculty
    if current_user.get('role') == 'faculty':
        faculty_id = current_user.get('faculty_id')
        assigned_subs = db.query_all("SELECT subject_id FROM faculty_assignments WHERE faculty_id = %s", (faculty_id,))
        allowed_ids = {s['subject_id'] for s in assigned_subs}
        for item in items:
            sub_id = int(item.get('subject_id', 0))
            if sub_id not in allowed_ids:
                return jsonify({'error': f"Forbidden. You are not authorized to grade subject ID {sub_id}."}), 403

    # Validate score bounds (marks_obtained <= max_marks and >= 0)
    for idx, item in enumerate(items):
        max_m = float(item.get('max_marks', 0))
        obt_m = float(item.get('marks_obtained', 0))
        if obt_m < 0 or obt_m > max_m or max_m <= 0:
            return jsonify({
                'error': f"Validation Error on record #{idx + 1}: Marks obtained ({obt_m}) must be between 0 and maximum marks ({max_m})."
            }), 400

    saved_count = 0
    with db.transaction() as (cursor, db_type):
        param = "%s" if db_type == 'mysql' else "?"
        for item in items:
            sid = item.get('student_id')
            sub_id = item.get('subject_id')
            sem_id = item.get('semester_id')
            atype = item.get('assessment_type')
            max_m = float(item.get('max_marks'))
            obt_m = float(item.get('marks_obtained'))
            remarks = item.get('remarks', '')

            if db_type == 'mysql':
                query = f"""
                    INSERT INTO marks (student_id, subject_id, semester_id, assessment_type, max_marks, marks_obtained, entered_by, remarks)
                    VALUES ({param}, {param}, {param}, {param}, {param}, {param}, {param}, {param})
                    ON DUPLICATE KEY UPDATE 
                        max_marks = VALUES(max_marks),
                        marks_obtained = VALUES(marks_obtained),
                        entered_by = VALUES(entered_by),
                        remarks = VALUES(remarks)
                """
            else:
                query = f"""
                    INSERT INTO marks (student_id, subject_id, semester_id, assessment_type, max_marks, marks_obtained, entered_by, remarks)
                    VALUES ({param}, {param}, {param}, {param}, {param}, {param}, {param}, {param})
                    ON CONFLICT(student_id, subject_id, semester_id, assessment_type) DO UPDATE SET
                        max_marks = excluded.max_marks,
                        marks_obtained = excluded.marks_obtained,
                        entered_by = excluded.entered_by,
                        remarks = excluded.remarks
                """
            cursor.execute(query, (sid, sub_id, sem_id, atype, max_m, obt_m, current_user['id'], remarks))
            saved_count += 1

    return jsonify({'message': f"Successfully saved {saved_count} marks record(s)."}), 200


# -----------------------------------------------------------------------------
# Module 4: Attendance Management
# -----------------------------------------------------------------------------
@app.route('/api/attendance', methods=['GET'])
@token_required
def get_attendance(current_user):
    student_id = request.args.get('student_id')
    subject_id = request.args.get('subject_id')
    att_date = request.args.get('date')

    # Security check: Student can only view their own attendance
    if current_user.get('role') == 'student':
        student_id = current_user.get('student_id')

    sql = """
        SELECT a.id, a.student_id, a.subject_id, a.date, a.session_name, a.status, a.notes,
               s.roll_number, u.full_name AS student_name,
               sub.code AS subject_code, sub.name AS subject_name
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        JOIN users u ON s.user_id = u.id
        JOIN subjects sub ON a.subject_id = sub.id
        WHERE 1=1
    """
    params = []
    if student_id:
        sql += " AND a.student_id = %s"
        params.append(student_id)
    if subject_id:
        sql += " AND a.subject_id = %s"
        params.append(subject_id)
    if att_date:
        sql += " AND a.date = %s"
        params.append(att_date)
    sql += " ORDER BY a.date DESC, s.roll_number ASC"

    records = db.query_all(sql, params)
    return jsonify(records)


@app.route('/api/attendance/summary', methods=['GET'])
@token_required
def get_attendance_summary(current_user):
    student_id = request.args.get('student_id')
    subject_id = request.args.get('subject_id')

    if current_user.get('role') == 'student':
        student_id = current_user.get('student_id')

    sql = "SELECT * FROM v_student_attendance_summary WHERE 1=1"
    params = []
    if student_id:
        sql += " AND student_id = %s"
        params.append(student_id)
    if subject_id:
        sql += " AND subject_id = %s"
        params.append(subject_id)
    sql += " ORDER BY roll_number ASC, subject_code ASC"

    summary = db.query_all(sql, params)
    return jsonify(summary)


@app.route('/api/attendance/batch', methods=['POST'])
@token_required
@role_required(['admin', 'faculty'])
def record_batch_attendance(current_user):
    payload = request.get_json() or {}
    subject_id = payload.get('subject_id')
    session_date = payload.get('date', date.today().isoformat())
    session_name = payload.get('session_name', 'Regular Lecture')
    attendance_list = payload.get('records', [])

    if not subject_id or not attendance_list:
        return jsonify({'error': 'subject_id and records array are required.'}), 400

    # Faculty assignment verification
    if current_user.get('role') == 'faculty':
        faculty_id = current_user.get('faculty_id')
        assigned = db.query_one("""
            SELECT id FROM faculty_assignments WHERE faculty_id = %s AND subject_id = %s
        """, (faculty_id, subject_id))
        if not assigned:
            return jsonify({'error': 'Forbidden. You are not assigned to record attendance for this subject.'}), 403

    saved_count = 0
    with db.transaction() as (cursor, db_type):
        param = "%s" if db_type == 'mysql' else "?"
        for rec in attendance_list:
            sid = rec.get('student_id')
            status = rec.get('status', 'Present')
            notes = rec.get('notes', '')

            if db_type == 'mysql':
                query = f"""
                    INSERT INTO attendance (student_id, subject_id, date, session_name, status, recorded_by, notes)
                    VALUES ({param}, {param}, {param}, {param}, {param}, {param}, {param})
                    ON DUPLICATE KEY UPDATE 
                        status = VALUES(status),
                        recorded_by = VALUES(recorded_by),
                        notes = VALUES(notes)
                """
            else:
                query = f"""
                    INSERT INTO attendance (student_id, subject_id, date, session_name, status, recorded_by, notes)
                    VALUES ({param}, {param}, {param}, {param}, {param}, {param}, {param})
                    ON CONFLICT(student_id, subject_id, date, session_name) DO UPDATE SET
                        status = excluded.status,
                        recorded_by = excluded.recorded_by,
                        notes = excluded.notes
                """
            cursor.execute(query, (sid, subject_id, session_date, session_name, status, current_user['id'], notes))
            saved_count += 1

    return jsonify({'message': f"Recorded attendance for {saved_count} students successfully."}), 200


# -----------------------------------------------------------------------------
# Module 5: Performance Analytics (SGPA / CGPA Engine)
# -----------------------------------------------------------------------------
@app.route('/api/analytics/student/<int:student_id>', methods=['GET'])
@token_required
def get_student_performance_analytics(current_user, student_id):
    # Student role can only query self
    if current_user.get('role') == 'student' and current_user.get('student_id') != student_id:
        return jsonify({'error': 'Forbidden. You can only view your own performance analytics.'}), 403

    # Student details
    student = db.query_one("""
        SELECT s.id, s.roll_number, s.admission_year, s.batch, s.section,
               u.full_name, u.email, u.phone,
               c.name AS course_name, c.code AS course_code,
               sem.semester_number, sem.academic_year
        FROM students s
        JOIN users u ON s.user_id = u.id
        JOIN courses c ON s.course_id = c.id
        LEFT JOIN semesters sem ON s.current_semester_id = sem.id
        WHERE s.id = %s
    """, (student_id,))
    if not student:
        return jsonify({'error': 'Student not found.'}), 404

    # Subject-wise marks summary (from View v_student_subject_marks)
    subjects_summary = db.query_all("""
        SELECT * FROM v_student_subject_marks WHERE student_id = %s ORDER BY semester_number, subject_code
    """, (student_id,))

    # Semester summaries (from View v_student_semester_summary)
    semester_summaries = db.query_all("""
        SELECT * FROM v_student_semester_summary WHERE student_id = %s ORDER BY semester_number ASC
    """, (student_id,))

    # Cumulative CGPA calculation
    total_weighted_points = sum((row['calculated_sgpa'] or 0.0) * (row['total_credits'] or 0) for row in semester_summaries)
    total_credits = sum(row['total_credits'] or 0 for row in semester_summaries)
    calculated_cgpa = round(total_weighted_points / total_credits, 2) if total_credits > 0 else 0.00

    # Attendance overall & per subject
    attendance_summary = db.query_all("""
        SELECT * FROM v_student_attendance_summary WHERE student_id = %s ORDER BY subject_code
    """, (student_id,))
    
    total_sessions = sum(row['total_sessions'] for row in attendance_summary)
    attended_sessions = sum(row['attended_sessions'] for row in attendance_summary)
    overall_attendance = round((attended_sessions * 100.0) / total_sessions, 2) if total_sessions > 0 else 0.00

    # Risk analysis against criteria
    rules = db.query_all("SELECT * FROM at_risk_criteria WHERE is_active = 1")
    risk_flags = []
    
    att_rule = next((r for r in rules if r['criterion_type'] == 'ATTENDANCE'), None)
    if att_rule and overall_attendance < float(att_rule['threshold_value']):
        risk_flags.append({
            'rule': att_rule['rule_name'],
            'type': 'ATTENDANCE',
            'severity': att_rule['severity'],
            'message': f"Overall attendance is {overall_attendance}%, which is below the required threshold of {att_rule['threshold_value']}%."
        })

    marks_rule = next((r for r in rules if r['criterion_type'] == 'INTERNAL_MARKS'), None)
    low_mark_subjects = [s for s in subjects_summary if marks_rule and float(s['percentage'] or 0) < float(marks_rule['threshold_value'])]
    if low_mark_subjects:
        risk_flags.append({
            'rule': marks_rule['rule_name'] if marks_rule else 'Low Internal Marks',
            'type': 'INTERNAL_MARKS',
            'severity': 'High',
            'message': f"Scoring below passing cutoff in {len(low_mark_subjects)} subject(s): {', '.join(s['subject_code'] for s in low_mark_subjects)}."
        })

    # Interventions recorded
    interventions = db.query_all("""
        SELECT i.*, u.full_name AS faculty_name, sub.name AS subject_name
        FROM interventions i
        JOIN faculty_profiles fp ON i.faculty_id = fp.id
        JOIN users u ON fp.user_id = u.id
        LEFT JOIN subjects sub ON i.subject_id = sub.id
        WHERE i.student_id = %s
        ORDER BY i.action_date DESC
    """, (student_id,))

    return jsonify({
        'student': student,
        'calculated_cgpa': calculated_cgpa,
        'total_credits_earned': total_credits,
        'overall_attendance_pct': overall_attendance,
        'semester_summaries': semester_summaries,
        'subjects_summary': subjects_summary,
        'attendance_summary': attendance_summary,
        'risk_flags': risk_flags,
        'interventions': interventions
    })


@app.route('/api/analytics/college-overview', methods=['GET'])
@token_required
@role_required(['admin', 'faculty'])
def get_college_overview(current_user):
    total_students = db.query_one("SELECT COUNT(*) AS count FROM students")['count']
    total_faculty = db.query_one("SELECT COUNT(*) AS count FROM faculty_profiles")['count']
    total_subjects = db.query_one("SELECT COUNT(*) AS count FROM subjects")['count']
    total_courses = db.query_one("SELECT COUNT(*) AS count FROM courses")['count']

    # Average attendance
    avg_att_row = db.query_one("""
        SELECT ROUND(AVG(attendance_percentage), 2) AS avg_att FROM v_student_attendance_summary
    """)
    college_avg_attendance = avg_att_row['avg_att'] if avg_att_row and avg_att_row['avg_att'] else 0.0

    # Semester performance stats
    sgpa_stats = db.query_one("""
        SELECT ROUND(AVG(calculated_sgpa), 2) AS avg_sgpa,
               MAX(calculated_sgpa) AS max_sgpa,
               MIN(calculated_sgpa) AS min_sgpa
        FROM v_student_semester_summary
    """)

    # At-risk counts
    at_risk_list = get_at_risk_list_internal()
    at_risk_count = len(at_risk_list)

    # Grade distribution
    grades_dist = db.query_all("""
        SELECT estimated_grade, COUNT(*) AS count
        FROM v_student_subject_marks
        GROUP BY estimated_grade
        ORDER BY count DESC
    """)

    return jsonify({
        'total_students': total_students,
        'total_faculty': total_faculty,
        'total_courses': total_courses,
        'total_subjects': total_subjects,
        'average_attendance': college_avg_attendance,
        'sgpa_stats': sgpa_stats or {'avg_sgpa': 0.0, 'max_sgpa': 0.0, 'min_sgpa': 0.0},
        'at_risk_count': at_risk_count,
        'at_risk_percentage': round((at_risk_count * 100.0) / max(total_students, 1), 1),
        'grade_distribution': grades_dist
    })


@app.route('/api/analytics/grading-scale', methods=['GET'])
@token_required
def get_grading_scale(current_user):
    scale = db.query_all("SELECT * FROM grading_scale ORDER BY min_percentage DESC")
    return jsonify(scale)


# -----------------------------------------------------------------------------
# Module 6: At-Risk Detection Engine
# -----------------------------------------------------------------------------
def get_at_risk_list_internal(course_id=None, semester_id=None):
    """Evaluates multi-factor academic and attendance criteria to detect students needing support."""
    rules = db.query_all("SELECT * FROM at_risk_criteria WHERE is_active = 1")
    att_threshold = 75.0
    marks_threshold = 40.0
    sgpa_threshold = 5.0

    for r in rules:
        if r['criterion_type'] == 'ATTENDANCE':
            att_threshold = float(r['threshold_value'])
        elif r['criterion_type'] == 'INTERNAL_MARKS':
            marks_threshold = float(r['threshold_value'])
        elif r['criterion_type'] == 'SGPA':
            sgpa_threshold = float(r['threshold_value'])

    # Join students, courses, semesters, attendance summary, and marks summary
    students = db.query_all("""
        SELECT s.id AS student_id, s.roll_number, s.batch, s.section,
               u.full_name, u.email, u.phone,
               c.name AS course_name, c.id AS course_id,
               sem.id AS semester_id, sem.semester_number, sem.academic_year
        FROM students s
        JOIN users u ON s.user_id = u.id
        JOIN courses c ON s.course_id = c.id
        LEFT JOIN semesters sem ON s.current_semester_id = sem.id
        WHERE 1=1
    """)

    results = []
    for st in students:
        if course_id and str(st['course_id']) != str(course_id):
            continue
        if semester_id and str(st['semester_id']) != str(semester_id):
            continue

        sid = st['student_id']

        # Attendance calculation
        att_rows = db.query_all("SELECT * FROM v_student_attendance_summary WHERE student_id = %s", (sid,))
        total_s = sum(r['total_sessions'] for r in att_rows)
        attended_s = sum(r['attended_sessions'] for r in att_rows)
        overall_att = round((attended_s * 100.0) / total_s, 2) if total_s > 0 else 0.0

        # Semester Marks & SGPA
        marks_rows = db.query_all("SELECT * FROM v_student_subject_marks WHERE student_id = %s", (sid,))
        sem_rows = db.query_all("SELECT * FROM v_student_semester_summary WHERE student_id = %s", (sid,))
        current_sgpa = sem_rows[-1]['calculated_sgpa'] if sem_rows else 0.0

        low_mark_subjects = [m for m in marks_rows if float(m['percentage'] or 0) < marks_threshold]

        # Flags evaluation
        flags = []
        severity = 'None'

        if overall_att < att_threshold:
            flags.append({
                'criterion': 'Attendance',
                'value': f"{overall_att}%",
                'threshold': f"< {att_threshold}%",
                'severity': 'High' if overall_att < 65.0 else 'Medium'
            })

        if low_mark_subjects:
            flags.append({
                'criterion': 'Assessment Marks',
                'value': f"{len(low_mark_subjects)} subject(s) below passing mark",
                'threshold': f"< {marks_threshold}%",
                'severity': 'High'
            })

        if current_sgpa < sgpa_threshold and current_sgpa > 0:
            flags.append({
                'criterion': 'Semester SGPA',
                'value': f"{current_sgpa}",
                'threshold': f"< {sgpa_threshold}",
                'severity': 'Medium'
            })

        if flags:
            has_high = any(f['severity'] == 'High' for f in flags)
            overall_severity = 'Critical' if len(flags) > 1 and has_high else ('High' if has_high else 'Medium')
            
            # Active interventions count
            active_intvs = db.query_all("""
                SELECT COUNT(*) AS cnt FROM interventions WHERE student_id = %s AND status IN ('Scheduled', 'In Progress')
            """, (sid,))
            intv_count = active_intvs[0]['cnt'] if active_intvs else 0

            results.append({
                'student_id': sid,
                'roll_number': st['roll_number'],
                'student_name': st['full_name'],
                'email': st['email'],
                'course_name': st['course_name'],
                'semester_number': st['semester_number'],
                'overall_attendance': overall_att,
                'current_sgpa': current_sgpa,
                'failed_subjects_count': len(low_mark_subjects),
                'risk_flags': flags,
                'severity': overall_severity,
                'active_interventions_count': intv_count
            })

    # Sort critical risk first, then lowest attendance
    results.sort(key=lambda x: (0 if x['severity'] == 'Critical' else (1 if x['severity'] == 'High' else 2), x['overall_attendance']))
    return results


@app.route('/api/at-risk/students', methods=['GET'])
@token_required
@role_required(['admin', 'faculty'])
def get_at_risk_students(current_user):
    course_id = request.args.get('course_id')
    semester_id = request.args.get('semester_id')
    results = get_at_risk_list_internal(course_id, semester_id)
    return jsonify(results)


@app.route('/api/at-risk/rules', methods=['GET'])
@token_required
def get_at_risk_rules(current_user):
    rules = db.query_all("SELECT * FROM at_risk_criteria ORDER BY id ASC")
    return jsonify(rules)


@app.route('/api/at-risk/rules/<int:rule_id>', methods=['PUT'])
@token_required
@role_required(['admin'])
def update_at_risk_rule(current_user, rule_id):
    data = request.get_json() or {}
    threshold = float(data.get('threshold_value', 75.0))
    severity = data.get('severity', 'Medium')
    is_active = 1 if data.get('is_active', True) else 0

    db.execute("""
        UPDATE at_risk_criteria
        SET threshold_value = %s, severity = %s, is_active = %s
        WHERE id = %s
    """, (threshold, severity, is_active, rule_id))

    return jsonify({'message': 'At-risk rule updated successfully.'})


# -----------------------------------------------------------------------------
# Module 7: Faculty Interventions
# -----------------------------------------------------------------------------
@app.route('/api/interventions', methods=['GET'])
@token_required
def get_interventions(current_user):
    student_id = request.args.get('student_id')
    faculty_id = request.args.get('faculty_id')
    status = request.args.get('status')

    # Student can only view their own
    if current_user.get('role') == 'student':
        student_id = current_user.get('student_id')

    sql = """
        SELECT i.*, 
               s.roll_number, u_std.full_name AS student_name,
               u_fac.full_name AS faculty_name, fp.employee_id,
               sub.code AS subject_code, sub.name AS subject_name
        FROM interventions i
        JOIN students s ON i.student_id = s.id
        JOIN users u_std ON s.user_id = u_std.id
        JOIN faculty_profiles fp ON i.faculty_id = fp.id
        JOIN users u_fac ON fp.user_id = u_fac.id
        LEFT JOIN subjects sub ON i.subject_id = sub.id
        WHERE 1=1
    """
    params = []
    if student_id:
        sql += " AND i.student_id = %s"
        params.append(student_id)
    if faculty_id:
        sql += " AND i.faculty_id = %s"
        params.append(faculty_id)
    if status:
        sql += " AND i.status = %s"
        params.append(status)
    sql += " ORDER BY i.action_date DESC"

    records = db.query_all(sql, params)
    return jsonify(records)


@app.route('/api/interventions', methods=['POST'])
@token_required
@role_required(['admin', 'faculty'])
def create_intervention(current_user):
    data = request.get_json() or {}
    student_id = data.get('student_id')
    faculty_id = current_user.get('faculty_id') or data.get('faculty_id')
    subject_id = data.get('subject_id')
    risk_reason = data.get('risk_reason', '').strip()
    action_type = data.get('action_type', 'One-on-One Counseling')
    action_date = data.get('action_date', date.today().isoformat())
    status = data.get('status', 'Scheduled')
    notes = data.get('notes', '').strip()
    outcome_remarks = data.get('outcome_remarks', '').strip()

    if not student_id or not faculty_id or not risk_reason or not action_type:
        return jsonify({'error': 'student_id, risk_reason, and action_type are required.'}), 400

    intv_id = db.execute("""
        INSERT INTO interventions (student_id, faculty_id, subject_id, risk_reason, action_type, action_date, status, notes, outcome_remarks)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (student_id, faculty_id, subject_id, risk_reason, action_type, action_date, status, notes, outcome_remarks))

    return jsonify({'message': 'Intervention recorded successfully.', 'intervention_id': intv_id}), 201


@app.route('/api/interventions/<int:intv_id>', methods=['PUT'])
@token_required
@role_required(['admin', 'faculty'])
def update_intervention(current_user, intv_id):
    data = request.get_json() or {}
    status = data.get('status')
    notes = data.get('notes')
    outcome_remarks = data.get('outcome_remarks')

    db.execute("""
        UPDATE interventions
        SET status = COALESCE(%s, status),
            notes = COALESCE(%s, notes),
            outcome_remarks = COALESCE(%s, outcome_remarks),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
    """, (status, notes, outcome_remarks, intv_id))

    return jsonify({'message': 'Intervention updated successfully.'})


# -----------------------------------------------------------------------------
# Module 8: Reports & CSV Export
# -----------------------------------------------------------------------------
@app.route('/api/reports/semester-performance', methods=['GET'])
@token_required
@role_required(['admin', 'faculty'])
def report_semester_performance(current_user):
    semester_id = request.args.get('semester_id')
    export_format = request.args.get('format', 'json').lower()

    sql = """
        SELECT v.*, c.name AS course_name
        FROM v_student_semester_summary v
        JOIN students s ON v.student_id = s.id
        JOIN courses c ON s.course_id = c.id
        WHERE 1=1
    """
    params = []
    if semester_id:
        sql += " AND v.semester_id = %s"
        params.append(semester_id)
    sql += " ORDER BY v.semester_number, v.calculated_sgpa DESC"

    records = db.query_all(sql, params)

    if export_format == 'csv':
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Roll Number', 'Student Name', 'Course', 'Semester', 'Subjects', 'Credits', 'Max Marks', 'Marks Obtained', 'Percentage', 'Calculated SGPA'])
        for r in records:
            writer.writerow([
                r['roll_number'], r['student_name'], r.get('course_name', 'B.Tech CSE'),
                r['semester_number'], r['total_subjects'], r['total_credits'],
                r['semester_max_marks'], r['semester_marks_obtained'],
                r['overall_percentage'], r['calculated_sgpa']
            ])
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-disposition": "attachment; filename=semester_performance_report.csv"}
        )

    return jsonify(records)


@app.route('/api/reports/attendance-defaulters', methods=['GET'])
@token_required
@role_required(['admin', 'faculty'])
def report_attendance_defaulters(current_user):
    threshold = float(request.args.get('threshold', 75.0))
    subject_id = request.args.get('subject_id')
    export_format = request.args.get('format', 'json').lower()

    sql = """
        SELECT * FROM v_student_attendance_summary
        WHERE attendance_percentage < %s
    """
    params = [threshold]
    if subject_id:
        sql += " AND subject_id = %s"
        params.append(subject_id)
    sql += " ORDER BY attendance_percentage ASC"

    records = db.query_all(sql, params)

    if export_format == 'csv':
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Roll Number', 'Student Name', 'Subject Code', 'Subject Name', 'Total Sessions', 'Attended', 'Absent', 'Attendance Percentage'])
        for r in records:
            writer.writerow([
                r['roll_number'], r['student_name'], r['subject_code'], r['subject_name'],
                r['total_sessions'], r['attended_sessions'], r['absent_sessions'], r['attendance_percentage']
            ])
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-disposition": "attachment; filename=attendance_defaulters_report.csv"}
        )

    return jsonify(records)


@app.route('/api/reports/audit-logs', methods=['GET'])
@token_required
@role_required(['admin'])
def get_audit_logs(current_user):
    logs = db.query_all("""
        SELECT a.*, u.username, u.full_name
        FROM audit_logs a
        LEFT JOIN users u ON a.changed_by = u.id
        ORDER BY a.timestamp DESC
        LIMIT 50
    """)
    return jsonify(logs)


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"Starting SPAMS API on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
