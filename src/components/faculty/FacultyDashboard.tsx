import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  FacultyAssignment, 
  Student, 
  MarkRecord, 
  AtRiskStudent, 
  Intervention 
} from '../../types';
import { 
  BookOpen, 
  CheckCircle, 
  AlertTriangle, 
  HeartHandshake, 
  Calendar, 
  Save, 
  Users, 
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Plus
} from 'lucide-react';

export const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<FacultyAssignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<FacultyAssignment | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'marks' | 'attendance' | 'at_risk' | 'interventions'>('marks');

  // Marks State
  const [assessmentType, setAssessmentType] = useState('Quiz 1');
  const [maxMarks, setMaxMarks] = useState<number>(20.0);
  const [marksEntries, setMarksEntries] = useState<Record<number, number>>({});
  const [remarksEntries, setRemarksEntries] = useState<Record<number, string>>({});
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [marksError, setMarksError] = useState<string | null>(null);

  // Attendance State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionName, setSessionName] = useState('Regular Lecture');
  const [attendanceStatuses, setAttendanceStatuses] = useState<Record<number, 'Present' | 'Absent' | 'Late' | 'Excused'>>({});
  const [attSaveStatus, setAttSaveStatus] = useState<string | null>(null);

  // At-Risk & Interventions State
  const [atRiskList, setAtRiskList] = useState<AtRiskStudent[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [targetStudent, setTargetStudent] = useState<AtRiskStudent | null>(null);
  const [actionType, setActionType] = useState<any>('One-on-One Counseling');
  const [actionDate, setActionDate] = useState(new Date().toISOString().split('T')[0]);
  const [riskReason, setRiskReason] = useState('');
  const [actionNotes, setActionNotes] = useState('');

  // Selected Intervention for editing/resolving
  const [editingIntervention, setEditingIntervention] = useState<Intervention | null>(null);
  const [updatedStatus, setUpdatedStatus] = useState<'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled'>('In Progress');
  const [outcomeRemarks, setOutcomeRemarks] = useState('');

  useEffect(() => {
    loadFacultyData();
  }, [user]);

  const loadFacultyData = async () => {
    setLoading(true);
    try {
      const assocs = await api.getFacultyAssignments(user?.faculty_id);
      setAssignments(assocs);
      if (assocs.length > 0) {
        setSelectedAssignment(assocs[0]);
        await loadStudentsForSubject(assocs[0].subject_id);
      }
      await loadAtRiskAndInterventions();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsForSubject = async (subjectId: number) => {
    try {
      const stList = await api.getStudents({ subjectId });
      setStudents(stList);

      // Initialize default attendance statuses to Present
      const initialAtt: Record<number, 'Present' | 'Absent' | 'Late' | 'Excused'> = {};
      stList.forEach((s) => {
        initialAtt[s.student_id] = 'Present';
      });
      setAttendanceStatuses(initialAtt);

      // Pre-load existing marks if any
      const existingMarks = await api.getMarks({ subjectId });
      const currentMarks: Record<number, number> = {};
      const currentRemarks: Record<number, string> = {};
      existingMarks
        .filter((m) => m.assessment_type === assessmentType)
        .forEach((m) => {
          currentMarks[m.student_id] = m.marks_obtained;
          if (m.remarks) currentRemarks[m.student_id] = m.remarks;
        });
      setMarksEntries(currentMarks);
      setRemarksEntries(currentRemarks);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAtRiskAndInterventions = async () => {
    try {
      const riskData = await api.getAtRiskStudents();
      setAtRiskList(riskData);
      const invData = await api.getInterventions();
      setInterventions(invData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubjectChange = async (assignment: FacultyAssignment) => {
    setSelectedAssignment(assignment);
    await loadStudentsForSubject(assignment.subject_id);
  };

  const handleAssessmentChange = async (type: string) => {
    setAssessmentType(type);
    let defaultMax = 20.0;
    if (type === 'Mid-Term') defaultMax = 40.0;
    else if (type === 'End-Term' || type === 'Lab Exam') defaultMax = 50.0;
    setMaxMarks(defaultMax);

    if (selectedAssignment) {
      const existingMarks = await api.getMarks({ subjectId: selectedAssignment.subject_id });
      const currentMarks: Record<number, number> = {};
      const currentRemarks: Record<number, string> = {};
      existingMarks
        .filter((m) => m.assessment_type === type)
        .forEach((m) => {
          currentMarks[m.student_id] = m.marks_obtained;
          if (m.remarks) currentRemarks[m.student_id] = m.remarks;
        });
      setMarksEntries(currentMarks);
      setRemarksEntries(currentRemarks);
    }
  };

  const handleSaveMarks = async () => {
    if (!selectedAssignment) return;
    setMarksError(null);
    setSaveStatus(null);

    // Validate inputs
    const recordsToSave = [];
    for (const st of students) {
      const obt = marksEntries[st.student_id];
      if (obt !== undefined && obt !== null && !isNaN(obt)) {
        if (obt < 0 || obt > maxMarks) {
          setMarksError(`Validation Error for ${st.full_name}: Marks must be between 0 and ${maxMarks}.`);
          return;
        }
        recordsToSave.push({
          student_id: st.student_id,
          subject_id: selectedAssignment.subject_id,
          semester_id: selectedAssignment.semester_id,
          assessment_type: assessmentType,
          max_marks: maxMarks,
          marks_obtained: obt,
          remarks: remarksEntries[st.student_id] || ''
        });
      }
    }

    if (recordsToSave.length === 0) {
      setMarksError('No student marks entered to save.');
      return;
    }

    try {
      await api.saveMarks(recordsToSave);
      setSaveStatus(`Successfully saved marks for ${recordsToSave.length} student(s)!`);
      await loadAtRiskAndInterventions();
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: any) {
      setMarksError(err.message || 'Failed to save marks.');
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedAssignment) return;
    setAttSaveStatus(null);

    const records = students.map((s) => ({
      student_id: s.student_id,
      status: attendanceStatuses[s.student_id] || 'Present',
      notes: ''
    }));

    try {
      await api.recordBatchAttendance({
        subject_id: selectedAssignment.subject_id,
        date: attendanceDate,
        session_name: sessionName,
        records
      });
      setAttSaveStatus(`Attendance for ${records.length} students recorded successfully on ${attendanceDate}!`);
      await loadAtRiskAndInterventions();
      setTimeout(() => setAttSaveStatus(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to record attendance.');
    }
  };

  const handleMarkAllAttendance = (status: 'Present' | 'Absent' | 'Late' | 'Excused') => {
    const updated: Record<number, 'Present' | 'Absent' | 'Late' | 'Excused'> = {};
    students.forEach((s) => {
      updated[s.student_id] = status;
    });
    setAttendanceStatuses(updated);
  };

  const handleOpenInterventionModal = (st: AtRiskStudent) => {
    setTargetStudent(st);
    setRiskReason(st.risk_flags.map((f) => `${f.criterion}: ${f.value}`).join('; '));
    setShowInterventionModal(true);
  };

  const handleSaveIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent) return;

    try {
      await api.createIntervention({
        student_id: targetStudent.student_id,
        subject_id: selectedAssignment?.subject_id,
        risk_reason: riskReason,
        action_type: actionType,
        action_date: actionDate,
        status: 'Scheduled',
        notes: actionNotes
      });
      setShowInterventionModal(false);
      setRiskReason('');
      setActionNotes('');
      await loadAtRiskAndInterventions();
      alert('Intervention follow-up logged successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to log intervention.');
    }
  };

  const handleUpdateIntervention = async () => {
    if (!editingIntervention) return;
    try {
      await api.updateIntervention(editingIntervention.id, {
        status: updatedStatus,
        outcome_remarks: outcomeRemarks
      });
      setEditingIntervention(null);
      await loadAtRiskAndInterventions();
      alert('Intervention status updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update intervention.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Faculty Profile Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            Faculty Portal &bull; {user?.department}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {user?.full_name}
          </h1>
          <p className="text-sm text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <span>Employee ID: <strong className="text-slate-800 font-mono">{user?.employee_id || 'FAC-CSE'}</strong></span>
            <span>Designation: <strong className="text-slate-800">{user?.designation || 'Faculty'}</strong></span>
            <span>Allocated Courses: <strong className="text-slate-800">{assignments.length} Course(s)</strong></span>
          </p>
        </div>

        {/* Assigned Subjects Selector Pill */}
        <div className="flex flex-wrap gap-2">
          {assignments.map((as) => (
            <button
              key={as.id}
              onClick={() => handleSubjectChange(as)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedAssignment?.id === as.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{as.subject_code}</span>
              <span className="opacity-75 hidden sm:inline">- {as.subject_name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs Row */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('marks')}
            className={`py-3 px-1 border-b-2 text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'marks'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Marks Entry Matrix
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-3 px-1 border-b-2 text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Attendance Register
          </button>
          <button
            onClick={() => setActiveTab('at_risk')}
            className={`py-3 px-1 border-b-2 text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'at_risk'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            At-Risk Review
            {atRiskList.length > 0 && (
              <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full text-xs font-bold">
                {atRiskList.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('interventions')}
            className={`py-3 px-1 border-b-2 text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'interventions'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            Interventions Log
            {interventions.length > 0 && (
              <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-xs font-bold">
                {interventions.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab 1: Marks Entry */}
      {activeTab === 'marks' && selectedAssignment && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                Grade Entry: {selectedAssignment.subject_code} - {selectedAssignment.subject_name}
              </h2>
              <p className="text-xs text-slate-500">
                Semester {selectedAssignment.semester_number} &bull; Section {selectedAssignment.section} &bull; Enrolled: {students.length} Students
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Assessment Type Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600 uppercase">Assessment:</label>
                <select
                  value={assessmentType}
                  onChange={(e) => handleAssessmentChange(e.target.value)}
                  className="text-xs font-semibold py-1.5 px-3 border border-slate-300 rounded-lg bg-white focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="Quiz 1">Quiz 1 (20 Marks)</option>
                  <option value="Quiz 2">Quiz 2 (20 Marks)</option>
                  <option value="Assignment">Assignment (20 Marks)</option>
                  <option value="Mid-Term">Mid-Term Exam (40 Marks)</option>
                  <option value="Lab Exam">Lab Exam (50 Marks)</option>
                  <option value="End-Term">End-Term Exam (60 Marks)</option>
                </select>
              </div>

              {/* Max Marks */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase">Max:</label>
                <input
                  type="number"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(parseFloat(e.target.value) || 0)}
                  className="w-16 text-xs font-bold py-1.5 px-2 border border-slate-300 rounded-lg text-center"
                />
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveMarks}
                className="py-1.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Commit Marks
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {marksError && (
            <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              {marksError}
            </div>
          )}
          {saveStatus && (
            <div className="m-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {saveStatus}
            </div>
          )}

          {/* Student Marks Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Marks Obtained (Max: {maxMarks})</th>
                  <th className="py-3 px-4">Calculated %</th>
                  <th className="py-3 px-4">Performance Indicator</th>
                  <th className="py-3 px-4">Faculty Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {students.map((st) => {
                  const val = marksEntries[st.student_id];
                  const numVal = val !== undefined ? val : '';
                  const pct = typeof val === 'number' && maxMarks > 0 ? (val / maxMarks) * 100 : null;
                  const isFail = pct !== null && pct < 40;
                  const isExceed = typeof val === 'number' && val > maxMarks;

                  return (
                    <tr key={st.student_id} className={`hover:bg-slate-50/80 transition-colors ${isExceed ? 'bg-rose-50/50' : ''}`}>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{st.roll_number}</td>
                      <td className="py-3 px-4">{st.full_name}</td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={maxMarks}
                          value={numVal}
                          onChange={(e) => {
                            const parsed = parseFloat(e.target.value);
                            setMarksEntries({
                              ...marksEntries,
                              [st.student_id]: isNaN(parsed) ? (e.target.value as any) : parsed
                            });
                          }}
                          className={`w-24 px-2.5 py-1.5 border rounded-lg text-sm font-bold text-center ${
                            isExceed ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-300 focus:ring-emerald-500'
                          }`}
                          placeholder="0.0"
                        />
                      </td>
                      <td className="py-3 px-4">
                        {pct !== null ? (
                          <span className={`font-semibold ${isFail ? 'text-rose-600' : 'text-slate-800'}`}>
                            {pct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {pct === null ? (
                          <span className="text-xs text-slate-400">Not recorded</span>
                        ) : isFail ? (
                          <span className="text-xs px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            Below Pass Cutoff (&lt;40%)
                          </span>
                        ) : pct >= 80 ? (
                          <span className="text-xs px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Distinction
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                            Satisfactory
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={remarksEntries[st.student_id] || ''}
                          onChange={(e) => {
                            setRemarksEntries({
                              ...remarksEntries,
                              [st.student_id]: e.target.value
                            });
                          }}
                          placeholder="Optional notes..."
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Attendance Register */}
      {activeTab === 'attendance' && selectedAssignment && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                Attendance Registry: {selectedAssignment.subject_code} - {selectedAssignment.subject_name}
              </h2>
              <p className="text-xs text-slate-500">
                Mark daily presence, absence, and late arrivals for university records.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Date */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase">Date:</label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="text-xs font-semibold py-1.5 px-3 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              {/* Session Name */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase">Session:</label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="text-xs font-semibold py-1.5 px-2.5 border border-slate-300 rounded-lg bg-white w-32"
                />
              </div>

              {/* Mark All Present */}
              <button
                onClick={() => handleMarkAllAttendance('Present')}
                className="py-1.5 px-3 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                Mark All Present
              </button>

              {/* Save Button */}
              <button
                onClick={handleSaveAttendance}
                className="py-1.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Commit Attendance
              </button>
            </div>
          </div>

          {attSaveStatus && (
            <div className="m-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {attSaveStatus}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4 text-center">Status Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {students.map((st) => {
                  const status = attendanceStatuses[st.student_id] || 'Present';

                  return (
                    <tr key={st.student_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{st.roll_number}</td>
                      <td className="py-3 px-4">{st.full_name}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center items-center gap-2">
                          {(['Present', 'Absent', 'Late', 'Excused'] as const).map((s) => {
                            const isSelected = status === s;
                            let style = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
                            if (isSelected) {
                              if (s === 'Present') style = 'bg-emerald-600 text-white shadow-sm';
                              if (s === 'Absent') style = 'bg-rose-600 text-white shadow-sm';
                              if (s === 'Late') style = 'bg-amber-600 text-white shadow-sm';
                              if (s === 'Excused') style = 'bg-blue-600 text-white shadow-sm';
                            }
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() =>
                                  setAttendanceStatuses({
                                    ...attendanceStatuses,
                                    [st.student_id]: s
                                  })
                                }
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${style}`}
                              >
                                {s}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: At-Risk Students Review */}
      {activeTab === 'at_risk' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  At-Risk Academic Detection
                </h2>
                <p className="text-xs text-slate-500">
                  Flagged transparently against configurable criteria: Attendance &lt; 75%, Internal Marks &lt; 40%, or SGPA &lt; 5.0
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
                {atRiskList.length} Student(s) Require Follow-up
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Risk Severity</th>
                    <th className="py-3 px-4">Attendance</th>
                    <th className="py-3 px-4">Current SGPA</th>
                    <th className="py-3 px-4">Triggered Criteria</th>
                    <th className="py-3 px-4">Active Support</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {atRiskList.map((st) => (
                    <tr key={st.student_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{st.student_name}</div>
                        <div className="text-xs text-slate-500 font-mono">{st.roll_number}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-extrabold ${
                          st.severity === 'Critical' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                          st.severity === 'High' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {st.severity} Risk
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`font-bold ${st.overall_attendance < 75 ? 'text-rose-600' : 'text-slate-800'}`}>
                          {st.overall_attendance}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{st.current_sgpa}</td>
                      <td className="py-3.5 px-4">
                        <ul className="text-xs space-y-0.5">
                          {st.risk_flags.map((f, idx) => (
                            <li key={idx} className="text-slate-600">
                              &bull; <strong className="text-slate-800">{f.criterion}:</strong> {f.value}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-medium text-slate-600">
                          {st.active_interventions_count} Active
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleOpenInterventionModal(st)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Intervention
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Interventions Log */}
      {activeTab === 'interventions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Recorded Faculty Interventions</h2>
              <p className="text-xs text-slate-500">Track counseling, remedial classes, and parent communication.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notes &amp; Outcomes</th>
                  <th className="py-3 px-4">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {interventions.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{inv.student_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{inv.roll_number}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{inv.action_type}</td>
                    <td className="py-3.5 px-4 text-xs font-mono">{inv.action_date}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">{inv.subject_code || 'General'}</td>
                    <td className="py-3.5 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        inv.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        inv.status === 'In Progress' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' :
                        'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs text-xs text-slate-600 truncate">
                      {inv.notes}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => {
                          setEditingIntervention(inv);
                          setUpdatedStatus(inv.status);
                          setOutcomeRemarks(inv.outcome_remarks || '');
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Record New Intervention */}
      {showInterventionModal && targetStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-indigo-600" />
                Schedule Student Intervention
              </h3>
              <button onClick={() => setShowInterventionModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIntervention} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Student</label>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-bold">
                  {targetStudent.student_name} ({targetStudent.roll_number})
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Risk Reasons</label>
                <input
                  type="text"
                  required
                  value={riskReason}
                  onChange={(e) => setRiskReason(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Action Type</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="One-on-One Counseling">One-on-One Counseling</option>
                    <option value="Remedial Class">Remedial Class</option>
                    <option value="Parent Contact">Parent Contact</option>
                    <option value="Peer Tutoring">Peer Tutoring</option>
                    <option value="Assignment Support">Assignment Support</option>
                    <option value="Warning Issued">Warning Issued</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={actionDate}
                    onChange={(e) => setActionDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Faculty Notes &amp; Plan</label>
                <textarea
                  rows={3}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Outline the planned support or discussion points..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInterventionModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 font-semibold"
                >
                  Save Intervention Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Existing Intervention */}
      {editingIntervention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">Update Intervention Status</h3>
              <button onClick={() => setEditingIntervention(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Student</label>
                <div className="p-2 rounded bg-slate-50 border text-slate-800 font-bold">
                  {editingIntervention.student_name} ({editingIntervention.action_type})
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status</label>
                <select
                  value={updatedStatus}
                  onChange={(e) => setUpdatedStatus(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Follow-up Outcome Remarks</label>
                <textarea
                  rows={3}
                  value={outcomeRemarks}
                  onChange={(e) => setOutcomeRemarks(e.target.value)}
                  placeholder="Record outcome of the counseling, student response, progress..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingIntervention(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleUpdateIntervention}
                  className="px-4 py-2 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 font-semibold"
                >
                  Commit Status Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
