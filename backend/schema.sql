-- =============================================================================
-- STUDENT PERFORMANCE ANALYTICS & MANAGEMENT SYSTEM (SPAMS)
-- Relational Database Schema (MySQL 8.0)
-- Fully Normalized to 3NF (Third Normal Form)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS spams_db;
USE spams_db;

-- -----------------------------------------------------------------------------
-- 1. USERS & ROLES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'faculty', 'student') NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(100) DEFAULT 'Computer Science & Engineering',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_role (role),
    INDEX idx_user_username (username),
    INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 2. ACADEMIC STRUCTURE (Courses, Semesters)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    duration_years INT NOT NULL DEFAULT 4,
    total_semesters INT NOT NULL DEFAULT 8,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS semesters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    semester_number INT NOT NULL,
    academic_year VARCHAR(20) NOT NULL, -- e.g. '2024-2025'
    term ENUM('Odd', 'Even', 'Summer') NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY uk_course_sem_year (course_id, semester_number, academic_year),
    INDEX idx_sem_course (course_id),
    INDEX idx_sem_current (is_current)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 3. PROFILES (Faculty, Student)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS faculty_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    employee_id VARCHAR(30) NOT NULL UNIQUE,
    designation VARCHAR(60) NOT NULL DEFAULT 'Assistant Professor',
    specialization VARCHAR(120),
    qualification VARCHAR(100) DEFAULT 'M.Tech / Ph.D',
    joining_date DATE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_fac_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    roll_number VARCHAR(30) NOT NULL UNIQUE,
    admission_year INT NOT NULL,
    course_id INT NOT NULL,
    current_semester_id INT,
    batch VARCHAR(30), -- e.g. '2022-2026'
    section VARCHAR(10) DEFAULT 'A',
    parent_email VARCHAR(100),
    parent_phone VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
    FOREIGN KEY (current_semester_id) REFERENCES semesters(id) ON DELETE SET NULL,
    INDEX idx_student_roll (roll_number),
    INDEX idx_student_course (course_id),
    INDEX idx_student_sem (current_semester_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 4. SUBJECTS & FACULTY ALLOCATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    course_id INT NOT NULL,
    semester_number INT NOT NULL,
    credits INT NOT NULL DEFAULT 4,
    subject_type ENUM('Theory', 'Practical', 'Theory+Practical', 'Project') DEFAULT 'Theory',
    max_internal_marks DECIMAL(5,2) DEFAULT 40.00,
    max_external_marks DECIMAL(5,2) DEFAULT 60.00,
    total_marks DECIMAL(5,2) GENERATED ALWAYS AS (max_internal_marks + max_external_marks) STORED,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_subject_course_sem (course_id, semester_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS faculty_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    subject_id INT NOT NULL,
    semester_id INT NOT NULL,
    section VARCHAR(10) DEFAULT 'A',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    UNIQUE KEY uk_fac_subject_sem_sec (faculty_id, subject_id, semester_id, section),
    INDEX idx_fa_faculty (faculty_id),
    INDEX idx_fa_subject (subject_id),
    INDEX idx_fa_semester (semester_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 5. STUDENT ENROLLMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    semester_id INT NOT NULL,
    subject_id INT NOT NULL,
    status ENUM('Enrolled', 'Completed', 'Dropped') DEFAULT 'Enrolled',
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE KEY uk_student_sem_sub (student_id, semester_id, subject_id),
    INDEX idx_enr_student (student_id),
    INDEX idx_enr_subject (subject_id),
    INDEX idx_enr_semester (semester_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 6. MARKS MANAGEMENT
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    semester_id INT NOT NULL,
    assessment_type ENUM('Quiz 1', 'Quiz 2', 'Assignment', 'Mid-Term', 'Lab Exam', 'End-Term') NOT NULL,
    max_marks DECIMAL(5,2) NOT NULL,
    marks_obtained DECIMAL(5,2) NOT NULL,
    entered_by INT,
    remarks VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_std_sub_sem_assess (student_id, subject_id, semester_id, assessment_type),
    CONSTRAINT chk_marks_range CHECK (marks_obtained >= 0 AND marks_obtained <= max_marks),
    INDEX idx_marks_student_sem (student_id, semester_id),
    INDEX idx_marks_subject (subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 7. ATTENDANCE MANAGEMENT
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    date DATE NOT NULL,
    session_name VARCHAR(40) DEFAULT 'Regular Lecture',
    status ENUM('Present', 'Absent', 'Late', 'Excused') NOT NULL DEFAULT 'Present',
    recorded_by INT,
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_std_sub_date_session (student_id, subject_id, date, session_name),
    INDEX idx_att_student_sub (student_id, subject_id),
    INDEX idx_att_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 8. GRADING SCALE & AT-RISK RULES CONFIGURATION
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grading_scale (
    id INT AUTO_INCREMENT PRIMARY KEY,
    letter_grade VARCHAR(5) NOT NULL UNIQUE,
    min_percentage DECIMAL(5,2) NOT NULL,
    max_percentage DECIMAL(5,2) NOT NULL,
    grade_point DECIMAL(4,2) NOT NULL,
    description VARCHAR(60),
    CONSTRAINT chk_grade_range CHECK (min_percentage >= 0 AND max_percentage <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS at_risk_criteria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    criterion_type ENUM('ATTENDANCE', 'INTERNAL_MARKS', 'SGPA') NOT NULL,
    threshold_value DECIMAL(5,2) NOT NULL, -- e.g. 75.0 for attendance, 40.0 for internal marks, 5.0 for SGPA
    operator ENUM('<', '<=', '=', '>', '>=') DEFAULT '<',
    severity ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 9. FACULTY INTERVENTIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interventions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    faculty_id INT NOT NULL,
    subject_id INT,
    risk_reason VARCHAR(255) NOT NULL,
    action_type ENUM('Remedial Class', 'One-on-One Counseling', 'Parent Contact', 'Peer Tutoring', 'Assignment Support', 'Warning Issued') NOT NULL,
    action_date DATE NOT NULL,
    status ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Scheduled',
    notes TEXT,
    outcome_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES faculty_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    INDEX idx_intv_student (student_id),
    INDEX idx_intv_faculty (faculty_id),
    INDEX idx_intv_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 10. AUDIT LOGS (Triggers & System Logging)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    action_type ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    record_id INT NOT NULL,
    changed_by INT,
    old_values JSON,
    new_values JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_table (table_name),
    INDEX idx_audit_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- SQL VIEWS
-- =============================================================================

-- View 1: Subject-wise attendance summary per student
CREATE OR REPLACE VIEW v_student_attendance_summary AS
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
    ROUND(
        (SUM(CASE WHEN a.status IN ('Present', 'Excused') THEN 1 ELSE 0 END) * 100.0) / 
        NULLIF(COUNT(a.id), 0), 2
    ) AS attendance_percentage
FROM attendance a
JOIN students s ON a.student_id = s.id
JOIN users u ON s.user_id = u.id
JOIN subjects sub ON a.subject_id = sub.id
GROUP BY a.student_id, s.roll_number, u.full_name, sub.id, sub.code, sub.name;

-- View 2: Aggregated subject marks per student per semester
CREATE OR REPLACE VIEW v_student_subject_marks AS
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
    ROUND((SUM(m.marks_obtained) * 100.0) / NULLIF(SUM(m.max_marks), 0), 2) AS percentage,
    CASE 
        WHEN (SUM(m.marks_obtained) * 100.0) / NULLIF(SUM(m.max_marks), 0) >= 90 THEN 'O'
        WHEN (SUM(m.marks_obtained) * 100.0) / NULLIF(SUM(m.max_marks), 0) >= 80 THEN 'A+'
        WHEN (SUM(m.marks_obtained) * 100.0) / NULLIF(SUM(m.max_marks), 0) >= 70 THEN 'A'
        WHEN (SUM(m.marks_obtained) * 100.0) / NULLIF(SUM(m.max_marks), 0) >= 60 THEN 'B+'
        WHEN (SUM(m.marks_obtained) * 100.0) / NULLIF(SUM(m.max_marks), 0) >= 50 THEN 'B'
        WHEN (SUM(m.marks_obtained) * 100.0) / NULLIF(SUM(m.max_marks), 0) >= 40 THEN 'P'
        ELSE 'F'
    END AS estimated_grade,
    CASE 
        WHEN (SUM(m.marks_obtained) * 100.0) / NULLIF(SUM(m.max_marks), 0) >= 90 THEN 10.0
        WHEN (SUM(m.marks_obtained) * 100.0) / NULLIF(SUM(m.max_marks), 0) >= 80 THEN 9.0
        WHEN (SUM(m.marks_obtained) * 100.0) / NULLIF(SUM(m.max_marks), 0) >= 70 THEN 8.0
        WHEN (SUM(m.marks_obtained) * 100.0) / NULLIF(SUM(m.max_marks), 0) >= 60 THEN 7.0
        WHEN (SUM(m.marks_obtained) * 100.0) / NULLIF(SUM(m.max_marks), 0) >= 50 THEN 6.0
        WHEN (SUM(m.marks_obtained) * 100.0) / NULLIF(SUM(m.max_marks), 0) >= 40 THEN 5.0
        ELSE 0.0
    END AS grade_point
FROM marks m
JOIN students s ON m.student_id = s.id
JOIN users u ON s.user_id = u.id
JOIN semesters sem ON m.semester_id = sem.id
JOIN subjects sub ON m.subject_id = sub.id
GROUP BY m.student_id, s.roll_number, u.full_name, m.semester_id, sem.semester_number, m.subject_id, sub.code, sub.name, sub.credits;

-- View 3: Semester performance & SGPA
CREATE OR REPLACE VIEW v_student_semester_summary AS
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
    ROUND((SUM(vsm.total_marks_obtained) * 100.0) / NULLIF(SUM(vsm.total_max_marks), 0), 2) AS overall_percentage,
    ROUND(SUM(vsm.grade_point * vsm.credits) / NULLIF(SUM(vsm.credits), 0), 2) AS calculated_sgpa
FROM v_student_subject_marks vsm
GROUP BY vsm.student_id, vsm.roll_number, vsm.student_name, vsm.semester_id, vsm.semester_number;

-- =============================================================================
-- STORED PROCEDURES
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_calculate_student_cgpa;
DELIMITER //
CREATE PROCEDURE sp_calculate_student_cgpa(
    IN p_student_id INT,
    OUT p_cgpa DECIMAL(4,2),
    OUT p_total_credits INT,
    OUT p_total_semesters INT
)
BEGIN
    SELECT 
        IFNULL(ROUND(SUM(vss.calculated_sgpa * vss.total_credits) / NULLIF(SUM(vss.total_credits), 0), 2), 0.00),
        IFNULL(SUM(vss.total_credits), 0),
        COUNT(vss.semester_id)
    INTO 
        p_cgpa, 
        p_total_credits, 
        p_total_semesters
    FROM v_student_semester_summary vss
    WHERE vss.student_id = p_student_id;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_get_at_risk_students;
DELIMITER //
CREATE PROCEDURE sp_get_at_risk_students(
    IN p_course_id INT,
    IN p_semester_id INT
)
BEGIN
    -- Query students with flags based on attendance (<75%), internal marks (<40%), and SGPA (<5.0)
    SELECT 
        s.id AS student_id,
        s.roll_number,
        u.full_name AS student_name,
        u.email AS student_email,
        c.name AS course_name,
        sem.semester_number,
        IFNULL(att.overall_attendance, 0.00) AS overall_attendance,
        IFNULL(perf.calculated_sgpa, 0.00) AS current_sgpa,
        IFNULL(att.overall_attendance < 75.0, 1) AS flag_low_attendance,
        IFNULL(perf.calculated_sgpa < 5.0, 1) AS flag_low_sgpa,
        (
            SELECT COUNT(*) 
            FROM v_student_subject_marks vsm 
            WHERE vsm.student_id = s.id 
              AND vsm.semester_id = p_semester_id 
              AND vsm.percentage < 40.0
        ) AS failed_subjects_count
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN courses c ON s.course_id = c.id
    JOIN semesters sem ON s.current_semester_id = sem.id
    LEFT JOIN (
        SELECT 
            student_id,
            ROUND(AVG(attendance_percentage), 2) AS overall_attendance
        FROM v_student_attendance_summary
        GROUP BY student_id
    ) att ON s.id = att.student_id
    LEFT JOIN v_student_semester_summary perf 
        ON s.id = perf.student_id AND perf.semester_id = p_semester_id
    WHERE (p_course_id IS NULL OR s.course_id = p_course_id)
      AND (p_semester_id IS NULL OR s.current_semester_id = p_semester_id)
      AND (
          IFNULL(att.overall_attendance, 0.00) < 75.0 
          OR IFNULL(perf.calculated_sgpa, 0.00) < 5.0
          OR EXISTS (
              SELECT 1 FROM v_student_subject_marks vsm 
              WHERE vsm.student_id = s.id 
                AND vsm.semester_id = p_semester_id 
                AND vsm.percentage < 40.0
          )
      );
END //
DELIMITER ;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS trg_audit_marks_update;
DELIMITER //
CREATE TRIGGER trg_audit_marks_update
AFTER UPDATE ON marks
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (
        table_name,
        action_type,
        record_id,
        changed_by,
        old_values,
        new_values
    ) VALUES (
        'marks',
        'UPDATE',
        OLD.id,
        NEW.entered_by,
        JSON_OBJECT(
            'assessment_type', OLD.assessment_type,
            'max_marks', OLD.max_marks,
            'marks_obtained', OLD.marks_obtained,
            'remarks', OLD.remarks
        ),
        JSON_OBJECT(
            'assessment_type', NEW.assessment_type,
            'max_marks', NEW.max_marks,
            'marks_obtained', NEW.marks_obtained,
            'remarks', NEW.remarks
        )
    );
END //
DELIMITER ;

DROP TRIGGER IF EXISTS trg_validate_marks_before_insert;
DELIMITER //
CREATE TRIGGER trg_validate_marks_before_insert
BEFORE INSERT ON marks
FOR EACH ROW
BEGIN
    IF NEW.marks_obtained < 0 OR NEW.marks_obtained > NEW.max_marks THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation Error: marks_obtained must be between 0 and max_marks';
    END IF;
END //
DELIMITER ;
