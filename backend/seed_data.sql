-- =============================================================================
-- STUDENT PERFORMANCE ANALYTICS & MANAGEMENT SYSTEM (SPAMS)
-- Seed Data Script (MySQL 8.0)
-- Realistic Fictional B.Tech CSE Dataset
-- =============================================================================

USE spams_db;

-- -----------------------------------------------------------------------------
-- 1. GRADING SCALE & AT-RISK RULES
-- -----------------------------------------------------------------------------
INSERT INTO grading_scale (letter_grade, min_percentage, max_percentage, grade_point, description) VALUES
('O', 90.00, 100.00, 10.00, 'Outstanding'),
('A+', 80.00, 89.99, 9.00, 'Excellent'),
('A', 70.00, 79.99, 8.00, 'Very Good'),
('B+', 60.00, 69.99, 7.00, 'Good'),
('B', 50.00, 59.99, 6.00, 'Above Average'),
('P', 40.00, 49.99, 5.00, 'Pass'),
('F', 0.00, 39.99, 0.00, 'Fail')
ON DUPLICATE KEY UPDATE description=VALUES(description);

INSERT INTO at_risk_criteria (rule_name, criterion_type, threshold_value, operator, severity, description) VALUES
('Attendance Threshold', 'ATTENDANCE', 75.00, '<', 'High', 'Students with attendance below 75% are flagged for academic risk and exam debarment warning.'),
('Internal Marks Minimum', 'INTERNAL_MARKS', 40.00, '<', 'High', 'Students with internal assessment average below 40% are flagged as at-risk of semester backlog.'),
('SGPA Warning', 'SGPA', 5.00, '<', 'Medium', 'Semester GPA below 5.0 triggers academic probation notification.')
ON DUPLICATE KEY UPDATE threshold_value=VALUES(threshold_value);

-- -----------------------------------------------------------------------------
-- 2. COURSES & SEMESTERS
-- -----------------------------------------------------------------------------
INSERT INTO courses (id, code, name, department, duration_years, total_semesters) VALUES
(1, 'BTECH-CSE', 'B.Tech Computer Science & Engineering', 'Computer Science & Engineering', 4, 8)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO semesters (id, course_id, semester_number, academic_year, term, is_current, start_date, end_date) VALUES
(1, 1, 4, '2023-2024', 'Even', 0, '2024-01-08', '2024-05-20'),
(2, 1, 5, '2024-2025', 'Odd', 1, '2024-08-01', '2024-12-15')
ON DUPLICATE KEY UPDATE is_current=VALUES(is_current);

