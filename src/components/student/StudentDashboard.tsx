import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { StudentAnalytics } from '../../types';
import { 
  Award, 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  GraduationCap, 
  FileText,
  User,
  HeartHandshake
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'marks' | 'attendance' | 'interventions'>('overview');

  useEffect(() => {
    if (user?.student_id) {
      loadStudentData(user.student_id);
    }
  }, [user]);

  const loadStudentData = async (studentId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStudentAnalytics(studentId);
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load performance analytics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
          {error || 'Unable to load student record.'}
        </div>
      </div>
    );
  }

  const { student, calculated_cgpa, total_credits_earned, overall_attendance_pct, semester_summaries, subjects_summary, attendance_summary, risk_flags, interventions } = analytics;
  const isAttendanceLow = overall_attendance_pct < 75.0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Student Welcome & Profile Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4" />
            {student.course_name} ({student.course_code})
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {student.full_name}!
          </h1>
          <p className="text-sm text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <span>Roll Number: <strong className="text-slate-800 font-mono">{student.roll_number}</strong></span>
            <span>Current Semester: <strong className="text-slate-800">Semester {student.semester_number} ({student.academic_year})</strong></span>
            <span>Batch: <strong className="text-slate-800">{student.batch}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Section {student.section}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active Enrollment
          </span>
        </div>
      </div>

      {/* Critical Early Warning Alert (if any risk criteria triggered) */}
      {risk_flags && risk_flags.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-semibold text-amber-900 text-sm">
                Academic Support Advisory
              </h3>
              <p className="text-xs text-amber-800">
                Our early detection system noted areas that need attention to ensure you remain eligible for semester examinations:
              </p>
              <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5 pt-1">
                {risk_flags.map((flag, idx) => (
                  <li key={idx}>
                    <strong>{flag.rule}:</strong> {flag.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cumulative GPA (CGPA) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cumulative CGPA
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {calculated_cgpa.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ 10.0 scale</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Aggregated across all completed semesters
          </p>
        </div>

        {/* Current SGPA */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Semester SGPA
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {semester_summaries.length > 0
                ? semester_summaries[semester_summaries.length - 1].calculated_sgpa.toFixed(2)
                : '0.00'}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">Sem {student.semester_number}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Weighted Grade Points &times; Credits
          </p>
        </div>

        {/* Overall Attendance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overall Attendance
            </span>
            <div className={`p-2 rounded-xl ${isAttendanceLow ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${isAttendanceLow ? 'text-rose-600' : 'text-slate-900'}`}>
              {overall_attendance_pct}%
            </span>
            <span className="text-xs text-slate-400">Min 75% required</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${isAttendanceLow ? 'bg-rose-500' : 'bg-emerald-500'}`} 
              style={{ width: `${Math.min(overall_attendance_pct, 100)}%` }}
            />
          </div>
        </div>

        {/* Total Credits */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Credits Earned
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {total_credits_earned}
            </span>
            <span className="text-xs text-slate-400">Credits Completed</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Degree requirements tracked in 3NF schema
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-1 border-b-2 text-sm font-semibold transition-colors ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Performance Overview
          </button>
          <button
            onClick={() => setActiveTab('marks')}
            className={`py-3 px-1 border-b-2 text-sm font-semibold transition-colors ${
              activeTab === 'marks'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Subject Marks &amp; Grades
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-3 px-1 border-b-2 text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Attendance Breakdown
            {isAttendanceLow && (
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('interventions')}
            className={`py-3 px-1 border-b-2 text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'interventions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Academic Support &amp; Actions
            {interventions.length > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-full font-bold">
                {interventions.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Semester Progress Progression Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Semester Progression (SGPA Trend)
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {semester_summaries.map((sem) => (
                <div key={sem.semester_id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="text-xs font-semibold text-slate-500 uppercase">
                    Semester {sem.semester_number}
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-800">
                    {sem.calculated_sgpa.toFixed(2)} SGPA
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {sem.total_credits} Credits &bull; {sem.overall_percentage}% marks
                  </div>
                  <div className="mt-3 w-full bg-slate-200 rounded-full h-1.5">
                    <div 
                      className="bg-indigo-600 h-1.5 rounded-full" 
                      style={{ width: `${(sem.calculated_sgpa / 10.0) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Subject Summary Cards */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Current Semester Coursework Status
            </h3>
            <div className="divide-y divide-slate-100">
              {subjects_summary.map((sub) => (
                <div key={sub.subject_id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sm text-slate-900">
                      {sub.subject_code} - {sub.subject_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {sub.credits} Credits &bull; Marks: {sub.total_marks_obtained} / {sub.total_max_marks} ({sub.percentage}%)
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-md font-bold ${
                      sub.percentage < 40 ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                      sub.percentage >= 80 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                      'bg-indigo-100 text-indigo-800 border border-indigo-300'
                    }`}>
                      Grade {sub.estimated_grade} ({sub.grade_point} GP)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Marks Table */}
      {activeTab === 'marks' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Continuous Academic Assessments</h3>
              <p className="text-xs text-slate-500">Detailed breakdown calculated via Database View `v_student_subject_marks`</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Credits</th>
                  <th className="py-3 px-4">Max Marks</th>
                  <th className="py-3 px-4">Marks Scored</th>
                  <th className="py-3 px-4">Score %</th>
                  <th className="py-3 px-4">Letter Grade</th>
                  <th className="py-3 px-4">Grade Point</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {subjects_summary.map((sub) => (
                  <tr key={sub.subject_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{sub.subject_code}</div>
                      <div className="text-xs text-slate-500">{sub.subject_name}</div>
                    </td>
                    <td className="py-3.5 px-4">{sub.credits}</td>
                    <td className="py-3.5 px-4 font-mono">{sub.total_max_marks}</td>
                    <td className="py-3.5 px-4 font-bold font-mono text-slate-900">{sub.total_marks_obtained}</td>
                    <td className="py-3.5 px-4">
                      <span className={`font-semibold ${sub.percentage < 40 ? 'text-rose-600' : 'text-slate-800'}`}>
                        {sub.percentage}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        sub.percentage >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        sub.percentage >= 50 ? 'bg-indigo-100 text-indigo-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {sub.estimated_grade}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{sub.grade_point}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Attendance Breakdown */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Course-wise Attendance Ledger</h3>
                <p className="text-xs text-slate-500">Aggregated via Database View `v_student_attendance_summary`</p>
              </div>
              <div className="text-xs text-slate-600">
                Minimum Eligibility Threshold: <strong className="text-slate-900">75%</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Total Sessions</th>
                    <th className="py-3 px-4">Present / Excused</th>
                    <th className="py-3 px-4">Absent</th>
                    <th className="py-3 px-4">Late</th>
                    <th className="py-3 px-4">Attendance %</th>
                    <th className="py-3 px-4">Exam Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {attendance_summary.map((att) => {
                    const isBelow = att.attendance_percentage < 75.0;
                    return (
                      <tr key={att.subject_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{att.subject_code}</div>
                          <div className="text-xs text-slate-500">{att.subject_name}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono">{att.total_sessions}</td>
                        <td className="py-3.5 px-4 font-mono text-emerald-700 font-medium">{att.attended_sessions}</td>
                        <td className="py-3.5 px-4 font-mono text-rose-700 font-medium">{att.absent_sessions}</td>
                        <td className="py-3.5 px-4 font-mono text-amber-700 font-medium">{att.late_sessions}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${isBelow ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {att.attendance_percentage}%
                            </span>
                            <div className="w-16 bg-slate-200 rounded-full h-1.5 hidden sm:block">
                              <div 
                                className={`h-1.5 rounded-full ${isBelow ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(att.attendance_percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {isBelow ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-500" /> At-Risk
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Eligible
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Interventions & Support */}
      {activeTab === 'interventions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-indigo-600" />
              Faculty Academic Support &amp; Follow-up Actions
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Personalized interventions scheduled by your course instructors to help you succeed.
            </p>
          </div>

          {interventions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No interventions currently active. Keep up the good performance!
            </div>
          ) : (
            <div className="space-y-3">
              {interventions.map((inv) => (
                <div key={inv.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">{inv.action_type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        inv.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                        inv.status === 'In Progress' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Date: {inv.action_date}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700">
                    <strong className="text-slate-900">Faculty In-charge:</strong> {inv.faculty_name}
                    {inv.subject_name && <span> ({inv.subject_name})</span>}
                  </p>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600">
                    <div className="font-semibold text-slate-800 mb-0.5">Faculty Notes:</div>
                    {inv.notes || 'No specific notes provided.'}
                  </div>

                  {inv.outcome_remarks && (
                    <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-800">
                      <div className="font-semibold text-emerald-900 mb-0.5">Follow-up Outcome:</div>
                      {inv.outcome_remarks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
