"""
Database Initialization & Seeding Script
========================================
Supports MySQL (primary) with automatic fallback to SQLite for local development.
Creates all tables, views, stored procedures, triggers, indexes, and seeds realistic
B.Tech CSE demo records.
"""

import os
import sys
import json
from datetime import datetime, date, timedelta
from werkzeug.security import generate_password_hash
# Load environment configuration natively
env_file = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_file):
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'password')
DB_NAME = os.getenv('DB_NAME', 'spams_db')
ENABLE_SQLITE_FALLBACK = os.getenv('ENABLE_SQLITE_FALLBACK', 'true').lower() == 'true'
SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), os.getenv('SQLITE_DB_PATH', 'spams.db'))


def get_db_connection():
    """Tries to connect to MySQL; if unavailable and fallback enabled, returns SQLite."""
    try:
        import pymysql
        conn = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        return 'mysql', conn
    except Exception as e:
        if ENABLE_SQLITE_FALLBACK:
            import sqlite3
            print(f"[INFO] MySQL connection unavailable ({e}). Using SQLite fallback at '{SQLITE_DB_PATH}'.")
            conn = sqlite3.connect(SQLITE_DB_PATH)
            conn.row_factory = sqlite3.Row
            return 'sqlite', conn
        else:
            raise e


def init_mysql(conn):
    """Creates database, tables, views, procedures, and triggers for MySQL."""
    cursor = conn.cursor()
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME};")
    cursor.execute(f"USE {DB_NAME};")
    
    schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
    with open(schema_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    # Split and execute statements (handling DELIMITER //)
    blocks = sql_content.split('DELIMITER //')
    # Standard statements before first procedure
    initial_statements = blocks[0].split(';')
    for stmt in initial_statements:
        clean = stmt.strip()
        if clean and not clean.startswith('--'):
            cursor.execute(clean)
    
    # Process blocks with // delimiter (procedures/triggers)
    for block in blocks[1:]:
        sub_blocks = block.split('DELIMITER ;')
        proc_or_trigger = sub_blocks[0].replace('//', '').strip()
        if proc_or_trigger:
            cursor.execute(proc_or_trigger)
        if len(sub_blocks) > 1:
            trailing = sub_blocks[1].split(';')
            for stmt in trailing:
                clean = stmt.strip()
                if clean and not clean.startswith('--'):
                    cursor.execute(clean)
    
    conn.commit()
    print("[SUCCESS] MySQL schema, views, procedures, and triggers initialized successfully.")


def init_sqlite(conn):
    """Initializes SQLite schema compatible with application models."""
    cursor = conn.cursor()
    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT CHECK(role IN ('admin', 'faculty', 'student')) NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        department TEXT DEFAULT 'Computer Science & Engineering',
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        duration_years INTEGER NOT NULL DEFAULT 4,
        total_semesters INTEGER NOT NULL DEFAULT 8,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS semesters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        semester_number INTEGER NOT NULL,
        academic_year TEXT NOT NULL,
        term TEXT CHECK(term IN ('Odd', 'Even', 'Summer')) NOT NULL,
        is_current INTEGER DEFAULT 0,
        start_date DATE,
        end_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (course_id, semester_number, academic_year)
    );

    CREATE TABLE IF NOT EXISTS faculty_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        employee_id TEXT NOT NULL UNIQUE,
        designation TEXT NOT NULL DEFAULT 'Assistant Professor',
        specialization TEXT,
        qualification TEXT DEFAULT 'M.Tech / Ph.D',
        joining_date DATE
    );

    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        roll_number TEXT NOT NULL UNIQUE,
        admission_year INTEGER NOT NULL,
        course_id INTEGER NOT NULL REFERENCES courses(id),
        current_semester_id INTEGER REFERENCES semesters(id) ON DELETE SET NULL,
        batch TEXT,
        section TEXT DEFAULT 'A',
        parent_email TEXT,
        parent_phone TEXT
    );

    CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        semester_number INTEGER NOT NULL,
        credits INTEGER NOT NULL DEFAULT 4,
        subject_type TEXT DEFAULT 'Theory',
        max_internal_marks REAL DEFAULT 40.00,
        max_external_marks REAL DEFAULT 60.00,
        total_marks REAL DEFAULT 100.00
    );

    CREATE TABLE IF NOT EXISTS faculty_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        faculty_id INTEGER NOT NULL REFERENCES faculty_profiles(id) ON DELETE CASCADE,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
        section TEXT DEFAULT 'A',
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (faculty_id, subject_id, semester_id, section)
    );

    CREATE TABLE IF NOT EXISTS student_enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'Enrolled',
        enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (student_id, semester_id, subject_id)
    );

    CREATE TABLE IF NOT EXISTS marks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
        assessment_type TEXT NOT NULL,
        max_marks REAL NOT NULL,
        marks_obtained REAL NOT NULL,
        entered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (student_id, subject_id, semester_id, assessment_type)
    );

    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        session_name TEXT DEFAULT 'Regular Lecture',
        status TEXT DEFAULT 'Present',
        recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (student_id, subject_id, date, session_name)
    );

    CREATE TABLE IF NOT EXISTS grading_scale (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        letter_grade TEXT NOT NULL UNIQUE,
        min_percentage REAL NOT NULL,
        max_percentage REAL NOT NULL,
        grade_point REAL NOT NULL,
        description TEXT
    );

    CREATE TABLE IF NOT EXISTS at_risk_criteria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_name TEXT NOT NULL UNIQUE,
        criterion_type TEXT NOT NULL,
        threshold_value REAL NOT NULL,
        operator TEXT DEFAULT '<',
        severity TEXT DEFAULT 'Medium',
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS interventions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        faculty_id INTEGER NOT NULL REFERENCES faculty_profiles(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        risk_reason TEXT NOT NULL,
        action_type TEXT NOT NULL,
        action_date DATE NOT NULL,
        status TEXT DEFAULT 'Scheduled',
        notes TEXT,
        outcome_remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        action_type TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        changed_by INTEGER,
        old_values TEXT,
        new_values TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Views
    CREATE VIEW IF NOT EXISTS v_student_attendance_summary AS
    SELECT 
        a.student_id,
        s.roll_number,
        u.full_name AS student_name,
        sub.id AS subject_id,
        sub.code AS subject_code,
        sub.name AS subject_name,
        COUNT(a.id) AS total_sessions,
        SUM(CASE WHEN a.status IN ('Present', 'Excused') THEN 1 ELSE 0 END) AS attended_sessions,
        SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent_sessions,
        SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) AS late_sessions,
        ROUND((SUM(CASE WHEN a.status IN ('Present', 'Excused') THEN 1.0 ELSE 0.0 END) * 100.0) / COUNT(a.id), 2) AS attendance_percentage
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN subjects sub ON a.subject_id = sub.id
    GROUP BY a.student_id, s.roll_number, u.full_name, sub.id, sub.code, sub.name;

    CREATE VIEW IF NOT EXISTS v_student_subject_marks AS
    SELECT 
        m.student_id,
        s.roll_number,
        u.full_name AS student_name,
        m.semester_id,
        sem.semester_number,
        m.subject_id,
        sub.code AS subject_code,
        sub.name AS subject_name,
        sub.credits,
        SUM(m.max_marks) AS total_max_marks,
        SUM(m.marks_obtained) AS total_marks_obtained,
        ROUND((SUM(m.marks_obtained) * 100.0) / SUM(m.max_marks), 2) AS percentage,
        CASE 
            WHEN (SUM(m.marks_obtained) * 100.0) / SUM(m.max_marks) >= 90 THEN 'O'
            WHEN (SUM(m.marks_obtained) * 100.0) / SUM(m.max_marks) >= 80 THEN 'A+'
            WHEN (SUM(m.marks_obtained) * 100.0) / SUM(m.max_marks) >= 70 THEN 'A'
            WHEN (SUM(m.marks_obtained) * 100.0) / SUM(m.max_marks) >= 60 THEN 'B+'
            WHEN (SUM(m.marks_obtained) * 100.0) / SUM(m.max_marks) >= 50 THEN 'B'
            WHEN (SUM(m.marks_obtained) * 100.0) / SUM(m.max_marks) >= 40 THEN 'P'
            ELSE 'F'
        END AS estimated_grade,
        CASE 
            WHEN (SUM(m.marks_obtained) * 100.0) / SUM(m.max_marks) >= 90 THEN 10.0
            WHEN (SUM(m.marks_obtained) * 100.0) / SUM(m.max_marks) >= 80 THEN 9.0
            WHEN (SUM(m.marks_obtained) * 100.0) / SUM(m.max_marks) >= 70 THEN 8.0
            WHEN (SUM(m.marks_obtained) * 100.0) / SUM(m.max_marks) >= 60 THEN 7.0
            WHEN (SUM(m.marks_obtained) * 100.0) / SUM(m.max_marks) >= 50 THEN 6.0
            WHEN (SUM(m.marks_obtained) * 100.0) / SUM(m.max_marks) >= 40 THEN 5.0
            ELSE 0.0
        END AS grade_point
    FROM marks m
    JOIN students s ON m.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN semesters sem ON m.semester_id = sem.id
    JOIN subjects sub ON m.subject_id = sub.id
    GROUP BY m.student_id, s.roll_number, u.full_name, m.semester_id, sem.semester_number, m.subject_id, sub.code, sub.name, sub.credits;

    CREATE VIEW IF NOT EXISTS v_student_semester_summary AS
    SELECT 
        vsm.student_id,
        vsm.roll_number,
        vsm.student_name,
        vsm.semester_id,
        vsm.semester_number,
        COUNT(vsm.subject_id) AS total_subjects,
        SUM(vsm.credits) AS total_credits,
        SUM(vsm.total_max_marks) AS semester_max_marks,
        SUM(vsm.total_marks_obtained) AS semester_marks_obtained,
        ROUND((SUM(vsm.total_marks_obtained) * 100.0) / SUM(vsm.total_max_marks), 2) AS overall_percentage,
        ROUND(SUM(vsm.grade_point * vsm.credits) * 1.0 / SUM(vsm.credits), 2) AS calculated_sgpa
    FROM v_student_subject_marks vsm
    GROUP BY vsm.student_id, vsm.roll_number, vsm.student_name, vsm.semester_id, vsm.semester_number;
    """)
    conn.commit()
    print("[SUCCESS] SQLite schema and views initialized.")


def seed_database(db_type, conn):
    """Populates realistic B.Tech CSE data into the database."""
    cursor = conn.cursor()
    param = "%s" if db_type == 'mysql' else "?"

    # Check if already seeded
    cursor.execute("SELECT COUNT(*) AS cnt FROM users")
    res = cursor.fetchone()
    count = res['cnt'] if isinstance(res, dict) else res[0]
    if count > 0:
        print(f"[INFO] Database already contains {count} users. Skipping seeding.")
        return

    print("[INFO] Seeding grading scale and at-risk criteria...")
    grades = [
        ('O', 90.0, 100.0, 10.0, 'Outstanding'),
        ('A+', 80.0, 89.99, 9.0, 'Excellent'),
        ('A', 70.0, 79.99, 8.0, 'Very Good'),
        ('B+', 60.0, 69.99, 7.0, 'Good'),
        ('B', 50.0, 59.99, 6.0, 'Above Average'),
        ('P', 40.0, 49.99, 5.0, 'Pass'),
        ('F', 0.0, 39.99, 0.0, 'Fail')
    ]
    for g in grades:
        cursor.execute(f"INSERT INTO grading_scale (letter_grade, min_percentage, max_percentage, grade_point, description) VALUES ({param}, {param}, {param}, {param}, {param})", g)

    rules = [
        ('Attendance Threshold', 'ATTENDANCE', 75.0, '<', 'High', 'Students with attendance below 75% are flagged for academic risk and exam debarment warning.'),
        ('Internal Marks Minimum', 'INTERNAL_MARKS', 40.0, '<', 'High', 'Students with internal assessment average below 40% are flagged as at-risk of semester backlog.'),
        ('SGPA Warning', 'SGPA', 5.0, '<', 'Medium', 'Semester GPA below 5.0 triggers academic probation notification.')
    ]
    for r in rules:
        cursor.execute(f"INSERT INTO at_risk_criteria (rule_name, criterion_type, threshold_value, operator, severity, description) VALUES ({param}, {param}, {param}, {param}, {param}, {param})", r)

    print("[INFO] Seeding course, semesters, and subjects...")
    cursor.execute(f"INSERT INTO courses (code, name, department, duration_years, total_semesters) VALUES ({param}, {param}, {param}, {param}, {param})",
                   ('BTECH-CSE', 'B.Tech Computer Science & Engineering', 'Computer Science & Engineering', 4, 8))
    course_id = cursor.lastrowid

    # Semesters
    cursor.execute(f"INSERT INTO semesters (course_id, semester_number, academic_year, term, is_current, start_date, end_date) VALUES ({param}, {param}, {param}, {param}, {param}, {param}, {param})",
                   (course_id, 4, '2023-2024', 'Even', 0, '2024-01-08', '2024-05-20'))
    sem4_id = cursor.lastrowid

    cursor.execute(f"INSERT INTO semesters (course_id, semester_number, academic_year, term, is_current, start_date, end_date) VALUES ({param}, {param}, {param}, {param}, {param}, {param}, {param})",
                   (course_id, 5, '2024-2025', 'Odd', 1, '2024-08-01', '2024-12-15'))
    sem5_id = cursor.lastrowid

    # Subjects for Sem 5
    subjects_sem5 = [
        ('CS501', 'Database Management Systems', course_id, 5, 4, 'Theory', 40.0, 60.0),
        ('CS502', 'Computer Networks', course_id, 5, 4, 'Theory', 40.0, 60.0),
        ('CS503', 'Design & Analysis of Algorithms', course_id, 5, 4, 'Theory', 40.0, 60.0),
        ('CS504', 'Web Technologies', course_id, 5, 3, 'Theory', 40.0, 60.0),
        ('CS505', 'DBMS & Web Development Lab', course_id, 5, 2, 'Practical', 50.0, 50.0)
    ]
    sub_ids = {}
    for s in subjects_sem5:
        if db_type == 'mysql':
            cursor.execute(f"INSERT INTO subjects (code, name, course_id, semester_number, credits, subject_type, max_internal_marks, max_external_marks) VALUES ({param}, {param}, {param}, {param}, {param}, {param}, {param}, {param})", s)
        else:
            total = s[6] + s[7]
            cursor.execute(f"INSERT INTO subjects (code, name, course_id, semester_number, credits, subject_type, max_internal_marks, max_external_marks, total_marks) VALUES ({param}, {param}, {param}, {param}, {param}, {param}, {param}, {param}, {param})", (*s, total))
        sub_ids[s[0]] = cursor.lastrowid

    print("[INFO] Seeding Admin and Faculty users...")
    admin_hash = generate_password_hash('Admin@123')
    faculty_hash = generate_password_hash('Faculty@123')
    student_hash = generate_password_hash('Student@123')

    # Admin
    cursor.execute(f"INSERT INTO users (username, email, password_hash, role, full_name, phone, department) VALUES ({param}, {param}, {param}, {param}, {param}, {param}, {param})",
                   ('admin', 'admin@college.edu', admin_hash, 'admin', 'Dr. S. K. Verma (Dean)', '9876543200', 'Academic Administration'))
    admin_user_id = cursor.lastrowid

    # Faculty 1 (Dr. Rajesh Sharma - DBMS)
    cursor.execute(f"INSERT INTO users (username, email, password_hash, role, full_name, phone, department) VALUES ({param}, {param}, {param}, {param}, {param}, {param}, {param})",
                   ('faculty.sharma', 'rajesh.sharma@college.edu', faculty_hash, 'faculty', 'Dr. Rajesh Sharma', '9876543201', 'Computer Science & Engineering'))
    fac1_user_id = cursor.lastrowid
    cursor.execute(f"INSERT INTO faculty_profiles (user_id, employee_id, designation, specialization, qualification, joining_date) VALUES ({param}, {param}, {param}, {param}, {param}, {param})",
                   (fac1_user_id, 'FAC-CSE-01', 'Associate Professor', 'Database Systems & Data Mining', 'Ph.D in CSE', '2016-07-15'))
    fac1_id = cursor.lastrowid

    # Faculty 2 (Prof. Priya Verma - Computer Networks)
    cursor.execute(f"INSERT INTO users (username, email, password_hash, role, full_name, phone, department) VALUES ({param}, {param}, {param}, {param}, {param}, {param}, {param})",
                   ('faculty.verma', 'priya.verma@college.edu', faculty_hash, 'faculty', 'Prof. Priya Verma', '9876543202', 'Computer Science & Engineering'))
    fac2_user_id = cursor.lastrowid
    cursor.execute(f"INSERT INTO faculty_profiles (user_id, employee_id, designation, specialization, qualification, joining_date) VALUES ({param}, {param}, {param}, {param}, {param}, {param})",
                   (fac2_user_id, 'FAC-CSE-02', 'Assistant Professor', 'Computer Networks & Security', 'M.Tech CSE', '2019-08-01'))
    fac2_id = cursor.lastrowid

    # Faculty 3 (Dr. Amit Gupta - Algorithms & Web)
    cursor.execute(f"INSERT INTO users (username, email, password_hash, role, full_name, phone, department) VALUES ({param}, {param}, {param}, {param}, {param}, {param}, {param})",
                   ('dr.gupta', 'amit.gupta@college.edu', faculty_hash, 'faculty', 'Dr. Amit Gupta', '9876543203', 'Computer Science & Engineering'))
    fac3_user_id = cursor.lastrowid
    cursor.execute(f"INSERT INTO faculty_profiles (user_id, employee_id, designation, specialization, qualification, joining_date) VALUES ({param}, {param}, {param}, {param}, {param}, {param})",
                   (fac3_user_id, 'FAC-CSE-03', 'Assistant Professor', 'Algorithms & Distributed Systems', 'Ph.D in CSE', '2020-01-10'))
    fac3_id = cursor.lastrowid

    # Faculty Assignments
    # Sharma teaches CS501 (DBMS) & CS505 (Lab)
    cursor.execute(f"INSERT INTO faculty_assignments (faculty_id, subject_id, semester_id, section) VALUES ({param}, {param}, {param}, {param})",
                   (fac1_id, sub_ids['CS501'], sem5_id, 'A'))
    cursor.execute(f"INSERT INTO faculty_assignments (faculty_id, subject_id, semester_id, section) VALUES ({param}, {param}, {param}, {param})",
                   (fac1_id, sub_ids['CS505'], sem5_id, 'A'))
    # Verma teaches CS502 (Networks)
    cursor.execute(f"INSERT INTO faculty_assignments (faculty_id, subject_id, semester_id, section) VALUES ({param}, {param}, {param}, {param})",
                   (fac2_id, sub_ids['CS502'], sem5_id, 'A'))
    # Gupta teaches CS503 (Algorithms) & CS504 (Web Tech)
    cursor.execute(f"INSERT INTO faculty_assignments (faculty_id, subject_id, semester_id, section) VALUES ({param}, {param}, {param}, {param})",
                   (fac3_id, sub_ids['CS503'], sem5_id, 'A'))
    cursor.execute(f"INSERT INTO faculty_assignments (faculty_id, subject_id, semester_id, section) VALUES ({param}, {param}, {param}, {param})",
                   (fac3_id, sub_ids['CS504'], sem5_id, 'A'))

    print("[INFO] Seeding Students...")
    students_data = [
        ('cs22001', 'aditi.rao@college.edu', 'Aditi Rao', 'CS22001', 2022, 'high_achiever'),
        ('cs22002', 'rohan.iyer@college.edu', 'Rohan Iyer', 'CS22002', 2022, 'high_achiever'),
        ('cs22003', 'kavita.nair@college.edu', 'Kavita Nair', 'CS22003', 2022, 'average'),
        ('cs22004', 'vikram.singh@college.edu', 'Vikram Singh', 'CS22004', 2022, 'low_attendance'),
        ('cs22005', 'aarav.mehta@college.edu', 'Aarav Mehta', 'CS22005', 2022, 'at_risk_severe'),
        ('cs22006', 'ananya.joshi@college.edu', 'Ananya Joshi', 'CS22006', 2022, 'average'),
        ('cs22007', 'siddharth.sharma@college.edu', 'Siddharth Sharma', 'CS22007', 2022, 'average'),
        ('cs22008', 'sneha.patel@college.edu', 'Sneha Patel', 'CS22008', 2022, 'low_marks')
    ]

    student_records = []
    for u in students_data:
        cursor.execute(f"INSERT INTO users (username, email, password_hash, role, full_name, phone, department) VALUES ({param}, {param}, {param}, {param}, {param}, {param}, {param})",
                       (u[0], u[1], student_hash, 'student', u[2], '98765400' + u[3][-2:], 'Computer Science & Engineering'))
        uid = cursor.lastrowid
        cursor.execute(f"INSERT INTO students (user_id, roll_number, admission_year, course_id, current_semester_id, batch, section, parent_email, parent_phone) VALUES ({param}, {param}, {param}, {param}, {param}, {param}, {param}, {param}, {param})",
                       (uid, u[3], u[4], course_id, sem5_id, '2022-2026', 'A', f"parent.{u[0]}@example.com", '98765999' + u[3][-2:]))
        sid = cursor.lastrowid
        student_records.append({'id': sid, 'user_id': uid, 'roll': u[3], 'name': u[2], 'profile': u[5]})

        # Enroll student in all Sem 5 subjects
        for sub_id in sub_ids.values():
            cursor.execute(f"INSERT INTO student_enrollments (student_id, semester_id, subject_id, status) VALUES ({param}, {param}, {param}, {param})",
                           (sid, sem5_id, sub_id, 'Enrolled'))

    print("[INFO] Seeding realistic Marks and Attendance...")
    # Assessments
    assessments = [
        ('Quiz 1', 20.0),
        ('Assignment', 20.0),
        ('Mid-Term', 40.0),
        ('Lab Exam', 50.0)
    ]

    # Performance profiles map to multiplier
    profile_score_ranges = {
        'high_achiever': (0.85, 0.98),
        'average': (0.60, 0.78),
        'low_attendance': (0.55, 0.70),
        'low_marks': (0.28, 0.42),       # Under 40% threshold!
        'at_risk_severe': (0.25, 0.38)    # Under 40% threshold!
    }

    profile_att_prob = {
        'high_achiever': 0.95,
        'average': 0.82,
        'low_attendance': 0.65,          # Under 75% threshold!
        'low_marks': 0.85,
        'at_risk_severe': 0.58           # Under 75% threshold!
    }

    import random
    random.seed(42)

    for st in student_records:
        sid = st['id']
        prof = st['profile']
        min_p, max_p = profile_score_ranges[prof]

        # Marks for each subject
        for s_code, s_id in sub_ids.items():
            for a_type, max_m in assessments:
                if s_code == 'CS505' and a_type != 'Lab Exam' and a_type != 'Assignment':
                    continue
                if s_code != 'CS505' and a_type == 'Lab Exam':
                    continue
                
                # Calculate score
                pct = random.uniform(min_p, max_p)
                obtained = round(max_m * pct, 1)
                obtained = max(0.0, min(max_m, obtained))
                
                cursor.execute(f"""
                    INSERT INTO marks (student_id, subject_id, semester_id, assessment_type, max_marks, marks_obtained, entered_by, remarks)
                    VALUES ({param}, {param}, {param}, {param}, {param}, {param}, {param}, {param})
                """, (sid, s_id, sem5_id, a_type, max_m, obtained, fac1_user_id, f"Assessment completed for {a_type}"))

        # Attendance over 20 lecture dates
        start_dt = date(2024, 8, 5)
        prob = profile_att_prob[prof]
        for day_offset in range(25):
            cur_date = start_dt + timedelta(days=day_offset)
            if cur_date.weekday() >= 5:  # Skip weekends
                continue
            
            for s_code, s_id in sub_ids.items():
                is_present = random.random() < prob
                status = 'Present' if is_present else ('Absent' if random.random() < 0.85 else 'Late')
                cursor.execute(f"""
                    INSERT INTO attendance (student_id, subject_id, date, session_name, status, recorded_by)
                    VALUES ({param}, {param}, {param}, {param}, {param}, {param})
                """, (sid, s_id, cur_date.isoformat(), 'Lecture Session', status, fac1_user_id))

    print("[INFO] Seeding Faculty Interventions for flagged at-risk students...")
    # Find aarav and sneha IDs
    aarav = next(s for s in student_records if s['roll'] == 'CS22005')
    vikram = next(s for s in student_records if s['roll'] == 'CS22004')
    sneha = next(s for s in student_records if s['roll'] == 'CS22008')

    interventions_data = [
        (aarav['id'], fac1_id, sub_ids['CS501'], 'Low attendance (58%) and mid-term marks below passing cutoff (32%).',
         'One-on-One Counseling', '2024-09-20', 'In Progress',
         'Met with student. Discovered transport challenges and health recovery. Recommended remedial sessions and scheduled review.',
         'Follow-up scheduled after two weeks. Student committed to attending morning remedial slots.'),
        (aarav['id'], fac2_id, sub_ids['CS502'], 'Consecutive absentees in Computer Networks lectures.',
         'Parent Contact', '2024-09-22', 'Completed',
         'Telephonic discussion with parent regarding attendance requirements as per university norms.',
         'Parent acknowledged notice and assured regular monitoring.'),
        (vikram['id'], fac1_id, sub_ids['CS501'], 'Attendance dipped below 70% threshold in DBMS theory classes.',
         'Warning Issued', '2024-09-15', 'Completed',
         'Formal academic alert issued regarding exam hall ticket eligibility.',
         'Student submitted medical certificate for 4 absent days. Attendance restored partially.'),
        (sneha['id'], fac3_id, sub_ids['CS503'], 'Difficulty in Algorithm design proofs and low quiz scores.',
         'Remedial Class', '2024-09-25', 'Scheduled',
         'Enrolled in Saturday peer mentoring and tutorial problem solving batches.',
         'Awaiting second assessment score review.')
    ]

    for inv in interventions_data:
        cursor.execute(f"""
            INSERT INTO interventions (student_id, faculty_id, subject_id, risk_reason, action_type, action_date, status, notes, outcome_remarks)
            VALUES ({param}, {param}, {param}, {param}, {param}, {param}, {param}, {param}, {param})
        """, inv)

    conn.commit()
    print("[SUCCESS] Realistic B.Tech CSE demo dataset seeded successfully!")


def main():
    print("=" * 70)
    print("Student Performance Analytics & Management System (SPAMS)")
    print("Database Initializer & Seeder")
    print("=" * 70)

    db_type, conn = get_db_connection()
    print(f"[STATUS] Connected to database backend: {db_type.upper()}")

    if db_type == 'mysql':
        init_mysql(conn)
    else:
        init_sqlite(conn)

    seed_database(db_type, conn)
    conn.close()

    print("\n" + "=" * 70)
    print("Setup Summary & Default Credentials:")
    print("=" * 70)
    print("Roles & Demo Accounts:")
    print("  1. Admin:   Username: admin            Password: Admin@123")
    print("  2. Faculty: Username: faculty.sharma   Password: Faculty@123 (Dr. Rajesh Sharma)")
    print("  3. Faculty: Username: faculty.verma    Password: Faculty@123 (Prof. Priya Verma)")
    print("  4. Faculty: Username: dr.gupta         Password: Faculty@123 (Dr. Amit Gupta)")
    print("  5. Student: Username: cs22001          Password: Student@123 (Aditi Rao - Achiever)")
    print("  6. Student: Username: cs22004          Password: Student@123 (Vikram Singh - Low Attendance)")
    print("  7. Student: Username: cs22005          Password: Student@123 (Aarav Mehta - High Risk)")
    print("=" * 70)


if __name__ == '__main__':
    main()