-- -----------------------------------------------------------------------------
-- 3. SUBJECTS (Semester 5)
-- -----------------------------------------------------------------------------
INSERT INTO subjects (id, code, name, course_id, semester_number, credits, subject_type, max_internal_marks, max_external_marks) VALUES
(1, 'CS501', 'Database Management Systems', 1, 5, 4, 'Theory', 40.00, 60.00),
(2, 'CS502', 'Computer Networks', 1, 5, 4, 'Theory', 40.00, 60.00),
(3, 'CS503', 'Design & Analysis of Algorithms', 1, 5, 4, 'Theory', 40.00, 60.00),
(4, 'CS504', 'Web Technologies', 1, 5, 3, 'Theory', 40.00, 60.00),
(5, 'CS505', 'DBMS & Web Development Lab', 1, 5, 2, 'Practical', 50.00, 50.00)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- -----------------------------------------------------------------------------
-- 4. USERS (Admin, Faculty, Students)
-- Passwords:
-- Admin: Admin@123
-- Faculty: Faculty@123
-- Students: Student@123
-- -----------------------------------------------------------------------------
INSERT INTO users (id, username, email, password_hash, role, full_name, phone, department) VALUES
(1, 'admin', 'admin@college.edu', 'scrypt:32768:8:1$8j3wEphxnEF20eSC$d37d66a187628544bf1afa50480d9b1aa58a74804930d529bd272b5a5134609d94f3136b1aa336e69c2749cf80f378521aad8b542edae36558f54faf3ce68e61', 'admin', 'Dr. S. K. Verma (Dean)', '9876543200', 'Academic Administration'),
(2, 'faculty.sharma', 'rajesh.sharma@college.edu', 'scrypt:32768:8:1$B4H2mks81sJ4$8cfba846a836faefcf19965d1b32d203cb784f1b4028d58baec5b84c7a685fba394ad7df6ea2d5eaebaece06346b96e2faeefef6ff255ca87ffc9ecaa9ad2f4b', 'faculty', 'Dr. Rajesh Sharma', '9876543201', 'Computer Science & Engineering'),
(3, 'faculty.verma', 'priya.verma@college.edu', 'scrypt:32768:8:1$B4H2mks81sJ4$8cfba846a836faefcf19965d1b32d203cb784f1b4028d58baec5b84c7a685fba394ad7df6ea2d5eaebaece06346b96e2faeefef6ff255ca87ffc9ecaa9ad2f4b', 'faculty', 'Prof. Priya Verma', '9876543202', 'Computer Science & Engineering'),
(4, 'dr.gupta', 'amit.gupta@college.edu', 'scrypt:32768:8:1$B4H2mks81sJ4$8cfba846a836faefcf19965d1b32d203cb784f1b4028d58baec5b84c7a685fba394ad7df6ea2d5eaebaece06346b96e2faeefef6ff255ca87ffc9ecaa9ad2f4b', 'faculty', 'Dr. Amit Gupta', '9876543203', 'Computer Science & Engineering'),
(5, 'cs22001', 'aditi.rao@college.edu', 'scrypt:32768:8:1$kH2j91L29aJ4$4cfba846a836faefcf19965d1b32d203cb784f1b4028d58baec5b84c7a685fba394ad7df6ea2d5eaebaece06346b96e2faeefef6ff255ca87ffc9ecaa9ad2f4b', 'student', 'Aditi Rao', '9876540001', 'Computer Science & Engineering'),
(6, 'cs22002', 'rohan.iyer@college.edu', 'scrypt:32768:8:1$kH2j91L29aJ4$4cfba846a836faefcf19965d1b32d203cb784f1b4028d58baec5b84c7a685fba394ad7df6ea2d5eaebaece06346b96e2faeefef6ff255ca87ffc9ecaa9ad2f4b', 'student', 'Rohan Iyer', '9876540002', 'Computer Science & Engineering'),
(7, 'cs22003', 'kavita.nair@college.edu', 'scrypt:32768:8:1$kH2j91L29aJ4$4cfba846a836faefcf19965d1b32d203cb784f1b4028d58baec5b84c7a685fba394ad7df6ea2d5eaebaece06346b96e2faeefef6ff255ca87ffc9ecaa9ad2f4b', 'student', 'Kavita Nair', '9876540003', 'Computer Science & Engineering'),
(8, 'cs22004', 'vikram.singh@college.edu', 'scrypt:32768:8:1$kH2j91L29aJ4$4cfba846a836faefcf19965d1b32d203cb784f1b4028d58baec5b84c7a685fba394ad7df6ea2d5eaebaece06346b96e2faeefef6ff255ca87ffc9ecaa9ad2f4b', 'student', 'Vikram Singh', '9876540004', 'Computer Science & Engineering'),
(9, 'cs22005', 'aarav.mehta@college.edu', 'scrypt:32768:8:1$kH2j91L29aJ4$4cfba846a836faefcf19965d1b32d203cb784f1b4028d58baec5b84c7a685fba394ad7df6ea2d5eaebaece06346b96e2faeefef6ff255ca87ffc9ecaa9ad2f4b', 'student', 'Aarav Mehta', '9876540005', 'Computer Science & Engineering'),
(10, 'cs22006', 'ananya.joshi@college.edu', 'scrypt:32768:8:1$kH2j91L29aJ4$4cfba846a836faefcf19965d1b32d203cb784f1b4028d58baec5b84c7a685fba394ad7df6ea2d5eaebaece06346b96e2faeefef6ff255ca87ffc9ecaa9ad2f4b', 'student', 'Ananya Joshi', '9876540006', 'Computer Science & Engineering')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- -----------------------------------------------------------------------------
-- 5. FACULTY PROFILES & STUDENT PROFILES
-- -----------------------------------------------------------------------------
INSERT INTO faculty_profiles (id, user_id, employee_id, designation, specialization, qualification, joining_date) VALUES
(1, 2, 'FAC-CSE-01', 'Associate Professor', 'Database Systems & Data Mining', 'Ph.D in CSE', '2016-07-15'),
(2, 3, 'FAC-CSE-02', 'Assistant Professor', 'Computer Networks & Security', 'M.Tech CSE', '2019-08-01'),
(3, 4, 'FAC-CSE-03', 'Assistant Professor', 'Algorithms & Distributed Systems', 'Ph.D in CSE', '2020-01-10')
ON DUPLICATE KEY UPDATE designation=VALUES(designation);

