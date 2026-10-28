"""
Automated Backend API Test Suite
================================
Validates all endpoints, role-based authorization, marks validation, and analytics.
"""

import json
from app import app
from database import query_one

def run_tests():
    client = app.test_client()
    print("=" * 60)
    print("Running SPAMS Backend Test Suite...")
    print("=" * 60)

    # 1. Health check
    res = client.get('/api/health')
    assert res.status_code == 200, f"Health check failed: {res.status_code}"
    data = res.get_json()
    print(f"[PASS] Health check OK. DB Backend: {data['database_backend']}")

    # 2. Login Tests
    # 2a. Admin Login
    res = client.post('/api/auth/login', json={'username': 'admin', 'password': 'Admin@123'})
    assert res.status_code == 200, f"Admin login failed: {res.get_json()}"
    admin_token = res.get_json()['token']
    admin_headers = {'Authorization': f'Bearer {admin_token}'}
    print("[PASS] Admin login successful.")

    # 2b. Faculty Login
    res = client.post('/api/auth/login', json={'username': 'faculty.sharma', 'password': 'Faculty@123'})
    assert res.status_code == 200, f"Faculty login failed: {res.get_json()}"
    faculty_token = res.get_json()['token']
    faculty_headers = {'Authorization': f'Bearer {faculty_token}'}
    print("[PASS] Faculty login successful.")

    # 2c. Student Login
    res = client.post('/api/auth/login', json={'username': 'cs22001', 'password': 'Student@123'})
    assert res.status_code == 200, f"Student login failed: {res.get_json()}"
    student_token = res.get_json()['token']
    student_headers = {'Authorization': f'Bearer {student_token}'}
    print("[PASS] Student login successful.")

    # 2d. Invalid Login
    res = client.post('/api/auth/login', json={'username': 'admin', 'password': 'WrongPassword!'})
    assert res.status_code == 401, f"Expected 401 on bad password: {res.status_code}"
    print("[PASS] Invalid password rejected with 401.")

    # 3. Role-based Access Control (RBAC)
    # Student attempting to access Admin course creation -> Must return 403 Forbidden
    res = client.post('/api/courses', json={'code': 'TEST', 'name': 'Test Course', 'department': 'CSE'}, headers=student_headers)
    assert res.status_code == 403, f"Expected 403 for student accessing admin route, got {res.status_code}"
    print("[PASS] RBAC enforced: Student blocked from Admin routes (403 Forbidden).")

    # 4. Academic Setup Endpoints
    res = client.get('/api/courses', headers=admin_headers)
    assert res.status_code == 200
    courses = res.get_json()
    assert len(courses) > 0
    print(f"[PASS] Courses retrieved ({len(courses)} courses).")

    res = client.get('/api/subjects', headers=admin_headers)
    assert res.status_code == 200
    subjects = res.get_json()
    assert len(subjects) >= 5
    print(f"[PASS] Subjects retrieved ({len(subjects)} subjects).")

    # 5. Marks Validation & Management
    # Test invalid mark (marks_obtained > max_marks) -> Must return 400 Bad Request
    sub_id = subjects[0]['id']
    st_row = query_one("SELECT id FROM students LIMIT 1")
    sem_row = query_one("SELECT id FROM semesters LIMIT 1")

    res = client.post('/api/marks', json=[{
        'student_id': st_row['id'],
        'subject_id': sub_id,
        'semester_id': sem_row['id'],
        'assessment_type': 'Quiz 1',
        'max_marks': 20.0,
        'marks_obtained': 25.0 # Invalid!
    }], headers=admin_headers)
    assert res.status_code == 400, f"Expected 400 for marks > max_marks, got {res.status_code}"
    print("[PASS] Input validation enforced: marks_obtained > max_marks rejected (400 Bad Request).")

    # Valid mark entry
    res = client.post('/api/marks', json=[{
        'student_id': st_row['id'],
        'subject_id': sub_id,
        'semester_id': sem_row['id'],
        'assessment_type': 'Quiz 1',
        'max_marks': 20.0,
        'marks_obtained': 18.5,
        'remarks': 'Good performance'
    }], headers=admin_headers)
    assert res.status_code == 200, f"Valid marks entry failed: {res.get_json()}"
    print("[PASS] Marks entry and transaction commit succeeded.")

    # 6. Attendance Summary & Batch Recording
    res = client.get('/api/attendance/summary', headers=admin_headers)
    assert res.status_code == 200
    att_summary = res.get_json()
    assert len(att_summary) > 0
    print(f"[PASS] Attendance summary view returned {len(att_summary)} records.")

    # 7. At-Risk Detection Engine
    res = client.get('/api/at-risk/students', headers=admin_headers)
    assert res.status_code == 200
    at_risk = res.get_json()
    assert len(at_risk) > 0
    print(f"[PASS] At-risk detection engine identified {len(at_risk)} student(s) with clear flags.")
    print(f"       Top flagged student: {at_risk[0]['student_name']} (Severity: {at_risk[0]['severity']}, Attendance: {at_risk[0]['overall_attendance']}%)")

    # 8. Student Performance Analytics & SGPA/CGPA
    res = client.get(f'/api/analytics/student/{st_row["id"]}', headers=admin_headers)
    assert res.status_code == 200
    analytics = res.get_json()
    assert 'calculated_cgpa' in analytics
    print(f"[PASS] Student analytics calculated CGPA: {analytics['calculated_cgpa']} and Attendance: {analytics['overall_attendance_pct']}%")

    # 9. Faculty Interventions
    res = client.get('/api/interventions', headers=admin_headers)
    assert res.status_code == 200
    intvs = res.get_json()
    assert len(intvs) > 0
    print(f"[PASS] Faculty interventions retrieved ({len(intvs)} logged actions).")

    # 10. Reports & CSV Export
    res = client.get('/api/reports/semester-performance?format=csv', headers=admin_headers)
    assert res.status_code == 200
    assert 'text/csv' in res.content_type
    print("[PASS] Semester performance CSV export working.")

    res = client.get('/api/reports/attendance-defaulters?format=csv', headers=admin_headers)
    assert res.status_code == 200
    assert 'text/csv' in res.content_type
    print("[PASS] Attendance defaulters CSV export working.")

    print("=" * 60)
    print("ALL 10 TEST SUITES PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == '__main__':
    run_tests()
