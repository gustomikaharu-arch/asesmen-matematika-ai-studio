import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileSpreadsheet, 
  Search, 
  FileText, 
  Layers, 
  BarChart3, 
  History, 
  Lightbulb, 
  Eye, 
  Download, 
  RotateCcw, 
  RefreshCw, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowUpDown, 
  ChevronRight,
  Sparkles,
  Sliders,
  X,
  FileCheck
} from 'lucide-react';
import { Attempt, AttemptHistoryItem, Student, Question } from '../types';
import { ASSESSMENT_INFO, QUESTIONS, STUDENTS_LIST, TP_LIST, getTPCategory } from '../data/assessmentData';
import { generateTeacherTPAnalysisPdf, generateStudentWorkPdf } from '../utils/pdfGenerator';
import { exportAnalysisToExcelCsv } from '../utils/excelExporter';
import { resetStudent, overrideQuestionScore, seedDemoData } from '../api/client';
import { PdfPreviewModal } from './PdfPreviewModal';

interface TeacherDashboardProps {
  attemptsMap: Record<string, Attempt>;
  historyList: AttemptHistoryItem[];
  onRefresh: () => Promise<void>;
  onLogout: () => void;
  isSyncing: boolean;
}

type TabType = 
  | 'dashboard' 
  | 'daftar_nilai' 
  | 'daftar_siswa' 
  | 'analisis_tp' 
  | 'analisis_nilai' 
  | 'analisis_soal' 
  | 'riwayat' 
  | 'refleksi';

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  attemptsMap,
  historyList,
  onRefresh,
  onLogout,
  isSyncing,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Attempt | null>(null);
  const [resetModalStudent, setResetModalStudent] = useState<Student | null>(null);
  const [resetReason, setResetReason] = useState('Diminta oleh siswa untuk perbaikan asesmen');
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [isResetting, setIsResetting] = useState(false);
  const [previewPdfDoc, setPreviewPdfDoc] = useState<any | null>(null);
  const [previewPdfTitle, setPreviewPdfTitle] = useState('');
  const [essayEditModal, setEssayEditModal] = useState<{ attempt: Attempt; question: Question } | null>(null);
  const [overrideScoreVal, setOverrideScoreVal] = useState<number>(0);

  // Filter out Fery Kaharu if present in calculation as per instruction
  const validStudents = useMemo(() => {
    return STUDENTS_LIST.filter((s) => !s.name.toUpperCase().includes('FERY KAHARU'));
  }, []);

  // Compute key analytics
  const completedAttempts = useMemo(() => {
    return validStudents
      .map((s) => attemptsMap[String(s.id)])
      .filter((a): a is Attempt => Boolean(a && a.status === 'completed'));
  }, [validStudents, attemptsMap]);

  const inProgressAttempts = useMemo(() => {
    return validStudents
      .map((s) => attemptsMap[String(s.id)])
      .filter((a): a is Attempt => Boolean(a && a.status === 'in_progress'));
  }, [validStudents, attemptsMap]);

  const totalClass = validStudents.length;
  const totalCompleted = completedAttempts.length;
  const completionRate = totalClass > 0 ? Math.round((totalCompleted / totalClass) * 100) : 0;

  const averageFinalScore = useMemo(() => {
    if (completedAttempts.length === 0) return 0;
    const sum = completedAttempts.reduce((acc, curr) => acc + (curr.finalScore ?? 0), 0);
    return Math.round((sum / completedAttempts.length) * 10) / 10;
  }, [completedAttempts]);

  const passedStudentsCount = useMemo(() => {
    return completedAttempts.filter((a) => (a.finalScore ?? 0) >= 70).length;
  }, [completedAttempts]);

  const passRate = totalCompleted > 0 ? Math.round((passedStudentsCount / totalCompleted) * 100) : 0;

  // Filtered students list for search
  const filteredStudents = useMemo(() => {
    return validStudents.filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [validStudents, searchQuery]);

  // Handle Export Excel
  const handleExportExcel = () => {
    exportAnalysisToExcelCsv(attemptsMap);
  };

  // Handle Download PDF Analisis Guru
  const handleDownloadTeacherPdf = () => {
    const doc = generateTeacherTPAnalysisPdf(attemptsMap);
    doc.save(`Analisis_Guru_SDN11_Anggrek_Kelas_V_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Handle Preview Analisis PDF
  const handlePreviewTeacherPdf = () => {
    const doc = generateTeacherTPAnalysisPdf(attemptsMap);
    setPreviewPdfDoc(doc);
    setPreviewPdfTitle(`Format Analisis Hasil Penilaian per TP - ${ASSESSMENT_INFO.school}`);
  };

  // Handle Reset Flow (Two-stage confirmation)
  const handleStartReset = (student: Student) => {
    setResetModalStudent(student);
    setResetStep(1);
    setResetReason('Diberikan kesempatan ulang oleh guru');
  };

  const handleConfirmReset = async () => {
    if (!resetModalStudent) return;
    setIsResetting(true);
    try {
      await resetStudent(resetModalStudent.id, resetReason);
      await onRefresh();
      setResetModalStudent(null);
      if (selectedStudentForDetail?.studentId === resetModalStudent.id) {
        setSelectedStudentForDetail(null);
      }
    } catch (err) {
      alert('Gagal mereset siswa: ' + err);
    } finally {
      setIsResetting(false);
    }
  };

  // Handle Override Essay Score
  const handleSaveScoreOverride = async () => {
    if (!essayEditModal) return;
    try {
      const updated = await overrideQuestionScore(
        essayEditModal.attempt.studentId,
        essayEditModal.question.id,
        overrideScoreVal
      );
      await onRefresh();
      setSelectedStudentForDetail(updated);
      setEssayEditModal(null);
    } catch (err) {
      alert('Gagal mengubah nilai: ' + err);
    }
  };

  // Helper for item analysis (Analisis Soal)
  const questionAnalytics = useMemo(() => {
    return QUESTIONS.map((q) => {
      let totalEarnedScore = 0;
      let fullCorrectCount = 0;

      completedAttempts.forEach((att) => {
        const gr = att.questionGradings?.[q.id];
        if (gr) {
          totalEarnedScore += gr.score;
          if (gr.score === q.maxScore) fullCorrectCount += 1;
        }
      });

      const totalPossible = completedAttempts.length * q.maxScore;
      const absorptionRate = totalPossible > 0 ? Math.round((totalEarnedScore / totalPossible) * 100) : 0;

      let difficulty = 'Sedang';
      if (absorptionRate >= 80) difficulty = 'Mudah';
      else if (absorptionRate < 50) difficulty = 'Sukar';

      return {
        ...q,
        fullCorrectCount,
        absorptionRate,
        difficulty,
      };
    });
  }, [completedAttempts]);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Banner / Header Guru */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
              <span>Kurikulum Merdeka • Portal Guru Kelas V</span>
              <span>•</span>
              <span className="text-emerald-400">Database Terpusat Aktif</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Dashboard Asesmen {ASSESSMENT_INFO.school}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Pengampu: <span className="text-white font-semibold">{ASSESSMENT_INFO.teacher}</span> • 
              Mata Pelajaran: <span className="text-white font-semibold">{ASSESSMENT_INFO.subject}</span> • 
              Semester: <span className="text-white font-semibold">{ASSESSMENT_INFO.semester}</span>
            </p>
          </div>

          {/* Quick Actions (Export, PDF, Sync, Logout) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadTeacherPdf}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF Analisis Guru</span>
            </button>

            <button
              onClick={handlePreviewTeacherPdf}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Preview PDF</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isSyncing}
              title="Perbarui Data"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            <button
              onClick={onLogout}
              className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 font-bold text-xs transition-colors cursor-pointer"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative pt-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama siswa kelas V..."
            className="w-full h-11 pl-10 pr-4 text-xs sm:text-sm font-medium bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-5.5 pointer-events-none" />
        </div>
      </div>

      {/* Menu Switcher Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('daftar_nilai')}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'daftar_nilai'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Daftar Nilai</span>
        </button>

        <button
          onClick={() => setActiveTab('daftar_siswa')}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'daftar_siswa'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Siswa ({totalClass})</span>
        </button>

        <button
          onClick={() => setActiveTab('analisis_tp')}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'analisis_tp'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Analisis TP</span>
        </button>

        <button
          onClick={() => setActiveTab('analisis_nilai')}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'analisis_nilai'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Statistik Nilai</span>
        </button>

        <button
          onClick={() => setActiveTab('analisis_soal')}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'analisis_soal'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Analisis Soal (18)</span>
        </button>

        <button
          onClick={() => setActiveTab('riwayat')}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'riwayat'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Riwayat ({historyList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('refleksi')}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'refleksi'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          <span>Refleksi Guru</span>
        </button>
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top 4 Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Siswa
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {totalClass}
              </div>
              <p className="text-[11px] text-slate-400">Kelas V SDN 11 Anggrek</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Telah Mengerjakan
              </span>
              <div className="text-2xl sm:text-3xl font-black text-blue-600">
                {totalCompleted} <span className="text-sm font-semibold text-slate-400">({completionRate}%)</span>
              </div>
              <p className="text-[11px] text-slate-400">{inProgressAttempts.length} sedang mengerjakan</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Rata-Rata Nilai
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600">
                {averageFinalScore}
              </div>
              <p className="text-[11px] text-slate-400">Skala 0 - 100</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Ketuntasan Kelas
              </span>
              <div className="text-2xl sm:text-3xl font-black text-indigo-600">
                {passRate}%
              </div>
              <p className="text-[11px] text-slate-400">{passedStudentsCount} dari {totalCompleted} tuntas (KKM 70)</p>
            </div>
          </div>

          {/* Quick Seed Demo Notice (if few completed) */}
          {totalCompleted === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Belum ada siswa yang menyelesaikan asesmen?
                </h4>
                <p className="text-xs text-blue-700">
                  Kamu dapat mengklik tombol di bawah untuk membuat contoh data pengerjaan 3 siswa agar format analisis guru langsung terisi.
                </p>
              </div>
              <button
                onClick={async () => {
                  await seedDemoData();
                  await onRefresh();
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm cursor-pointer"
              >
                Isi Contoh Data Tes
              </button>
            </div>
          )}

          {/* TP Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TP_LIST.map((tp) => {
              let avgTpNilai = 0;
              if (completedAttempts.length > 0) {
                const sum = completedAttempts.reduce((acc, curr) => {
                  const item = (curr.tpAnalyses || []).find((t) => t.tpId === tp.id);
                  return acc + (item?.nilai ?? 0);
                }, 0);
                avgTpNilai = Math.round((sum / completedAttempts.length) * 10) / 10;
              }
              const { code, category } = getTPCategory(avgTpNilai);

              return (
                <div key={tp.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-extrabold text-xs">
                      {tp.code}
                    </span>
                    <span className="text-xs font-bold text-slate-500">Maks: {tp.maxScore} Poin</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2">
                    {tp.title}
                  </h4>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Rata-rata Nilai</span>
                      <span className="text-lg font-black text-slate-900">{avgTpNilai}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      code === 'SB' ? 'bg-emerald-100 text-emerald-800' :
                      code === 'BSH' ? 'bg-blue-100 text-blue-800' :
                      code === 'MB' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {code} • {category}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Submissions Table */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">
                Hasil Asesmen Peserta Didik
              </h3>
              <button
                onClick={() => setActiveTab('daftar_nilai')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Lihat Seluruhnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Nama Siswa</th>
                    <th className="py-2.5 px-3">Nilai</th>
                    <th className="py-2.5 px-3">Skor</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.slice(0, 10).map((student, idx) => {
                    const att = attemptsMap[String(student.id)];
                    const isDone = att && att.status === 'completed';

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-600">{idx + 1}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{student.name}</td>
                        <td className="py-3 px-3 font-extrabold text-blue-700">
                          {isDone ? att.finalScore : '-'}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {isDone ? `${att.totalScore} / 45` : '-'}
                        </td>
                        <td className="py-3 px-3">
                          {isDone ? (
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              (att.finalScore ?? 0) >= 70
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {(att.finalScore ?? 0) >= 70 ? 'TUNTAS' : 'REMEDIAL'}
                            </span>
                          ) : att?.status === 'in_progress' ? (
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-100 text-blue-800">
                              Mengerjakan
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-500">
                              Belum
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isDone && (
                              <button
                                onClick={() => setSelectedStudentForDetail(att)}
                                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Detail
                              </button>
                            )}
                            <button
                              onClick={() => handleStartReset(student)}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-bold text-[11px] transition-colors cursor-pointer"
                              title="Reset Pengerjaan"
                            >
                              Reset
                            </button>
                          </div>
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

      {/* TAB 2: DAFTAR NILAI LENGKAP */}
      {activeTab === 'daftar_nilai' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                Daftar Nilai Siswa Lengkap
              </h3>
              <p className="text-xs text-slate-500">
                Format resmi Kurikulum Merdeka - Nilai Akhir & Rincian TP 1, TP 2, TP 3.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Unduh Excel</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-3">No</th>
                  <th className="py-3 px-3">Nama Siswa</th>
                  <th className="py-3 px-3 text-center">TP 1 (15)</th>
                  <th className="py-3 px-3 text-center">TP 2 (15)</th>
                  <th className="py-3 px-3 text-center">TP 3 (15)</th>
                  <th className="py-3 px-3 text-center">Skor (45)</th>
                  <th className="py-3 px-3 text-center">Nilai (100)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, idx) => {
                  const att = attemptsMap[String(student.id)];
                  const isDone = att && att.status === 'completed';
                  const tp1 = (att?.tpAnalyses || []).find((t) => t.tpId === 1);
                  const tp2 = (att?.tpAnalyses || []).find((t) => t.tpId === 2);
                  const tp3 = (att?.tpAnalyses || []).find((t) => t.tpId === 3);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{student.name}</td>
                      <td className="py-3 px-3 text-center font-semibold">
                        {isDone ? `${tp1?.totalStudentScore} (${tp1?.code})` : '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold">
                        {isDone ? `${tp2?.totalStudentScore} (${tp2?.code})` : '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold">
                        {isDone ? `${tp3?.totalStudentScore} (${tp3?.code})` : '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {isDone ? att.totalScore : '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-black text-blue-700 text-sm">
                        {isDone ? att.finalScore : '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isDone ? (
                          <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                            (att.finalScore ?? 0) >= 70
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {(att.finalScore ?? 0) >= 70 ? 'TUNTAS' : 'PERLU BIMBINGAN'}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">Belum Mengerjakan</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isDone ? (
                            <>
                              <button
                                onClick={() => setSelectedStudentForDetail(att)}
                                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Detail
                              </button>
                              <button
                                onClick={() => {
                                  const doc = generateStudentWorkPdf(att);
                                  doc.save(`Hasil_${att.studentName.replace(/\s+/g, '_')}.pdf`);
                                }}
                                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                                title="Unduh PDF Siswa"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : null}
                          <button
                            onClick={() => handleStartReset(student)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-bold text-[11px] transition-colors cursor-pointer"
                            title="Reset Pekerjaan"
                          >
                            Reset
                          </button>
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

      {/* TAB 3: DAFTAR SISWA */}
      {activeTab === 'daftar_siswa' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Daftar Peserta Didik Kelas V SDN 11 Anggrek
              </h3>
              <p className="text-xs text-slate-500">
                Total {totalClass} siswa terdaftar sesuai data Dapodik sekolah.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredStudents.map((s, idx) => {
              const att = attemptsMap[String(s.id)];
              const isDone = att && att.status === 'completed';
              const isInProg = att && att.status === 'in_progress';

              return (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-300 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : isInProg
                          ? 'bg-blue-100 text-blue-800 animate-pulse'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isDone ? `Nilai: ${att.finalScore}` : isInProg ? 'Sedang Tes' : 'Belum Mulai'}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      {s.name}
                    </h4>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    {isDone ? (
                      <button
                        onClick={() => setSelectedStudentForDetail(att)}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Hasil</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">1 Kesempatan Aktif</span>
                    )}

                    <button
                      onClick={() => handleStartReset(s)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: ANALISIS PER TP (Sesuai Ketentuan Format Guru) */}
      {activeTab === 'analisis_tp' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Format Analisis Penilaian per Tujuan Pembelajaran (TP)
              </h3>
              <p className="text-xs text-slate-500">
                Struktur resmi dokumen: No | Nama Siswa | Nomor Soal (Bentuk & Skor) | TOTAL SKOR | NILAI | KET | DESKRIPSI
              </p>
            </div>
            <button
              onClick={handleDownloadTeacherPdf}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Cetak PDF Analisis TP (Landscape)</span>
            </button>
          </div>

          {TP_LIST.map((tp) => {
            const tpQuestions = QUESTIONS.filter((q) => q.tpId === tp.id);

            return (
              <div key={tp.id} className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                  <div>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-black text-xs">
                      ANALISIS {tp.code}
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm sm:text-base mt-1">
                      {tp.title}
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                    Skor Maksimal: {tp.maxScore} Poin
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                        <th className="p-2 border-r border-slate-200 w-10 text-center">No</th>
                        <th className="p-2 border-r border-slate-200 min-w-[160px]">Nama Siswa</th>
                        {tpQuestions.map((q) => (
                          <th key={q.id} className="p-2 border-r border-slate-200 text-center min-w-[70px]">
                            <div>S{q.id}</div>
                            <div className="text-[10px] text-slate-500 font-normal">({q.type})</div>
                            <div className="text-[10px] text-blue-600 font-bold">[{q.maxScore}]</div>
                          </th>
                        ))}
                        <th className="p-2 border-r border-slate-200 text-center font-bold min-w-[80px]">TOTAL SKOR</th>
                        <th className="p-2 border-r border-slate-200 text-center font-bold min-w-[70px]">NILAI</th>
                        <th className="p-2 border-r border-slate-200 text-center font-bold min-w-[60px]">KET</th>
                        <th className="p-2 min-w-[240px]">DESKRIPSI KETERCAPAIAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((s, idx) => {
                        const att = attemptsMap[String(s.id)];
                        const isDone = att && att.status === 'completed';
                        const gradings = att?.questionGradings || {};
                        const tpItem = (att?.tpAnalyses || []).find((t) => t.tpId === tp.id);

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/80">
                            <td className="p-2 border-r border-slate-100 text-center font-semibold text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="p-2 border-r border-slate-100 font-bold text-slate-900">
                              {s.name}
                            </td>
                            {tpQuestions.map((q) => (
                              <td key={q.id} className="p-2 border-r border-slate-100 text-center font-semibold text-slate-700">
                                {isDone ? (gradings[q.id]?.score ?? 0) : '-'}
                              </td>
                            ))}
                            <td className="p-2 border-r border-slate-100 text-center font-extrabold text-slate-900">
                              {isDone ? tpItem?.totalStudentScore : '-'}
                            </td>
                            <td className="p-2 border-r border-slate-100 text-center font-black text-blue-700">
                              {isDone ? tpItem?.nilai : '-'}
                            </td>
                            <td className="p-2 border-r border-slate-100 text-center font-bold">
                              {isDone ? (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  tpItem?.code === 'SB' ? 'bg-emerald-100 text-emerald-800' :
                                  tpItem?.code === 'BSH' ? 'bg-blue-100 text-blue-800' :
                                  tpItem?.code === 'MB' ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {tpItem?.code}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="p-2 text-slate-600 text-[11px] leading-relaxed">
                              {isDone ? tpItem?.description : 'Belum mengerjakan asesmen'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 5: STATISTIK & DISTRIBUSI NILAI */}
      {activeTab === 'analisis_nilai' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
              Statistik Distribusi Ketercapaian Nilai
            </h3>
            <p className="text-xs text-slate-500">
              Pengelompokan capaian berdasarkan predikat Kurikulum Merdeka (SB, BSH, MB, BB).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                Sangat Berkembang (SB)
              </span>
              <div className="text-3xl font-black text-emerald-950">
                {completedAttempts.filter((a) => (a.finalScore ?? 0) >= 81).length}
              </div>
              <p className="text-[11px] text-emerald-700">Rentang Nilai 81 - 100</p>
            </div>

            <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                Berkembang Sesuai Harapan (BSH)
              </span>
              <div className="text-3xl font-black text-blue-950">
                {completedAttempts.filter((a) => (a.finalScore ?? 0) >= 61 && (a.finalScore ?? 0) <= 80).length}
              </div>
              <p className="text-[11px] text-blue-700">Rentang Nilai 61 - 80</p>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                Mulai Berkembang (MB)
              </span>
              <div className="text-3xl font-black text-amber-950">
                {completedAttempts.filter((a) => (a.finalScore ?? 0) >= 41 && (a.finalScore ?? 0) <= 60).length}
              </div>
              <p className="text-[11px] text-amber-700">Rentang Nilai 41 - 60</p>
            </div>

            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                Belum Berkembang (BB)
              </span>
              <div className="text-3xl font-black text-rose-950">
                {completedAttempts.filter((a) => (a.finalScore ?? 0) <= 40).length}
              </div>
              <p className="text-[11px] text-rose-700">Rentang Nilai 0 - 40</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ANALISIS BUTIR SOAL */}
      {activeTab === 'analisis_soal' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                Analisis Butir Soal (1 sampai 18)
              </h3>
              <p className="text-xs text-slate-500">
                Daya serap, tingkat kesukaran, dan bentuk instrumen evaluasi.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="p-3 w-12 text-center">No</th>
                  <th className="p-3">TP</th>
                  <th className="p-3">Bentuk</th>
                  <th className="p-3">Level</th>
                  <th className="p-3 text-center">Maks Skor</th>
                  <th className="p-3 text-center">Menjawab Tepat</th>
                  <th className="p-3 text-center">Daya Serap (%)</th>
                  <th className="p-3 text-center">Kategori Kesukaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {questionAnalytics.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 text-center font-bold text-slate-800">{item.id}</td>
                    <td className="p-3 font-semibold text-blue-700">{item.tpCode}</td>
                    <td className="p-3 font-medium text-slate-600">{item.type}</td>
                    <td className="p-3 font-medium text-indigo-700">{item.level}</td>
                    <td className="p-3 text-center font-bold">{item.maxScore}</td>
                    <td className="p-3 text-center font-bold text-emerald-700">
                      {item.fullCorrectCount} / {completedAttempts.length}
                    </td>
                    <td className="p-3 text-center font-extrabold text-slate-900">
                      {item.absorptionRate}%
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.difficulty === 'Mudah' ? 'bg-emerald-100 text-emerald-800' :
                        item.difficulty === 'Sedang' ? 'bg-blue-100 text-blue-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {item.difficulty}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: RIWAYAT PERCOBAAN & RESET */}
      {activeTab === 'riwayat' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
              Riwayat Pengerjaan & Log Reset
            </h3>
            <p className="text-xs text-slate-500">
              Audit jejak pengerjaan siswa yang pernah direset oleh guru agar data tetap terarsip aman.
            </p>
          </div>

          {historyList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Belum ada riwayat percobaan sebelumnya yang direset.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Nama Siswa</th>
                    <th className="py-2.5 px-3">Percobaan Ke</th>
                    <th className="py-2.5 px-3">Nilai Lama</th>
                    <th className="py-2.5 px-3">Waktu Mulai</th>
                    <th className="py-2.5 px-3">Waktu Reset</th>
                    <th className="py-2.5 px-3">Alasan Reset</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyList.map((h, idx) => (
                    <tr key={h.id || idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{h.studentName}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">Attempt {h.attemptNumber}</td>
                      <td className="py-3 px-3 font-extrabold text-blue-700">{h.finalScore ?? '-'}</td>
                      <td className="py-3 px-3 text-slate-500">
                        {h.startedAt ? new Date(h.startedAt).toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {h.resetAt ? new Date(h.resetAt).toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-700 italic">{h.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 8: REFLEKSI GURU & RENCANA TINDAK LANJUT */}
      {activeTab === 'refleksi' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
              Refleksi Pembelajaran Guru Kelas V (Kurikulum Merdeka)
            </h3>
            <p className="text-xs text-slate-500">
              Evaluasi daya serap peserta didik dan rekomendasi program tindak lanjut.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
              <h4 className="font-bold text-blue-900 text-sm">
                1. Analisis Ketercapaian TP 1 (Membaca dan Menulis Bilangan Cacah sampai 1.000.000)
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                Sebagian besar peserta didik telah mampu membaca dan melafalkan bilangan hingga ratusan ribu dengan benar. Catatan penting: Pada penulisan lambang bilangan dengan angka 0 di tempat ratusan (misalnya 821.036), masih ditemukan beberapa siswa yang melewatkan fungsi angka 0 sebagai penjaga nilai tempat.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
              <h4 className="font-bold text-indigo-900 text-sm">
                2. Analisis Ketercapaian TP 2 (Nilai Tempat, Dekomposisi, Perbandingan)
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                Siswa menguasai urutan bilangan dan perbandingan dua bilangan besar. Pada penguraian dekomposisi bentuk penjumlahan (600.000 + 80.000 + 2.000 + 400 + 5), penguatan diperlukan pada penulisan nilai tempat puluhan yang bernilai nol.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <h4 className="font-bold text-emerald-900 text-sm">
                3. Analisis Ketercapaian TP 3 (Masalah Sehari-Hari Terkait Uang)
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                Konteks kontekstual belanja dan kembalian sangat menarik minat siswa. Perhitungan kombinasi pecahan uang Doni dan soal cerita belanja Nisa menunjukkan daya nalar matematis tingkat tinggi yang baik pada kategori C4.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
              <h4 className="font-bold text-amber-900 text-sm">
                4. Rencana Program Tindak Lanjut (Remedial & Pengayaan)
              </h4>
              <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1">
                <li><strong>Remedial:</strong> Bimbingan khusus per kelompok kecil untuk siswa dengan kategori BB/MB pada penulisan nilai tempat angka 0.</li>
                <li><strong>Pengayaan:</strong> Latihan berbasis pemecahan masalah kontekstual transaksi belanja dengan anggaran terbatas dan estimasi kembalian.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL HASIL PEKERJAAN SISWA (GURU VIEW) */}
      {selectedStudentForDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base">
                  Hasil Pekerjaan: {selectedStudentForDetail.studentName}
                </h3>
                <p className="text-xs text-slate-400">
                  Nilai: <strong className="text-emerald-400 font-extrabold">{selectedStudentForDetail.finalScore}</strong>/100 • 
                  Skor: <strong className="text-white">{selectedStudentForDetail.totalScore}</strong>/45 • 
                  Durasi: {Math.floor(selectedStudentForDetail.durationSeconds / 60)} menit
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const doc = generateStudentWorkPdf(selectedStudentForDetail);
                    doc.save(`Hasil_${selectedStudentForDetail.studentName.replace(/\s+/g, '_')}.pdf`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF Siswa</span>
                </button>
                <button
                  onClick={() => setSelectedStudentForDetail(null)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Questions detail list */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-slate-50">
              {QUESTIONS.map((q) => {
                const gr = selectedStudentForDetail.questionGradings?.[q.id];
                const score = gr ? gr.score : 0;
                const status = gr ? gr.status : 'Salah';
                const ansText = gr ? gr.studentAnswerDisplay : 'Tidak dijawab';

                return (
                  <div key={q.id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">
                          {q.id}
                        </span>
                        <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                          {q.tpCode} • {q.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">
                          Skor: {score} / {q.maxScore}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          status === 'Benar' ? 'bg-emerald-100 text-emerald-800' :
                          status === 'Parsial' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {status}
                        </span>
                        {q.type === 'URAIAN' && (
                          <button
                            onClick={() => {
                              setEssayEditModal({ attempt: selectedStudentForDetail, question: q });
                              setOverrideScoreVal(score);
                            }}
                            className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Sliders className="w-3 h-3" />
                            <span>Koreksi Guru</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {q.stimulus && (
                      <p className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                        {q.stimulus}
                      </p>
                    )}
                    <p className="text-xs font-bold text-slate-800">{q.questionText}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 block">Jawaban Siswa:</span>
                        <p className="font-semibold text-slate-900 whitespace-pre-wrap">{ansText}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-blue-50">
                        <span className="text-[10px] font-bold text-blue-700 block">Kunci Jawaban Resmi:</span>
                        <p className="font-semibold text-blue-950 whitespace-pre-wrap">{q.correctKeyDisplay}</p>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 italic">
                      Pembahasan: {q.explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET PEKERJAAN SISWA (2 TAHAP KONFIRMASI) */}
      {resetModalStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-5 animate-in zoom-in-95 duration-200 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-extrabold text-slate-900">
                {resetStep === 1 ? 'Konfirmasi Reset Pengerjaan' : 'PERINGATAN TAHAP AKHIR'}
              </h3>
              <p className="text-xs text-slate-600">
                Siswa: <strong className="text-slate-900 font-extrabold">{resetModalStudent.name}</strong>
              </p>
            </div>

            {resetStep === 1 ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                  Pekerjaan aktif siswa ini akan diarsipkan ke riwayat, dan siswa akan dapat mengerjakan kembali dari soal nomor 1.
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Alasan Reset:</label>
                  <input
                    type="text"
                    value={resetReason}
                    onChange={(e) => setResetReason(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => setResetStep(2)}
                    className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Lanjutkan ke Tahap Konfirmasi Akhir →</span>
                  </button>
                  <button
                    onClick={() => setResetModalStudent(null)}
                    className="w-full h-10 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-900 font-medium">
                  Apakah Anda yakin 100% ingin mereset pengerjaan <strong>{resetModalStudent.name}</strong>? Tindakan ini hanya mereset siswa terpilih tanpa mempengaruhi data siswa lain.
                </div>
                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleConfirmReset}
                    disabled={isResetting}
                    className="w-full h-11 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isResetting ? 'Sedang Memproses...' : 'Ya, Reset Pekerjaan Siswa Ini'}
                  </button>
                  <button
                    onClick={() => setResetStep(1)}
                    className="w-full h-10 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
                  >
                    Kembali
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: MANUAL ESSAY SCORE OVERRIDE */}
      {essayEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-900 text-sm">
                Koreksi Skor Uraian Guru
              </h4>
              <button
                onClick={() => setEssayEditModal(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-bold text-slate-800">
                Soal {essayEditModal.question.id}: {essayEditModal.question.questionText}
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-500 block mb-1">Jawaban Siswa:</span>
                <p className="text-slate-800 font-medium whitespace-pre-wrap">
                  {essayEditModal.attempt.questionGradings?.[essayEditModal.question.id]?.studentAnswerDisplay || '-'}
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="block font-bold text-slate-700">
                  Tetapkan Skor Guru (0 sampai {essayEditModal.question.maxScore}):
                </label>
                <div className="flex items-center gap-2">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => setOverrideScoreVal(s)}
                      className={`flex-1 h-11 rounded-xl font-black text-sm border-2 transition-all ${
                        overrideScoreVal === s
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={handleSaveScoreOverride}
                className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                Simpan & Hitung Ulang Nilai
              </button>
              <button
                onClick={() => setEssayEditModal(null)}
                className="px-4 h-11 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF PREVIEW MODAL */}
      {previewPdfDoc && (
        <PdfPreviewModal
          pdfDoc={previewPdfDoc}
          title={previewPdfTitle}
          onClose={() => setPreviewPdfDoc(null)}
        />
      )}
    </div>
  );
};
