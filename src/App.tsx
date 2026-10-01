import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Navbar } from './components/Navbar';
import { StudentPortal } from './components/StudentPortal';
import { AssessmentExam } from './components/AssessmentExam';
import { StudentResultView } from './components/StudentResultView';
import { TeacherDashboard } from './components/TeacherDashboard';
import { TeacherLoginModal } from './components/TeacherLoginModal';
import { Attempt, AttemptHistoryItem, Student, AnswerValue } from './types';
import { STUDENTS_LIST } from './data/assessmentData';
import { 
  fetchAllAttempts, 
  fetchStudentAttempt, 
  startStudentAttempt, 
  saveAttemptProgress, 
  submitStudentAttempt,
  fetchAttemptHistory
} from './api/client';

export default function App() {
  const [currentView, setCurrentView] = useState<'student' | 'teacher'>('student');
  const [studentSubView, setStudentSubView] = useState<'portal' | 'exam' | 'result'>('portal');

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<Attempt | null>(null);
  const [attemptsMap, setAttemptsMap] = useState<Record<string, Attempt>>({});
  const [historyList, setHistoryList] = useState<AttemptHistoryItem[]>([]);

  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('guru_auth') === 'true';
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingAttempt, setIsLoadingAttempt] = useState(false);

  // Sync data from server
  const syncServerData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [allAttempts, history] = await Promise.all([
        fetchAllAttempts(),
        fetchAttemptHistory(),
      ]);
      setAttemptsMap(allAttempts || {});
      setHistoryList(history || []);

      // If a student is currently selected, refresh their active attempt
      if (selectedStudent) {
        const studentAtt = allAttempts[String(selectedStudent.id)] || null;
        setCurrentAttempt(studentAtt);
      }
    } catch (err) {
      console.warn('Network sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [selectedStudent]);

  // Initial load and periodic polling (every 10s for multi-device sync)
  useEffect(() => {
    syncServerData();
    const interval = setInterval(syncServerData, 10000);
    return () => clearInterval(interval);
  }, [syncServerData]);

  // Handle student selection
  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setIsLoadingAttempt(true);
    try {
      const att = await fetchStudentAttempt(student.id);
      setCurrentAttempt(att);
      setStudentSubView('portal');
    } catch (err) {
      console.error('Error fetching student attempt:', err);
    } finally {
      setIsLoadingAttempt(false);
    }
  };

  // Start assessment
  const handleStartAssessment = async () => {
    if (!selectedStudent) return;
    setIsLoadingAttempt(true);
    try {
      const att = await startStudentAttempt(selectedStudent.id, selectedStudent.name);
      setCurrentAttempt(att);
      setStudentSubView('exam');
    } catch (err) {
      alert('Gagal memulai asesmen: ' + err);
    } finally {
      setIsLoadingAttempt(false);
    }
  };

  // View completed assessment result
  const handleViewResult = () => {
    if (currentAttempt && currentAttempt.status === 'completed') {
      setStudentSubView('result');
    }
  };

  // Save in-progress answers
  const handleSaveProgress = async (
    answers: Record<number, AnswerValue>,
    activeIndex: number,
    durationSeconds: number
  ) => {
    if (!selectedStudent) return;
    await saveAttemptProgress(selectedStudent.id, answers, activeIndex, durationSeconds);
  };

  // Submit assessment
  const handleSubmitAttempt = async (
    answers: Record<number, AnswerValue>,
    durationSeconds: number
  ) => {
    if (!selectedStudent) return;
    const completed = await submitStudentAttempt(selectedStudent.id, answers, durationSeconds);
    setCurrentAttempt(completed);
    setAttemptsMap((prev) => ({
      ...prev,
      [String(selectedStudent.id)]: completed,
    }));

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // ignore
    }

    setStudentSubView('result');
  };

  // Teacher navigation switch
  const handleSwitchToTeacher = () => {
    if (isTeacherAuthenticated) {
      setCurrentView('teacher');
    } else {
      setIsTeacherModalOpen(true);
    }
  };

  const handleTeacherLoginSuccess = () => {
    setIsTeacherAuthenticated(true);
    sessionStorage.setItem('guru_auth', 'true');
    setIsTeacherModalOpen(false);
    setCurrentView('teacher');
  };

  const handleTeacherLogout = () => {
    setIsTeacherAuthenticated(false);
    sessionStorage.removeItem('guru_auth');
    setCurrentView('student');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Global Navbar */}
      <Navbar
        currentView={currentView}
        onSwitchToTeacher={handleSwitchToTeacher}
        onSwitchToStudent={() => {
          setCurrentView('student');
          setStudentSubView('portal');
        }}
        isTeacherAuthenticated={isTeacherAuthenticated}
        onSync={syncServerData}
        isSyncing={isSyncing}
      />

      {/* Main Content Router */}
      <main className="flex-1">
        {currentView === 'teacher' ? (
          <TeacherDashboard
            attemptsMap={attemptsMap}
            historyList={historyList}
            onRefresh={syncServerData}
            onLogout={handleTeacherLogout}
            isSyncing={isSyncing}
          />
        ) : (
          <>
            {studentSubView === 'portal' && (
              <StudentPortal
                students={STUDENTS_LIST}
                selectedStudent={selectedStudent}
                onSelectStudent={handleSelectStudent}
                currentAttempt={currentAttempt}
                onStartAssessment={handleStartAssessment}
                onViewResult={handleViewResult}
                isLoading={isLoadingAttempt}
              />
            )}

            {studentSubView === 'exam' && currentAttempt && (
              <AssessmentExam
                attempt={currentAttempt}
                onSaveProgress={handleSaveProgress}
                onSubmitAttempt={handleSubmitAttempt}
                onExit={() => setStudentSubView('portal')}
              />
            )}

            {studentSubView === 'result' && currentAttempt && (
              <StudentResultView
                attempt={currentAttempt}
                onBackToHome={() => setStudentSubView('portal')}
              />
            )}
          </>
        )}
      </main>

      {/* Teacher Authentication Modal */}
      <TeacherLoginModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        onSuccess={handleTeacherLoginSuccess}
      />

      {/* Footer Branding */}
      <footer className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">
          ASESMEN SUMATIF KELAS V SDN 11 ANGGREK • KURIKULUM MERDEKA FASE C
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Guru Pengampu: SULTRIYANTI POU S.Pd. • Sistem Penilaian Berbasis Komputer & Analisis Capaian Pembelajaran
        </p>
      </footer>
    </div>
  );
}
