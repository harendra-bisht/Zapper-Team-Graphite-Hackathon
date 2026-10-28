import {
  User,
  Course,
  Semester,
  Subject,
  FacultyAssignment,
  Student,
  MarkRecord,
  AttendanceRecord,
  AttendanceSummary,
  StudentAnalytics,
  AtRiskStudent,
  Intervention,
  AtRiskRule,
  GradingScaleItem,
  CollegeOverview
} from '../types';

const API_BASE = '/api';

function getAuthToken(): string | null {
  return localStorage.getItem('spams_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('spams_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('spams_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.error || errJson.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text() as unknown as T;
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async getMe(): Promise<{ user: User }> {
    return request('/auth/me');
  },

  // Courses & Semesters
  async getCourses(): Promise<Course[]> {
    return request('/courses');
  },

  async createCourse(data: Partial<Course>): Promise<{ message: string; course_id: number }> {
    return request('/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getSemesters(courseId?: number): Promise<Semester[]> {
    const query = courseId ? `?course_id=${courseId}` : '';
    return request(`/semesters${query}`);
  },

  async createSemester(data: Partial<Semester>): Promise<{ message: string; semester_id: number }> {
    return request('/semesters', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Subjects
  async getSubjects(courseId?: number, semesterNumber?: number): Promise<Subject[]> {
    const params = new URLSearchParams();
    if (courseId) params.append('course_id', courseId.toString());
    if (semesterNumber) params.append('semester_number', semesterNumber.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/subjects${query}`);
  },

  async createSubject(data: Partial<Subject>): Promise<{ message: string; subject_id: number }> {
    return request('/subjects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Faculty & Allocations
  async getFaculty(): Promise<any[]> {
    return request('/faculty');
  },

  async getFacultyAssignments(facultyId?: number, semesterId?: number): Promise<FacultyAssignment[]> {
    const params = new URLSearchParams();
    if (facultyId) params.append('faculty_id', facultyId.toString());
    if (semesterId) params.append('semester_id', semesterId.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/faculty/assignments${query}`);
  },

  async assignFaculty(facultyId: number, subjectId: number, semesterId: number, section = 'A'): Promise<any> {
    return request('/faculty/assignments', {
      method: 'POST',
      body: JSON.stringify({ faculty_id: facultyId, subject_id: subjectId, semester_id: semesterId, section }),
    });
  },

  // Students
  async getStudents(filters: { courseId?: number; semesterId?: number; subjectId?: number } = {}): Promise<Student[]> {
    const params = new URLSearchParams();
    if (filters.courseId) params.append('course_id', filters.courseId.toString());
    if (filters.semesterId) params.append('semester_id', filters.semesterId.toString());
    if (filters.subjectId) params.append('subject_id', filters.subjectId.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/students${query}`);
  },

  // Marks Management
  async getMarks(filters: { studentId?: number; subjectId?: number; semesterId?: number } = {}): Promise<MarkRecord[]> {
    const params = new URLSearchParams();
    if (filters.studentId) params.append('student_id', filters.studentId.toString());
    if (filters.subjectId) params.append('subject_id', filters.subjectId.toString());
    if (filters.semesterId) params.append('semester_id', filters.semesterId.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/marks${query}`);
  },

  async saveMarks(records: Partial<MarkRecord>[]): Promise<{ message: string }> {
    return request('/marks', {
      method: 'POST',
      body: JSON.stringify(records),
    });
  },

  // Attendance Management
  async getAttendance(filters: { studentId?: number; subjectId?: number; date?: string } = {}): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    if (filters.studentId) params.append('student_id', filters.studentId.toString());
    if (filters.subjectId) params.append('subject_id', filters.subjectId.toString());
    if (filters.date) params.append('date', filters.date);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/attendance${query}`);
  },

  async getAttendanceSummary(filters: { studentId?: number; subjectId?: number } = {}): Promise<AttendanceSummary[]> {
    const params = new URLSearchParams();
    if (filters.studentId) params.append('student_id', filters.studentId.toString());
    if (filters.subjectId) params.append('subject_id', filters.subjectId.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/attendance/summary${query}`);
  },

  async recordBatchAttendance(data: {
    subject_id: number;
    date: string;
    session_name: string;
    records: { student_id: number; status: string; notes?: string }[];
  }): Promise<{ message: string }> {
    return request('/attendance/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Performance Analytics
  async getStudentAnalytics(studentId: number): Promise<StudentAnalytics> {
    return request(`/analytics/student/${studentId}`);
  },

  async getCollegeOverview(): Promise<CollegeOverview> {
    return request('/analytics/college-overview');
  },

  async getGradingScale(): Promise<GradingScaleItem[]> {
    return request('/analytics/grading-scale');
  },

  // At-Risk Detection
  async getAtRiskStudents(courseId?: number, semesterId?: number): Promise<AtRiskStudent[]> {
    const params = new URLSearchParams();
    if (courseId) params.append('course_id', courseId.toString());
    if (semesterId) params.append('semester_id', semesterId.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/at-risk/students${query}`);
  },

  async getAtRiskRules(): Promise<AtRiskRule[]> {
    return request('/at-risk/rules');
  },

  async updateAtRiskRule(ruleId: number, data: Partial<AtRiskRule>): Promise<{ message: string }> {
    return request(`/at-risk/rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Faculty Interventions
  async getInterventions(filters: { studentId?: number; facultyId?: number; status?: string } = {}): Promise<Intervention[]> {
    const params = new URLSearchParams();
    if (filters.studentId) params.append('student_id', filters.studentId.toString());
    if (filters.facultyId) params.append('faculty_id', filters.facultyId.toString());
    if (filters.status) params.append('status', filters.status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/interventions${query}`);
  },

  async createIntervention(data: Partial<Intervention>): Promise<{ message: string; intervention_id: number }> {
    return request('/interventions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateIntervention(id: number, data: Partial<Intervention>): Promise<{ message: string }> {
    return request(`/interventions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Reports & Exports
  async getSemesterPerformanceReport(semesterId?: number): Promise<any[]> {
    const query = semesterId ? `?semester_id=${semesterId}` : '';
    return request(`/reports/semester-performance${query}`);
  },

  async getAttendanceDefaultersReport(threshold = 75, subjectId?: number): Promise<any[]> {
    const params = new URLSearchParams();
    params.append('threshold', threshold.toString());
    if (subjectId) params.append('subject_id', subjectId.toString());
    return request(`/reports/attendance-defaulters?${params.toString()}`);
  },

  async getAuditLogs(): Promise<any[]> {
    return request('/reports/audit-logs');
  },

  downloadCSV(url: string, filename: string) {
    const token = getAuthToken();
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = filename;
        link.click();
      });
  },
};