INSERT INTO students (id, user_id, roll_number, admission_year, course_id, current_semester_id, batch, section, parent_email, parent_phone) VALUES
(1, 5, 'CS22001', 2022, 1, 2, '2022-2026', 'A', 'parent.cs22001@example.com', '9876599901'),
(2, 6, 'CS22002', 2022, 1, 2, '2022-2026', 'A', 'parent.cs22002@example.com', '9876599902'),
(3, 7, 'CS22003', 2022, 1, 2, '2022-2026', 'A', 'parent.cs22003@example.com', '9876599903'),
(4, 8, 'CS22004', 2022, 1, 2, '2022-2026', 'A', 'parent.cs22004@example.com', '9876599904'),
(5, 9, 'CS22005', 2022, 1, 2, '2022-2026', 'A', 'parent.cs22005@example.com', '9876599905'),
(6, 10, 'CS22006', 2022, 1, 2, '2022-2026', 'A', 'parent.cs22006@example.com', '9876599906')
ON DUPLICATE KEY UPDATE roll_number=VALUES(roll_number);

-- -----------------------------------------------------------------------------
-- 6. FACULTY ASSIGNMENTS
-- -----------------------------------------------------------------------------
INSERT INTO faculty_assignments (faculty_id, subject_id, semester_id, section) VALUES
(1, 1, 2, 'A'), -- Dr. Sharma -> CS501 DBMS
(1, 5, 2, 'A'), -- Dr. Sharma -> CS505 DBMS Lab
(2, 2, 2, 'A'), -- Prof. Verma -> CS502 Computer Networks
(3, 3, 2, 'A'), -- Dr. Gupta -> CS503 Algorithms
(3, 4, 2, 'A')  -- Dr. Gupta -> CS504 Web Technologies
ON DUPLICATE KEY UPDATE section=VALUES(section);

-- -----------------------------------------------------------------------------
-- 7. STUDENT ENROLLMENTS
-- -----------------------------------------------------------------------------
INSERT INTO student_enrollments (student_id, semester_id, subject_id, status)
SELECT s.id, 2, sub.id, 'Enrolled'
FROM students s
CROSS JOIN subjects sub
WHERE sub.semester_number = 5
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- -----------------------------------------------------------------------------
-- 8. INTERVENTIONS
-- -----------------------------------------------------------------------------
INSERT INTO interventions (student_id, faculty_id, subject_id, risk_reason, action_type, action_date, status, notes, outcome_remarks) VALUES
(5, 1, 1, 'Low attendance (58%) and mid-term marks below passing cutoff (32%).', 'One-on-One Counseling', '2024-09-20', 'In Progress', 'Met with student. Discovered transport challenges and health recovery. Recommended remedial sessions and scheduled review.', 'Follow-up scheduled after two weeks. Student committed to attending morning remedial slots.'),
(5, 2, 2, 'Consecutive absentees in Computer Networks lectures.', 'Parent Contact', '2024-09-22', 'Completed', 'Telephonic discussion with parent regarding attendance requirements as per university norms.', 'Parent acknowledged notice and assured regular monitoring.'),
(4, 1, 1, 'Attendance dipped below 70% threshold in DBMS theory classes.', 'Warning Issued', '2024-09-15', 'Completed', 'Formal academic alert issued regarding exam hall ticket eligibility.', 'Student submitted medical certificate for 4 absent days. Attendance restored partially.')
ON DUPLICATE KEY UPDATE risk_reason=VALUES(risk_reason);
