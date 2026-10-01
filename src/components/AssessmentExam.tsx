import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Wifi, 
  Save, 
  Grid,
  X,
  FileText
} from 'lucide-react';
import { Attempt, Question, AnswerValue } from '../types';
import { QUESTIONS, TP_LIST } from '../data/assessmentData';

interface AssessmentExamProps {
  attempt: Attempt;
  onSaveProgress: (answers: Record<number, AnswerValue>, activeIndex: number, durationSeconds: number) => void;
  onSubmitAttempt: (answers: Record<number, AnswerValue>, durationSeconds: number) => Promise<void>;
  onExit: () => void;
}

export const AssessmentExam: React.FC<AssessmentExamProps> = ({
  attempt,
  onSaveProgress,
  onSubmitAttempt,
  onExit,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(attempt.activeQuestionIndex || 0);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>(attempt.answers || {});
  const [duration, setDuration] = useState<number>(attempt.durationSeconds || 0);
  const [isNavOpen, setIsNavOpen] = useState<boolean>(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastSavedNotice, setLastSavedNotice] = useState<string>('Tersimpan');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Timer reference
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveRef = useRef<NodeJS.Timeout | null>(null);

  // Active question
  const currentQ: Question = QUESTIONS[currentIndex] || QUESTIONS[0];

  // Start real-time timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Autosave progress every 8 seconds or when answer changes
  useEffect(() => {
    if (autosaveRef.current) clearTimeout(autosaveRef.current);

    autosaveRef.current = setTimeout(() => {
      setIsSaving(true);
      onSaveProgress(answers, currentIndex, duration);
      setTimeout(() => {
        setIsSaving(false);
        setLastSavedNotice(`Tersimpan ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
      }, 500);
    }, 2000);

    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
    };
  }, [answers, currentIndex, duration]);

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Helper to test if a question is answered
  const isQuestionAnswered = (qId: number): boolean => {
    const ans = answers[qId];
    if (!ans) return false;
    const q = QUESTIONS.find((item) => item.id === qId);
    if (!q) return false;

    if (q.type === 'PG') {
      return Boolean(ans.pgChoice);
    }
    if (q.type === 'MCMA') {
      return Boolean(ans.mcmaChoices && ans.mcmaChoices.length > 0);
    }
    if (q.type === 'KATEGORI') {
      const choices = ans.categoryChoices || {};
      const rows = q.categoryRows || [];
      return rows.length > 0 && rows.every((r) => Boolean(choices[r.id]));
    }
    if (q.type === 'MENJODOHKAN') {
      const choices = ans.matchingChoices || {};
      const pairs = q.matchingPairs || [];
      return pairs.length > 0 && pairs.every((p) => Boolean(choices[p.id]));
    }
    if (q.type === 'URAIAN') {
      return Boolean(ans.essayText && ans.essayText.trim().length > 0);
    }
    return false;
  };

  const answeredCount = QUESTIONS.filter((q) => isQuestionAnswered(q.id)).length;

  // Handlers for updating answers
  const handleSelectPG = (optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        pgChoice: optionId,
      },
    }));
  };

  const handleToggleMCMA = (optionId: string) => {
    const currentList = answers[currentQ.id]?.mcmaChoices || [];
    const exists = currentList.includes(optionId);
    const updated = exists ? currentList.filter((id) => id !== optionId) : [...currentList, optionId];
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        mcmaChoices: updated,
      },
    }));
  };

  const handleSelectCategory = (rowId: string, category: string) => {
    const currentCats = answers[currentQ.id]?.categoryChoices || {};
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        categoryChoices: {
          ...currentCats,
          [rowId]: category,
        },
      },
    }));
  };

  const handleSelectMatching = (pairId: string, rightId: string) => {
    const currentMatches = answers[currentQ.id]?.matchingChoices || {};
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        matchingChoices: {
          ...currentMatches,
          [pairId]: rightId,
        },
      },
    }));
  };

  const handleEssayChange = (text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        essayText: text,
      },
    }));
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmitAttempt(answers, duration);
    } catch (err) {
      alert('Terjadi kendala saat mengirim jawaban. Pastikan koneksi aktif.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-28 md:pb-16 select-none">
      {/* Top Persistent Bar (Sticky) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Left: Question Counter & Student Info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-blue-700 text-sm sm:text-base">
                Soal {currentIndex + 1}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                dari {QUESTIONS.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold truncate max-w-[170px] sm:max-w-xs">
              {attempt.studentName}
            </p>
          </div>

          {/* Right: Timer & Autosave Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Realtime Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 font-mono font-bold text-xs sm:text-sm shadow-xs">
              <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <span>{formatTime(duration)}</span>
            </div>

            {/* Autosave status indicator */}
            <div 
              title={lastSavedNotice}
              className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1.5 rounded-xl font-medium"
            >
              <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin text-amber-600' : 'text-emerald-600'}`} />
              <span className="hidden sm:inline">
                {isSaving ? 'Menyimpan...' : 'Tersimpan'}
              </span>
            </div>

            {/* Navigator Trigger Button */}
            <button
              onClick={() => setIsNavOpen(true)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1 border border-slate-200 transition-colors"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>{answeredCount}/{QUESTIONS.length}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl w-full mx-auto px-4 py-4 sm:py-6 flex-1 flex flex-col space-y-4">
        {/* Question Metadata Header */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-extrabold text-xs">
              {currentQ.tpCode}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
              Bentuk: {currentQ.type}
            </span>
            <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-xs">
              Level: {currentQ.level}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            Maks: {currentQ.maxScore} Poin
          </span>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-6 flex-1">
          {/* Stimulus Box (if available) */}
          {currentQ.stimulus && (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-slate-800 text-sm leading-relaxed relative">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
                Stimulus / Konteks Soal:
              </span>
              <p className="font-medium whitespace-pre-line">{currentQ.stimulus}</p>
            </div>
          )}

          {/* Question Text */}
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {currentQ.questionText}
            </h3>
            {currentQ.type === 'MCMA' && (
              <p className="text-xs text-blue-600 font-semibold">
                * Pilihan Ganda Kompleks: Kamu dapat memilih lebih dari satu jawaban yang benar.
              </p>
            )}
          </div>

          {/* Response Form Depending on Type */}
          <div className="pt-2">
            {/* 1. PG (Pilihan Ganda Biasa) */}
            {currentQ.type === 'PG' && currentQ.options && (
              <div className="grid grid-cols-1 gap-3">
                {currentQ.options.map((opt) => {
                  const isSelected = answers[currentQ.id]?.pgChoice === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectPG(opt.id)}
                      className={`w-full min-h-[56px] p-4 rounded-2xl border-2 text-left flex items-start gap-3.5 transition-all active:scale-[0.99] cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/90 text-blue-950 shadow-sm shadow-blue-500/15'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 text-slate-800'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl font-extrabold text-sm flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {opt.id}
                      </div>
                      <span className="text-sm sm:text-base font-medium pt-0.5 leading-snug">
                        {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2. MCMA (Pilihan Ganda Kompleks / Multichoice) */}
            {currentQ.type === 'MCMA' && currentQ.mcmaOptions && (
              <div className="grid grid-cols-1 gap-3">
                {currentQ.mcmaOptions.map((opt) => {
                  const selectedList = answers[currentQ.id]?.mcmaChoices || [];
                  const isSelected = selectedList.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleToggleMCMA(opt.id)}
                      className={`w-full min-h-[56px] p-4 rounded-2xl border-2 text-left flex items-start gap-3.5 transition-all active:scale-[0.99] cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/90 text-blue-950 shadow-sm shadow-blue-500/15'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 text-slate-800'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl font-extrabold text-sm flex items-center justify-center shrink-0 border-2 transition-colors ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white text-slate-400'
                        }`}
                      >
                        {isSelected ? <Check className="w-5 h-5 stroke-[3]" /> : opt.id}
                      </div>
                      <span className="text-sm sm:text-base font-medium pt-0.5 leading-snug">
                        {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. KATEGORI (Tabel Pernyataan Benar/Salah) */}
            {currentQ.type === 'KATEGORI' && currentQ.categoryRows && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Tentukan kategori untuk masing-masing baris pernyataan berikut:
                </p>
                <div className="space-y-3">
                  {currentQ.categoryRows.map((row, idx) => {
                    const chosen = answers[currentQ.id]?.categoryChoices?.[row.id];
                    const label1 = currentQ.categoryLabels?.[0] || 'Benar';
                    const label2 = currentQ.categoryLabels?.[1] || 'Salah';

                    return (
                      <div
                        key={row.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3"
                      >
                        <p className="text-sm font-semibold text-slate-800">
                          {idx + 1}. {row.statement}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleSelectCategory(row.id, label1)}
                            className={`min-h-[46px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              chosen === label1
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                            <span>{label1}</span>
                          </button>

                          <button
                            onClick={() => handleSelectCategory(row.id, label2)}
                            className={`min-h-[46px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              chosen === label2
                                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <X className="w-4 h-4" />
                            <span>{label2}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. MENJODOHKAN (Pasangan Kolom Kiri & Kanan) */}
            {currentQ.type === 'MENJODOHKAN' && currentQ.matchingPairs && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Pilih pasangan yang sesuai untuk setiap pernyataan pada kolom kiri:
                </p>
                <div className="space-y-4">
                  {currentQ.matchingPairs.map((pair) => {
                    const chosenRightId = answers[currentQ.id]?.matchingChoices?.[pair.id] || '';

                    return (
                      <div
                        key={pair.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5"
                      >
                        <div className="text-sm font-bold text-slate-900">
                          {pair.leftText}
                        </div>
                        <div className="relative">
                          <select
                            value={chosenRightId}
                            onChange={(e) => handleSelectMatching(pair.id, e.target.value)}
                            className="w-full min-h-[48px] px-3.5 py-2 text-xs sm:text-sm font-semibold bg-white border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-hidden cursor-pointer"
                          >
                            <option value="">-- Pilih Pasangan Jawaban --</option>
                            {currentQ.matchingRightItems?.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.text}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. URAIAN (Teks Panjang) */}
            {currentQ.type === 'URAIAN' && (
              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    rows={6}
                    value={answers[currentQ.id]?.essayText || ''}
                    onChange={(e) => handleEssayChange(e.target.value)}
                    placeholder="Ketikkan langkah pengerjaan dan jawaban lengkap kamu di sini..."
                    className="w-full p-4 text-sm sm:text-base font-normal text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-blue-600 focus:bg-white focus:outline-hidden transition-all placeholder:text-slate-400"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>Panjang jawaban: {(answers[currentQ.id]?.essayText || '').length} karakter</span>
                  <span className="text-blue-600 font-medium">Tersimpan otomatis saat mengetik</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Sticky Bottom Navigation (Mobile-First Touch Target >= 44px) */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Previous Button */}
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className={`min-h-[48px] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95 ${
              currentIndex === 0
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Sebelumnya</span>
          </button>

          {/* Quick Navigator Button (Middle) */}
          <button
            onClick={() => setIsNavOpen(true)}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 border border-blue-200 transition-colors"
          >
            <Grid className="w-4 h-4" />
            <span>Nomor ({currentIndex + 1}/{QUESTIONS.length})</span>
          </button>

          {/* Next / Submit Button */}
          {currentIndex < QUESTIONS.length - 1 ? (
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(QUESTIONS.length - 1, prev + 1))}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Kirim Jawaban</span>
            </button>
          )}
        </div>
      </footer>

      {/* Question Navigator Drawer / Modal (Chips Grid) */}
      {isNavOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">
                  Daftar Nomor Soal
                </h4>
                <p className="text-xs text-slate-500">
                  {answeredCount} dari {QUESTIONS.length} soal telah dijawab
                </p>
              </div>
              <button
                onClick={() => setIsNavOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chips Grid: 1 to 18 */}
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5 py-2">
              {QUESTIONS.map((q, idx) => {
                const isAnswered = isQuestionAnswered(q.id);
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsNavOpen(false);
                    }}
                    className={`min-h-[46px] rounded-xl font-bold text-sm flex flex-col items-center justify-center relative transition-all active:scale-95 ${
                      isCurrent
                        ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2 shadow-sm'
                        : isAnswered
                        ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-400 font-extrabold'
                        : 'bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isAnswered && !isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 absolute bottom-1" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-400 inline-block" />
                Sudah Dijawab
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-blue-600 inline-block" />
                Soal Aktif
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-200 inline-block" />
                Belum
              </span>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setIsNavOpen(false);
                  setIsSubmitModalOpen(true);
                }}
                className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>Kumpulkan Asesmen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Submitting */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-5 animate-in zoom-in-95 duration-200 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-extrabold text-slate-900">
                Kirim & Kumpulkan Jawaban?
              </h3>
              <p className="text-xs text-slate-600">
                Pastikan seluruh jawaban kamu telah ditinjau dengan cermat sebelum dikumpulkan.
              </p>
            </div>

            {/* Answer count banner */}
            <div className={`p-3.5 rounded-2xl border text-xs text-center font-medium ${
              answeredCount === QUESTIONS.length
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              {answeredCount === QUESTIONS.length ? (
                <p>Hebat! Seluruh 18 soal telah kamu jawab.</p>
              ) : (
                <p>
                  Perhatian: Kamu baru menjawab <strong className="font-bold">{answeredCount}</strong> dari {QUESTIONS.length} soal. Soal yang belum dijawab akan bernilai 0.
                </p>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="w-full min-h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Menghitung Nilai...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Ya, Kirim & Nilai Sekarang</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsSubmitModalOpen(false)}
                disabled={isSubmitting}
                className="w-full min-h-[46px] rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
              >
                Periksa Kembali Jawaban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
