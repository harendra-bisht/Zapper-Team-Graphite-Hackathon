import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  CollegeOverview, 
  Course, 
  Semester, 
  Subject, 
  FacultyAssignment, 
  Student, 
  AtRiskRule, 
  GradingScaleItem 
} from '../../types';
import { 
  ShieldCheck, 
  Users, 
  BookOpen, 
  Calendar, 
  Award, 
  AlertTriangle, 
  Sliders, 
  Download, 
  Plus, 
  TrendingUp, 
  FileText, 
  History,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<CollegeOverview | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<FacultyAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [rules, setRules] = useState<AtRiskRule[]>([]);
  const [gradingScale, setGradingScale] = useState<GradingScaleItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'academic' | 'faculty' | 'students' | 'rules' | 'reports'>('overview');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDept, setNewCourseDept] = useState('Computer Science & Engineering');

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubCredits, setNewSubCredits] = useState(4);
  const [newSubSem, setNewSubSem] = useState(5);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignFacultyId, setAssignFacultyId] = useState<number>(0);
  const [assignSubjectId, setAssignSubjectId] = useState<number>(0);
  const [assignSemesterId, setAssignSemesterId] = useState<number>(0);

  // Reports state
  const [perfReport, setPerfReport] = useState<any[]>([]);
  const [defaultersReport, setDefaultersReport] = useState<any[]>([]);
  const [defaulterThreshold, setDefaulterThreshold] = useState(75);

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [
        overviewData,
        coursesData,
        semestersData,
        subjectsData,
        facultyData,
        assignmentsData,
        studentsData,
        rulesData,
        scaleData,
        logsData
      ] = await Promise.all([
        api.getCollegeOverview(),
        api.getCourses(),
        api.getSemesters(),
        api.getSubjects(),
        api.getFaculty(),
        api.getFacultyAssignments(),
        api.getStudents(),
        api.getAtRiskRules(),
        api.getGradingScale(),
        api.getAuditLogs()
      ]);

      setOverview(overviewData);
      setCourses(coursesData);
      setSemesters(semestersData);
      setSubjects(subjectsData);
      setFaculty(facultyData);
      setAssignments(assignmentsData);
      setStudents(studentsData);
      setRules(rulesData);
      setGradingScale(scaleData);
      setAuditLogs(logsData);

      // Pre-load default reports
      const pReport = await api.getSemesterPerformanceReport();
      setPerfReport(pReport);
      const dReport = await api.getAttendanceDefaultersReport(75);
      setDefaultersReport(dReport);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCourse({
        code: newCourseCode,
        name: newCourseName,
        department: newCourseDept
      });
      setShowCourseModal(false);
      setNewCourseCode('');
      setNewCourseName('');
      await loadAllAdminData();
      alert('Course created successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to create course.');
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (courses.length === 0) return;
    try {
      await api.createSubject({
        code: newSubCode,
        name: newSubName,
        course_id: courses[0].id,
        semester_number: newSubSem,
        credits: newSubCredits
      });
      setShowSubjectModal(false);
      setNewSubCode('');
      setNewSubName('');
      await loadAllAdminData();
      alert('Subject created successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to create subject.');
    }
  };

  const handleAssignFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignFacultyId || !assignSubjectId || !assignSemesterId) {
      alert('Please select faculty, subject, and semester.');
      return;
    }
    try {
      await api.assignFaculty(assignFacultyId, assignSubjectId, assignSemesterId, 'A');
      setShowAssignModal(false);
      await loadAllAdminData();
      alert('Faculty allocated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to allocate faculty.');
    }
  };

  const handleUpdateRule = async (ruleId: number, threshold: number, severity: 'High' | 'Medium' | 'Low') => {
    try {
      await api.updateAtRiskRule(ruleId, {
        threshold_value: threshold,
        severity
      });
      await loadAllAdminData();
      alert('Rule threshold updated successfully! Risk engine recalculated.');
    } catch (err: any) {
      alert(err.message || 'Failed to update rule.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Admin Profile Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            University Academic Administration
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Academic Operations &amp; Early Intervention Console
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Logged in as <strong className="text-slate-800">{user?.full_name}</strong> &bull; Complete control over courses, grading rules, allocations, and compliance reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => api.downloadCSV('/api/reports/semester-performance?format=csv', 'college_performance.csv')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export College Marks CSV
          </button>
        </div>
      </div>

      {/* College Metric Cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase">
              <span>Total Students</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">{overview.total_students}</div>
            <p className="mt-1 text-xs text-slate-500">Across {overview.total_courses} programs &bull; {overview.total_subjects} subjects</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase">
              <span>College Attendance</span>
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">{overview.average_attendance}%</div>
            <p className="mt-1 text-xs text-slate-500">Computed via SQL view `v_student_attendance_summary`</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase">
              <span>Average SGPA</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">
              {overview.sgpa_stats.avg_sgpa.toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-slate-500">Range: {overview.sgpa_stats.min_sgpa} to {overview.sgpa_stats.max_sgpa} SGPA</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase">
              <span>Students At-Risk</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-rose-600">{overview.at_risk_count}</div>
            <p className="mt-1 text-xs text-rose-700 font-semibold">{overview.at_risk_percentage}% of total student cohort</p>
          </div>
        </div>
      )}

      {/* Tabs Row */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-1 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            College Analytics
          </button>
          <button
            onClick={() => setActiveTab('academic')}
            className={`py-3 px-1 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'academic'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Courses, Semesters &amp; Subjects ({subjects.length})
          </button>
          <button
            onClick={() => setActiveTab('faculty')}
            className={`py-3 px-1 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'faculty'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Faculty Allocations ({assignments.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`py-3 px-1 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'students'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Student Directory ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-3 px-1 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'rules'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            At-Risk &amp; Grading Rules
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-3 px-1 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'reports'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Reports &amp; Audit Logs
          </button>
        </nav>
      </div>

      {/* Tab 1: College Analytics Overview */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Grade Distribution */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                Aggregated Grade Distribution
              </h3>
              <div className="space-y-3">
                {overview.grade_distribution.map((g) => (
                  <div key={g.estimated_grade} className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-700 w-16">Grade {g.estimated_grade}</span>
                    <div className="flex-1 mx-3 bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          g.estimated_grade === 'F' ? 'bg-rose-500' :
                          g.estimated_grade === 'O' || g.estimated_grade === 'A+' ? 'bg-emerald-500' :
                          'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(g.count * 15, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 w-12 text-right">{g.count} instances</span>
                  </div>
                ))}
              </div>
            </div>

            {/* University 10-Point Scale Reference */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                Configured 10-Point Grading Scale
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="p-2">Grade</th>
                      <th className="p-2">Percentage Band</th>
                      <th className="p-2">Grade Points</th>
                      <th className="p-2">Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {gradingScale.map((s) => (
                      <tr key={s.letter_grade}>
                        <td className="p-2 font-bold">{s.letter_grade}</td>
                        <td className="p-2 font-mono">{s.min_percentage}% - {s.max_percentage}%</td>
                        <td className="p-2 font-bold text-indigo-600">{s.grade_point}</td>
                        <td className="p-2 text-slate-500">{s.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Academic Setup */}
      {activeTab === 'academic' && (
        <div className="space-y-6">
          {/* Courses & Semesters Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Courses &amp; Degree Programs</h3>
                <p className="text-xs text-slate-500">Managed in 3NF `courses` &amp; `semesters` relational tables.</p>
              </div>
              <button
                onClick={() => setShowCourseModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Course
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map((c) => (
                <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {c.code}
                      </span>
                      <h4 className="font-bold text-slate-900 mt-1">{c.name}</h4>
                      <p className="text-xs text-slate-500">{c.department}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-1 rounded border">
                      {c.duration_years} Years ({c.total_semesters} Semesters)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subjects Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Curriculum Subjects</h3>
                <p className="text-xs text-slate-500">Theory, practical labs, credits, and internal/external mark limits.</p>
              </div>
              <button
                onClick={() => setShowSubjectModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Subject
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Subject Code</th>
                    <th className="py-3 px-4">Subject Name</th>
                    <th className="py-3 px-4">Semester</th>
                    <th className="py-3 px-4">Credits</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Max Internal</th>
                    <th className="py-3 px-4">Max External</th>
                    <th className="py-3 px-4">Total Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {subjects.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">{sub.code}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{sub.name}</td>
                      <td className="py-3 px-4 font-mono">Sem {sub.semester_number}</td>
                      <td className="py-3 px-4 font-bold">{sub.credits}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700">
                          {sub.subject_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">{sub.max_internal_marks}</td>
                      <td className="py-3 px-4 font-mono">{sub.max_external_marks}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{sub.total_marks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Faculty Allocations */}
      {activeTab === 'faculty' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Faculty Subject Allocations</h3>
              <p className="text-xs text-slate-500">Enforces RBAC: Faculty can only grade and mark attendance for their assigned subjects.</p>
            </div>
            <button
              onClick={() => {
                if (faculty.length > 0) setAssignFacultyId(faculty[0].faculty_id);
                if (subjects.length > 0) setAssignSubjectId(subjects[0].id);
                if (semesters.length > 0) setAssignSemesterId(semesters[0].id);
                setShowAssignModal(true);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Allocate Subject
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Faculty Professor</th>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Subject Assigned</th>
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {assignments.map((as) => (
                  <tr key={as.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{as.faculty_name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{as.employee_id}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-indigo-700">{as.subject_code}</span> - {as.subject_name}
                    </td>
                    <td className="py-3 px-4">Sem {as.semester_number} ({as.academic_year})</td>
                    <td className="py-3 px-4 font-mono">{as.section}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                        Active Assignment
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Student Roster */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Enrolled Student Cohort</h3>
            <p className="text-xs text-slate-500">Student profiles linked to courses and semester enrollments.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">University Email</th>
                  <th className="py-3 px-4">Degree Program</th>
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Section</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {students.map((st) => (
                  <tr key={st.student_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{st.roll_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{st.full_name}</td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">{st.email}</td>
                    <td className="py-3 px-4 text-xs">{st.course_name}</td>
                    <td className="py-3 px-4 font-mono">Sem {st.semester_number}</td>
                    <td className="py-3 px-4 text-xs">{st.batch}</td>
                    <td className="py-3 px-4 font-mono">{st.section}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: At-Risk & Grading Rules Configurator */}
      {activeTab === 'rules' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              Configurable Early Warning &amp; At-Risk Criteria
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Changes to these threshold parameters update the early detection algorithm dynamically.
            </p>
          </div>

          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{rule.rule_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded font-mono bg-indigo-100 text-indigo-800">
                      {rule.criterion_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 max-w-xl">{rule.description}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold text-slate-600">Threshold:</label>
                    <input
                      type="number"
                      defaultValue={rule.threshold_value}
                      id={`thresh-${rule.id}`}
                      className="w-20 text-xs font-bold py-1.5 px-2 border border-slate-300 rounded-lg text-center"
                    />
                  </div>

                  <button
                    onClick={() => {
                      const input = document.getElementById(`thresh-${rule.id}`) as HTMLInputElement;
                      const val = parseFloat(input?.value || '0');
                      handleUpdateRule(rule.id, val, rule.severity);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Save Threshold
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Reports & Audit Logs */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Semester Performance Report Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Semester Academic Performance Ledger</h3>
                <p className="text-xs text-slate-500">Calculated from View `v_student_semester_summary`</p>
              </div>
              <button
                onClick={() => api.downloadCSV('/api/reports/semester-performance?format=csv', 'semester_performance.csv')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Semester</th>
                    <th className="py-3 px-4">Subjects</th>
                    <th className="py-3 px-4">Credits</th>
                    <th className="py-3 px-4">Marks Scored</th>
                    <th className="py-3 px-4">Percentage</th>
                    <th className="py-3 px-4">Calculated SGPA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {perfReport.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">{r.roll_number}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{r.student_name}</td>
                      <td className="py-3 px-4 font-mono">Sem {r.semester_number}</td>
                      <td className="py-3 px-4 font-mono">{r.total_subjects}</td>
                      <td className="py-3 px-4 font-mono">{r.total_credits}</td>
                      <td className="py-3 px-4 font-mono font-bold">{r.semester_marks_obtained} / {r.semester_max_marks}</td>
                      <td className="py-3 px-4 font-semibold">{r.overall_percentage}%</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.calculated_sgpa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Database Trigger Audit Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                DBMS Trigger Audit Logs (`audit_logs`)
              </h3>
              <p className="text-xs text-slate-500">
                Automatically captured by MySQL trigger `trg_audit_marks_update` whenever mark adjustments are committed.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-mono">
                <thead className="bg-slate-50 text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Log ID</th>
                    <th className="py-2.5 px-3">Table</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Record ID</th>
                    <th className="py-2.5 px-3">Changed By</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400 font-sans text-xs">
                        No audit logs yet. When faculty edits marks, updates are recorded automatically by the database trigger.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-bold">#{log.id}</td>
                        <td className="py-2 px-3">{log.table_name}</td>
                        <td className="py-2 px-3 text-indigo-600 font-bold">{log.action_type}</td>
                        <td className="py-2 px-3">{log.record_id}</td>
                        <td className="py-2 px-3 font-sans text-slate-800">{log.full_name || 'System User'}</td>
                        <td className="py-2 px-3 text-slate-500">{log.timestamp}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Course */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add Degree Program / Course</h3>
              <button onClick={() => setShowCourseModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BTECH-IT"
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value.toUpperCase())}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Course Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B.Tech Information Technology"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Department</label>
                <input
                  type="text"
                  required
                  value={newCourseDept}
                  onChange={(e) => setNewCourseDept(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 font-semibold"
                >
                  Create Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Subject */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add Curriculum Subject</h3>
              <button onClick={() => setShowSubjectModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Subject Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS506"
                  value={newSubCode}
                  onChange={(e) => setNewSubCode(e.target.value.toUpperCase())}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Subject Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud Computing"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={newSubCredits}
                    onChange={(e) => setNewSubCredits(parseInt(e.target.value) || 4)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Semester</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={newSubSem}
                    onChange={(e) => setNewSubSem(parseInt(e.target.value) || 5)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 font-semibold"
                >
                  Add Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Allocate Faculty */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Allocate Faculty to Subject</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignFaculty} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Faculty</label>
                <select
                  value={assignFacultyId}
                  onChange={(e) => setAssignFacultyId(parseInt(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  {faculty.map((f) => (
                    <option key={f.faculty_id} value={f.faculty_id}>
                      {f.full_name} ({f.employee_id}) - {f.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Subject</label>
                <select
                  value={assignSubjectId}
                  onChange={(e) => setAssignSubjectId(parseInt(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name} (Sem {s.semester_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Semester</label>
                <select
                  value={assignSemesterId}
                  onChange={(e) => setAssignSemesterId(parseInt(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      Semester {s.semester_number} ({s.academic_year})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 font-semibold"
                >
                  Allocate Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
