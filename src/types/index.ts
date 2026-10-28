export type Role = 'admin' | 'faculty' | 'student';

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  full_name: string;
  department: string;
  phone?: string;
  student_id?: number;
  roll_number?: string;
  faculty_id?: number;
  employee_id?: string;
  designation?: string;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  department: string;
  duration_years: number;
  total_semesters: number;
}

export interface Semester {
  id: number;
  course_id: number;
  course_code?: string;
  course_name?: string;
  semester_number: number;
  academic_year: string;
  term: 'Odd' | 'Even' | 'Summer';
  is_current: boolean | number;
}

export interface Subject {
  id: number;
  code: string;
  name: string;
  course_id: number;
  course_name?: string;
  semester_number: number;
  credits: number;
  subject_type: 'Theory' | 'Practical' | 'Theory+Practical' | 'Project';
  max_internal_marks: number;
  max_external_marks: number;
  total_marks: number;
}

export interface FacultyAssignment {
  id: number;
  faculty_id: number;
  faculty_name: string;
  employee_id: string;
  subject_id: number;
  subject_code: string;
  subject_name: string;
  credits: number;
  semester_id: number;
  semester_number: number;
  academic_year: string;
  section: string;
}

export interface Student {
  student_id: number;
  user_id: number;
  roll_number: string;
  full_name: string;
  email: string;
  phone?: string;
  department: string;
  course_name: string;
  course_code: string;
  semester_number: number;
  academic_year: string;
  section: string;
  batch: string;
}

export interface MarkRecord {
  id: number;
  student_id: number;
  subject_id: number;
  semester_id: number;
  assessment_type: string;
  max_marks: number;
  marks_obtained: number;
  remarks?: string;
  roll_number?: string;
  student_name?: string;
  subject_code?: string;
  subject_name?: string;
  semester_number?: number;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: number;
  student_id: number;
  subject_id: number;
  date: string;
  session_name: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  notes?: string;
  roll_number?: string;
  student_name?: string;
  subject_code?: string;
  subject_name?: string;
}

export interface AttendanceSummary {
  student_id: number;
  roll_number: string;
  student_name: string;
  subject_id: number;
  subject_code: string;
  subject_name: string;
  total_sessions: number;
  attended_sessions: number;
  absent_sessions: number;
  late_sessions: number;
  attendance_percentage: number;
}

export interface StudentAnalytics {
  student: Student;
  calculated_cgpa: number;
  total_credits_earned: number;
  overall_attendance_pct: number;
  semester_summaries: {
    semester_id: number;
    semester_number: number;
    total_subjects: number;
    total_credits: number;
    semester_max_marks: number;
    semester_marks_obtained: number;
    overall_percentage: number;
    calculated_sgpa: number;
  }[];
  subjects_summary: {
    subject_id: number;
    subject_code: string;
    subject_name: string;
    credits: number;
    total_max_marks: number;
    total_marks_obtained: number;
    percentage: number;
    estimated_grade: string;
    grade_point: number;
    semester_number: number;
  }[];
  attendance_summary: AttendanceSummary[];
  risk_flags: {
    rule: string;
    type: 'ATTENDANCE' | 'INTERNAL_MARKS' | 'SGPA';
    severity: 'High' | 'Medium' | 'Low';
    message: string;
  }[];
  interventions: Intervention[];
}

export interface AtRiskStudent {
  student_id: number;
  roll_number: string;
  student_name: string;
  email: string;
  course_name: string;
  semester_number: number;
  overall_attendance: number;
  current_sgpa: number;
  failed_subjects_count: number;
  severity: 'Critical' | 'High' | 'Medium' | 'None';
  risk_flags: {
    criterion: string;
    value: string;
    threshold: string;
    severity: string;
  }[];
  active_interventions_count: number;
}

export interface Intervention {
  id: number;
  student_id: number;
  faculty_id: number;
  subject_id?: number;
  roll_number?: string;
  student_name?: string;
  faculty_name?: string;
  subject_code?: string;
  subject_name?: string;
  risk_reason: string;
  action_type: 'Remedial Class' | 'One-on-One Counseling' | 'Parent Contact' | 'Peer Tutoring' | 'Assignment Support' | 'Warning Issued';
  action_date: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  notes?: string;
  outcome_remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AtRiskRule {
  id: number;
  rule_name: string;
  criterion_type: 'ATTENDANCE' | 'INTERNAL_MARKS' | 'SGPA';
  threshold_value: number;
  operator: string;
  severity: 'High' | 'Medium' | 'Low';
  description: string;
  is_active: number | boolean;
}

export interface GradingScaleItem {
  id: number;
  letter_grade: string;
  min_percentage: number;
  max_percentage: number;
  grade_point: number;
  description: string;
}

export interface CollegeOverview {
  total_students: number;
  total_faculty: number;
  total_courses: number;
  total_subjects: number;
  average_attendance: number;
  sgpa_stats: {
    avg_sgpa: number;
    max_sgpa: number;
    min_sgpa: number;
  };
  at_risk_count: number;
  at_risk_percentage: number;
  grade_distribution: {
    estimated_grade: string;
    count: number;
  }[];
}
