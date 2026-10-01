import { AnswerValue, Question, QuestionGrading, TPAnalysis } from '../types';
import { QUESTIONS, TP_LIST, getTPCategory, getTPDescription } from '../data/assessmentData';

export function gradeQuestion(question: Question, answer?: AnswerValue): QuestionGrading {
  let score = 0;
  let status: 'Benar' | 'Salah' | 'Parsial' = 'Salah';
  let studentAnswerDisplay = '-';
  let evaluationReason = '';

  if (!answer) {
    return {
      questionId: question.id,
      score: 0,
      maxScore: question.maxScore,
      status: 'Salah',
      studentAnswerDisplay: 'Tidak dijawab',
      evaluationReason: 'Siswa belum memberikan jawaban.',
    };
  }

  switch (question.type) {
    case 'PG': {
      const choice = answer.pgChoice;
      studentAnswerDisplay = choice || 'Tidak dijawab';
      if (choice && choice === question.correctKeyDisplay) {
        score = 1;
        status = 'Benar';
        evaluationReason = 'Jawaban tepat sesuai kunci pilihan ganda.';
      } else {
        score = 0;
        status = 'Salah';
        evaluationReason = choice ? `Pilihan ${choice} belum tepat. Kunci yang benar adalah ${question.correctKeyDisplay}.` : 'Tidak dijawab.';
      }
      break;
    }

    case 'MCMA': {
      const choices = answer.mcmaChoices || [];
      studentAnswerDisplay = choices.length > 0 ? choices.sort().join(', ') : 'Tidak dijawab';
      const correctList = question.correctMcma || [];

      // Pedoman penskoran dokumen:
      // 2 = dua respons benar; 1 = satu respons benar; 0 = tidak ada respons benar atau ada respons pilihan yang seharusnya tidak dipilih.
      const hasIncorrectSelection = choices.some((c) => !correctList.includes(c));

      if (hasIncorrectSelection) {
        score = 0;
        status = 'Salah';
        evaluationReason = 'Terdapat pilihan yang seharusnya tidak dipilih.';
      } else {
        const correctCount = choices.filter((c) => correctList.includes(c)).length;
        if (correctCount === correctList.length && correctCount > 0) {
          score = 2;
          status = 'Benar';
          evaluationReason = 'Seluruh pilihan jawaban tepat.';
        } else if (correctCount === 1) {
          score = 1;
          status = 'Parsial';
          evaluationReason = 'Satu respons benar dipilih tanpa memilih jawaban yang salah.';
        } else {
          score = 0;
          status = 'Salah';
          evaluationReason = 'Belum ada respons benar yang dipilih.';
        }
      }
      break;
    }

    case 'KATEGORI': {
      const catMap = answer.categoryChoices || {};
      const rows = question.categoryRows || [];
      let correctMatches = 0;
      const displayParts: string[] = [];

      rows.forEach((row) => {
        const chosen = catMap[row.id];
        displayParts.push(`${chosen || '-'}`);
        if (chosen && chosen.toLowerCase() === row.correctCategory.toLowerCase()) {
          correctMatches += 1;
        }
      });

      score = correctMatches;
      studentAnswerDisplay = displayParts.join(', ');

      if (score === question.maxScore) {
        status = 'Benar';
        evaluationReason = 'Semua pernyataan dikategorikan dengan benar (4/4).';
      } else if (score > 0) {
        status = 'Parsial';
        evaluationReason = `${score} dari 4 pernyataan dikategorikan dengan tepat.`;
      } else {
        status = 'Salah';
        evaluationReason = 'Tidak ada penempatan kategori yang tepat atau tidak dijawab.';
      }
      break;
    }

    case 'MENJODOHKAN': {
      const matchMap = answer.matchingChoices || {};
      const pairs = question.matchingPairs || [];
      let correctPairs = 0;
      const displayParts: string[] = [];

      pairs.forEach((p) => {
        const chosenRight = matchMap[p.id];
        displayParts.push(`${p.id}-${chosenRight || '?'}`);
        if (chosenRight && chosenRight.toUpperCase() === p.correctRightId.toUpperCase()) {
          correctPairs += 1;
        }
      });

      score = correctPairs;
      studentAnswerDisplay = displayParts.join(', ');

      if (score === question.maxScore) {
        status = 'Benar';
        evaluationReason = 'Seluruh pasangan dijodohkan dengan tepat (3/3).';
      } else if (score > 0) {
        status = 'Parsial';
        evaluationReason = `${score} dari 3 pasangan dijodohkan dengan tepat.`;
      } else {
        status = 'Salah';
        evaluationReason = 'Tidak ada pasangan yang tepat atau tidak dijawab.';
      }
      break;
    }

    case 'URAIAN': {
      const text = (answer.essayText || '').trim();
      studentAnswerDisplay = text || 'Tidak dijawab';

      if (!text) {
        score = 0;
        status = 'Salah';
        evaluationReason = 'Tidak ada jawaban tertulis.';
      } else {
        // Specific intelligent heuristics matching official rubrics for each essay question
        if (question.id === 6) {
          // Soal 6: "delapan ratus dua puluh satu ribu tiga puluh enam" -> 821.036
          // Penjelasan posisi 0 di ratusan / menjaga nilai tempat
          const lower = text.toLowerCase();
          const hasNumber = lower.includes('821.036') || lower.includes('821036') || lower.includes('821 036');
          const mentionsPlace = lower.includes('ratusan') || lower.includes('nilai tempat') || lower.includes('tempat') || lower.includes('posisi 0') || lower.includes('tidak ada ratusan');

          if (hasNumber && mentionsPlace) {
            score = 4;
            status = 'Benar';
            evaluationReason = 'Jawaban lengkap: lambang 821.036 tepat dan penjelasan posisi angka 0 pada ratusan sangat baik.';
          } else if (hasNumber) {
            score = 3;
            status = 'Parsial';
            evaluationReason = 'Lambang 821.036 benar, penjelasan konsep nilai tempat kurang lengkap.';
          } else if (mentionsPlace || lower.includes('821')) {
            score = 2;
            status = 'Parsial';
            evaluationReason = 'Menunjukkan pemahaman nilai tempat/angka sebagian, namun lambang belum sempurna.';
          } else {
            score = 1;
            status = 'Parsial';
            evaluationReason = 'Ada upaya menjawab relevan namun belum memenuhi kriteria utama rubrik.';
          }
        } else if (question.id === 12) {
          // Soal 12: Dekomposisi 682.405 -> 600.000 + 80.000 + 2.000 + 400 + 5
          const normalized = text.replace(/\s+/g, '');
          const lower = text.toLowerCase();
          const has600k = normalized.includes('600.000') || normalized.includes('600000') || lower.includes('6 ratus ribu');
          const has80k = normalized.includes('80.000') || normalized.includes('80000') || lower.includes('8 puluh ribu');
          const has2k = normalized.includes('2.000') || normalized.includes('2000') || lower.includes('2 ribu');
          const has400 = normalized.includes('400') || lower.includes('4 ratus');
          const has5 = normalized.includes('5') || lower.includes('5 satuan');

          const termsFound = [has600k, has80k, has2k, has400, has5].filter(Boolean).length;

          if (termsFound === 5) {
            score = 4;
            status = 'Benar';
            evaluationReason = 'Dekomposisi bilangan berdasarkan nilai tempat ditulis lengkap dan tepat (600.000 + 80.000 + 2.000 + 400 + 5).';
          } else if (termsFound >= 4) {
            score = 3;
            status = 'Parsial';
            evaluationReason = 'Sebagian besar dekomposisi tepat dengan 1 kekurangan kecil.';
          } else if (termsFound >= 2) {
            score = 2;
            status = 'Parsial';
            evaluationReason = 'Menuliskan sebagian komponen nilai tempat dengan benar.';
          } else if (termsFound >= 1) {
            score = 1;
            status = 'Parsial';
            evaluationReason = 'Hanya menyebutkan sedikit komponen nilai tempat.';
          } else {
            score = 0;
            status = 'Salah';
            evaluationReason = 'Dekomposisi belum sesuai dengan bilangan 682.405.';
          }
        } else if (question.id === 18) {
          // Soal 18: Toko paket alat tulis Rp37.500 + Rp4.500 = Rp42.000. Uang Rp50.000 -> Cukup, kembalian Rp8.000
          const lower = text.toLowerCase();
          const hasCukup = lower.includes('cukup') || lower.includes('bisa') || lower.includes('uangnya cukup');
          const has42k = lower.includes('42.000') || lower.includes('42000') || lower.includes('42 ribu');
          const has8k = lower.includes('8.000') || lower.includes('8000') || lower.includes('8 ribu');

          if (hasCukup && has42k && has8k) {
            score = 4;
            status = 'Benar';
            evaluationReason = 'Jawaban sempurna: menyatakan uang cukup, total belanja Rp42.000 benar, dan kembalian Rp8.000 benar.';
          } else if (hasCukup && (has42k || has8k)) {
            score = 3;
            status = 'Parsial';
            evaluationReason = 'Menyatakan uang cukup dengan salah satu perhitungan (total/kembalian) benar.';
          } else if (has42k || has8k || hasCukup) {
            score = 2;
            status = 'Parsial';
            evaluationReason = 'Sebagian hasil atau kesimpulan benar, langkah perhitungan belum lengkap.';
          } else if (lower.includes('37.500') || lower.includes('4.500') || lower.includes('50.000')) {
            score = 1;
            status = 'Parsial';
            evaluationReason = 'Menuliskan angka-angka soal namun belum melakukan perhitungan dan kesimpulan yang tepat.';
          } else {
            score = 0;
            status = 'Salah';
            evaluationReason = 'Jawaban belum relevan dengan permasalahan belanja uang.';
          }
        }
      }
      break;
    }
  }

  return {
    questionId: question.id,
    score,
    maxScore: question.maxScore,
    status,
    studentAnswerDisplay,
    evaluationReason,
  };
}

