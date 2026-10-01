import React, { useState } from 'react';
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Download, 
  Eye, 
  ArrowLeft, 
  Clock, 
  Calendar, 
  BookOpen, 
  Check, 
  User, 
  TrendingUp, 
  FileSpreadsheet,
  FileCheck
} from 'lucide-react';
import { Attempt, Question } from '../types';
import { ASSESSMENT_INFO, QUESTIONS, TP_LIST } from '../data/assessmentData';
import { generateStudentWorkPdf, generateTeacherTPAnalysisPdf } from '../utils/pdfGenerator';
import { PdfPreviewModal } from './PdfPreviewModal';

interface StudentResultViewProps {
  attempt: Attempt;
  onBackToHome: () => void;
}

export const StudentResultView: React.FC<StudentResultViewProps> = ({
  attempt,
  onBackToHome,
}) => {
  const [previewPdfDoc, setPreviewPdfDoc] = useState<any | null>(null);
  const [previewPdfTitle, setPreviewPdfTitle] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'benar' | 'parsial' | 'salah'>('all');

  const finalScore = attempt.finalScore ?? 0;
  const isLulus = finalScore >= 70;
  const totalScore = attempt.totalScore ?? 0;
  const maxScore = attempt.maxScore ?? 45;
  const gradings = attempt.questionGradings || {};

  const durMinutes = Math.floor((attempt.durationSeconds || 0) / 60);
  const durSecs = (attempt.durationSeconds || 0) % 60;

  // Filter questions for review
  const filteredQuestions = QUESTIONS.filter((q) => {
    const status = gradings[q.id]?.status || 'Salah';
    if (selectedFilter === 'benar') return status === 'Benar';
    if (selectedFilter === 'parsial') return status === 'Parsial';
    if (selectedFilter === 'salah') return status === 'Salah';
    return true;
  });

  const handleDownloadStudentWorkPdf = () => {
    const doc = generateStudentWorkPdf(attempt);
    doc.save(`Hasil_Asesmen_${attempt.studentName.replace(/\s+/g, '_')}.pdf`);
  };

  const handleDownloadTPAnalysisPdf = () => {
    // Generate map with this attempt
    const map = { [String(attempt.studentId)]: attempt };
    const doc = generateTeacherTPAnalysisPdf(map);
    doc.save(`Analisis_TP_${attempt.studentName.replace(/\s+/g, '_')}.pdf`);
  };

  const handleOpenPreviewStudentPdf = () => {
    const doc = generateStudentWorkPdf(attempt);
    setPreviewPdfDoc(doc);
    setPreviewPdfTitle(`Hasil Pekerjaan Siswa - ${attempt.studentName}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Navigation Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </button>

        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Hasil Resmi Disimpan
        </span>
      </div>

      {/* Hero Score Banner */}
      <div className={`rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl ${
        isLulus 
          ? 'bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 shadow-emerald-900/20'
          : 'bg-gradient-to-br from-indigo-700 via-blue-800 to-slate-900 shadow-indigo-900/20'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
              <Award className="w-3.5 h-3.5" />
              <span>Status: {isLulus ? 'TUNTAS (MEMENUHI KKM)' : 'PERLU BIMBINGAN LANJUTAN'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {attempt.studentName}
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium">
              {ASSESSMENT_INFO.school} • Kelas V Fase C • Mapel {ASSESSMENT_INFO.subject}
            </p>
          </div>

          {/* Big Score Badge */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 flex items-center gap-5 justify-around shrink-0">
            <div className="text-center">
              <span className="text-[11px] uppercase tracking-wider text-white/70 font-bold block">
                Nilai Akhir
              </span>
              <div className="text-4xl sm:text-5xl font-black tracking-tight mt-0.5">
                {finalScore}
              </div>
              <span className="text-[10px] text-white/60">Skala 0 - 100</span>
            </div>
            <div className="h-12 w-px bg-white/20" />
            <div className="text-center">
              <span className="text-[11px] uppercase tracking-wider text-white/70 font-bold block">
                Total Skor
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-0.5">
                {totalScore}
                <span className="text-base font-normal text-white/60">/{maxScore}</span>
              </div>
              <span className="text-[10px] text-white/60">Skor Mentah</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Download & Preview Buttons Mandated */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-600" />
          Menu Unduh Dokumen Resmi (PDF):
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* 1. DOWNLOAD HASIL PEKERJAAN — PDF */}
          <button
            onClick={handleDownloadStudentWorkPdf}
            className="min-h-[50px] px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm shadow-blue-600/25 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>PDF HASIL PEKERJAAN</span>
          </button>

          {/* 2. DOWNLOAD HASIL NILAI — ANALISIS PER TP */}
          <button
            onClick={handleDownloadTPAnalysisPdf}
            className="min-h-[50px] px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>PDF ANALISIS PER TP</span>
          </button>

          {/* 3. PREVIEW PDF */}
          <button
            onClick={handleOpenPreviewStudentPdf}
            className="min-h-[50px] px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-300 transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4 text-blue-600 shrink-0" />
            <span>PREVIEW PDF</span>
          </button>
        </div>
      </div>

      {/* Identitas & Ringkasan Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Identitas Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Identitas Pelaksanaan
          </h4>
          <div className="space-y-2 text-xs sm:text-sm text-slate-700">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Mata Pelajaran:</span>
              <span className="font-semibold text-slate-900">{ASSESSMENT_INFO.subject}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Materi Pokok:</span>
              <span className="font-semibold text-slate-900">{ASSESSMENT_INFO.scope}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Guru Kelas:</span>
              <span className="font-semibold text-slate-900">{ASSESSMENT_INFO.teacher}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Durasi Pengerjaan:</span>
              <span className="font-semibold text-slate-900">{durMinutes} menit {durSecs} detik</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Selesai Pada:</span>
              <span className="font-semibold text-slate-900">
                {attempt.completedAt ? new Date(attempt.completedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Ringkasan Butir Soal Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Statistik Jawaban
          </h4>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
              <span className="text-[11px] font-bold text-emerald-700 block">Benar</span>
              <span className="text-2xl font-black text-emerald-900">
                {attempt.correctCount ?? 0}
              </span>
              <span className="text-[10px] text-emerald-600 block">soal</span>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-center">
              <span className="text-[11px] font-bold text-amber-700 block">Parsial</span>
              <span className="text-2xl font-black text-amber-900">
                {attempt.partialCount ?? 0}
              </span>
              <span className="text-[10px] text-amber-600 block">soal</span>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-center">
              <span className="text-[11px] font-bold text-rose-700 block">Salah</span>
              <span className="text-2xl font-black text-rose-900">
                {attempt.wrongCount ?? 0}
              </span>
              <span className="text-[10px] text-rose-600 block">soal</span>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-600 flex items-center justify-between">
            <span>Total Butir Soal: <strong>18 Soal</strong></span>
            <span>Rasio Ketuntasan: <strong>{finalScore}%</strong></span>
          </div>
        </div>
      </div>

      {/* Capaian Pembelajaran per TP */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Analisis Ketercapaian Tujuan Pembelajaran (TP)
        </h3>

        <div className="space-y-3">
          {(attempt.tpAnalyses || []).map((tp) => (
            <div
              key={tp.tpId}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-black text-xs">
                    {tp.tpCode}
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    Skor: {tp.totalStudentScore} / {tp.totalMaxScore}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-blue-900">
                    Nilai: {tp.nilai}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                    tp.code === 'SB'
                      ? 'bg-emerald-100 text-emerald-800'
                      : tp.code === 'BSH'
                      ? 'bg-blue-100 text-blue-800'
                      : tp.code === 'MB'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {tp.code} • {tp.category}
                  </span>
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                {tp.tpTitle}
              </p>

              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 italic">
                "{tp.description}"
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Question Review: All 18 Questions */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              Detail Hasil Pekerjaan (Seluruh 18 Soal Lengkap)
            </h3>
            <p className="text-xs text-slate-500">
              Dilengkapi stimulus asli, jawaban siswa, kunci, rubrik, dan pembahasan.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({QUESTIONS.length})
            </button>
            <button
              onClick={() => setSelectedFilter('benar')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedFilter === 'benar'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Benar ({attempt.correctCount ?? 0})
            </button>
            <button
              onClick={() => setSelectedFilter('parsial')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedFilter === 'parsial'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Parsial ({attempt.partialCount ?? 0})
            </button>
            <button
              onClick={() => setSelectedFilter('salah')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedFilter === 'salah'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Salah ({attempt.wrongCount ?? 0})
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          {filteredQuestions.map((q) => {
            const gr = gradings[q.id];
            const score = gr ? gr.score : 0;
            const status = gr ? gr.status : 'Salah';
            const studentAns = gr ? gr.studentAnswerDisplay : 'Tidak dijawab';

            return (
              <div
                key={q.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4 transition-all"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center">
                      {q.id}
                    </span>
                    <span className="text-xs font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md">
                      {q.tpCode}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      Bentuk: {q.type} • Level: {q.level}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">
                      Skor: <strong>{score}</strong>/{q.maxScore}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 ${
                      status === 'Benar'
                        ? 'bg-emerald-100 text-emerald-800'
                        : status === 'Parsial'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {status === 'Benar' && <Check className="w-3.5 h-3.5" />}
                      {status === 'Parsial' && <AlertTriangle className="w-3.5 h-3.5" />}
                      {status === 'Salah' && <XCircle className="w-3.5 h-3.5" />}
                      <span>{status}</span>
                    </span>
                  </div>
                </div>

                {/* Stimulus if exists */}
                {q.stimulus && (
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs sm:text-sm text-slate-800 whitespace-pre-line">
                    <span className="font-bold text-amber-900 block text-[10px] uppercase tracking-wider mb-1">
                      Stimulus:
                    </span>
                    {q.stimulus}
                  </div>
                )}

                {/* Question */}
                <p className="text-sm sm:text-base font-bold text-slate-900">
                  {q.questionText}
                </p>

                {/* Answer comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div className={`p-3.5 rounded-xl border ${
                    status === 'Benar'
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : status === 'Parsial'
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-rose-50/70 border-rose-200'
                  }`}>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Jawaban Siswa:
                    </span>
                    <p className="font-semibold text-slate-900 whitespace-pre-wrap">
                      {studentAns}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block mb-1">
                      Kunci Jawaban Resmi:
                    </span>
                    <p className="font-semibold text-blue-950 whitespace-pre-wrap">
                      {q.correctKeyDisplay}
                    </p>
                  </div>
                </div>

                {/* Explanation */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                  <span className="font-bold text-slate-900 block">
                    Pembahasan Dokumen:
                  </span>
                  <p className="leading-relaxed">{q.explanation}</p>
                  {gr?.evaluationReason && (
                    <p className="text-[11px] text-blue-700 pt-1 border-t border-slate-100 font-medium">
                      Catatan Penilaian: {gr.evaluationReason}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PDF Preview Modal */}
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
