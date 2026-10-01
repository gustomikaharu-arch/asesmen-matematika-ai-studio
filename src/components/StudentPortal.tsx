import React, { useState } from 'react';
import { 
  User, 
  Play, 
  Award, 
  FileText, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Sparkles,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { Attempt, Student } from '../types';
import { ASSESSMENT_INFO, STUDENTS_LIST, TP_LIST } from '../data/assessmentData';

interface StudentPortalProps {
  students: Student[];
  selectedStudent: Student | null;
  onSelectStudent: (student: Student) => void;
  currentAttempt: Attempt | null;
  onStartAssessment: () => void;
  onViewResult: () => void;
  isLoading: boolean;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  students,
  selectedStudent,
  onSelectStudent,
  currentAttempt,
  onStartAssessment,
  onViewResult,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const isCompleted = currentAttempt && currentAttempt.status === 'completed';
  const isInProgress = currentAttempt && currentAttempt.status === 'in_progress';

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-blue-900/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-blue-100">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Kurikulum Merdeka • Fase C</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug">
            ASESMEN SUMATIF MATEMATIKA
          </h2>
          <p className="text-sm text-blue-100 font-medium">
            Materi: <span className="font-bold text-white">{ASSESSMENT_INFO.title}</span>
          </p>

          <div className="pt-2 border-t border-white/15 flex flex-wrap gap-y-2 gap-x-4 text-xs text-blue-100">
            <span>Kelas V SDN 11 Anggrek</span>
            <span>•</span>
            <span>Guru: {ASSESSMENT_INFO.teacher}</span>
            <span>•</span>
            <span>18 Soal (45 Poin)</span>
          </div>
        </div>
      </div>

      {/* Student Selection Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
        <div className="space-y-1">
          <label className="block text-sm font-bold text-slate-800 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Pilih Nama Siswa:
          </label>
          <p className="text-xs text-slate-500">
            Silakan pilih nama lengkap kamu dari daftar 18 siswa kelas V.
          </p>
        </div>

        {/* Dropdown Selector */}
        <div className="relative">
          <select
            value={selectedStudent?.id || ''}
            onChange={(e) => {
              const studentId = Number(e.target.value);
              const found = students.find((s) => s.id === studentId);
              if (found) onSelectStudent(found);
            }}
            className="w-full h-14 pl-4 pr-10 text-base font-semibold text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-blue-600 focus:bg-white focus:outline-hidden transition-all appearance-none cursor-pointer"
          >
            <option value="" disabled>
              -- Sentuh di sini untuk memilih nama kamu --
            </option>
            {students.map((student) => (
              <option key={student.id} value={student.id} className="py-2 text-slate-800">
                {student.id}. {student.name}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <ChevronRight className="w-5 h-5 rotate-90" />
          </div>
        </div>

        {/* Welcome and Action State when student is chosen */}
        {selectedStudent ? (
          <div className="pt-4 border-t border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 text-center">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block">
                Selamat Datang
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-blue-950 mt-0.5">
                {selectedStudent.name}
              </h3>
              <p className="text-xs text-blue-700/80 mt-1">
                NIS/No. Presensi: {selectedStudent.id} • SDN 11 ANGGREK
              </p>
            </div>

            {/* Status Indicator */}
            {isCompleted ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div className="text-xs sm:text-sm">
                  <p className="font-bold text-emerald-950">Asesmen Telah Diselesaikan</p>
                  <p className="text-emerald-700">
                    Nilai: <span className="font-extrabold text-emerald-900">{currentAttempt?.finalScore}</span> / 100 • 
                    Skor: <span className="font-extrabold text-emerald-900">{currentAttempt?.totalScore}</span> / 45
                  </p>
                </div>
              </div>
            ) : isInProgress ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
                <Clock className="w-6 h-6 text-amber-600 shrink-0 animate-pulse" />
                <div className="text-xs sm:text-sm">
                  <p className="font-bold text-amber-950">Pengerjaan Sedang Berlangsung</p>
                  <p className="text-amber-700">
                    Kamu dapat melanjutkan pengerjaan dari nomor terakhir.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-blue-600 shrink-0" />
                <div className="text-xs sm:text-sm">
                  <p className="font-bold text-slate-900">Siap Mengerjakan Asesmen</p>
                  <p className="text-slate-600">
                    Setiap siswa memiliki 1 kesempatan sampai direset oleh guru.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons as per prompt requirements */}
            <div className="space-y-3 pt-2">
              {/* MULAI ASESMEN BUTTON */}
              <button
                onClick={onStartAssessment}
                disabled={isCompleted || isLoading}
                className={`w-full min-h-[52px] px-6 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] ${
                  isCompleted
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : isInProgress
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                <span>
                  {isInProgress ? 'LANJUTKAN ASESMEN' : 'MULAI ASESMEN'}
                </span>
              </button>

              {/* LIHAT HASIL ASESMEN BUTTON */}
              <button
                onClick={onViewResult}
                disabled={!isCompleted || isLoading}
                className={`w-full min-h-[52px] px-6 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] border-2 ${
                  isCompleted
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-md shadow-emerald-600/25'
                    : 'bg-white text-slate-300 border-slate-200 cursor-not-allowed'
                }`}
              >
                <Award className="w-5 h-5" />
                <span>LIHAT HASIL ASESMEN</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
            Silakan pilih nama kamu pada menu dropdown di atas untuk mengaktifkan tombol asesmen.
          </div>
        )}
      </div>

      {/* Information Cards: Tujuan Pembelajaran & Petunjuk Pengerjaan */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          Tujuan Pembelajaran (TP) yang Diujikan:
        </h4>
        <div className="space-y-2.5 text-xs text-slate-700">
          {TP_LIST.map((tp) => (
            <div key={tp.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
              <span className="font-extrabold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-md shrink-0">
                {tp.code}
              </span>
              <p className="leading-relaxed">{tp.title}</p>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
          <p className="font-bold text-slate-700">Petunjuk Umum:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Baca setiap soal dan stimulus dengan teliti.</li>
            <li>Pilihan ganda: pilih 1 opsi yang paling tepat.</li>
            <li>Pilihan ganda kompleks: pilih semua opsi yang benar.</li>
            <li>Kategori & Menjodohkan: sentuh pilihan pada baris atau kolom yang sesuai.</li>
            <li>Uraian: tuliskan cara penyelesaian dan jawaban secara rinci.</li>
            <li>Jawaban tersimpan otomatis secara realtime ke server SDN 11 Anggrek.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