export function evaluateAttempt(answers: Record<number, AnswerValue>): {
  totalScore: number;
  maxScore: number;
  finalScore: number;
  correctCount: number;
  wrongCount: number;
  partialCount: number;
  isPassed: boolean;
  questionGradings: Record<number, QuestionGrading>;
  tpAnalyses: TPAnalysis[];
} {
  const gradings: Record<number, QuestionGrading> = {};
  let totalScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let partialCount = 0;

  QUESTIONS.forEach((q) => {
    const grading = gradeQuestion(q, answers[q.id]);
    gradings[q.id] = grading;
    totalScore += grading.score;

    if (grading.status === 'Benar') {
      correctCount += 1;
    } else if (grading.status === 'Parsial') {
      partialCount += 1;
    } else {
      wrongCount += 1;
    }
  });

  const maxScore = 45;
  // Nilai = (Skor Perolehan / 45) * 100
  const rawFinalScore = (totalScore / maxScore) * 100;
  const finalScore = Math.round(rawFinalScore * 10) / 10;
  const isPassed = finalScore >= 70;

  // Analisis per TP
  const tpAnalyses: TPAnalysis[] = TP_LIST.map((tp) => {
    const tpQuestions = QUESTIONS.filter((q) => q.tpId === tp.id);
    const questionIds = tpQuestions.map((q) => q.id);
    const questionTypes = tpQuestions.map((q) => q.type);
    const questionMaxScores = tpQuestions.map((q) => q.maxScore);
    const questionStudentScores = tpQuestions.map((q) => gradings[q.id]?.score ?? 0);

    const totalStudentScore = questionStudentScores.reduce((acc, curr) => acc + curr, 0);
    const totalMaxScore = tp.maxScore; // 15
    // Nilai TP = (Total skor diperoleh ÷ Total skor maksimal TP) × 100
    const rawTPNilai = (totalStudentScore / totalMaxScore) * 100;
    const tpNilai = Math.round(rawTPNilai * 10) / 10;

    const { code, category } = getTPCategory(tpNilai);
    const description = getTPDescription(tp.id, code);

    return {
      tpId: tp.id,
      tpCode: tp.code,
      tpTitle: tp.title,
      questionIds,
      questionTypes,
      questionMaxScores,
      questionStudentScores,
      totalMaxScore,
      totalStudentScore,
      nilai: tpNilai,
      code,
      category,
      description,
    };
  });

  return {
    totalScore,
    maxScore,
    finalScore,
    correctCount,
    wrongCount,
    partialCount,
    isPassed,
    questionGradings: gradings,
    tpAnalyses,
  };
}
