import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { evaluateAttempt } from './src/utils/gradingEngine';
import { DatabaseState, Attempt, AttemptHistoryItem } from './src/types';
import { STUDENTS_LIST, ASSESSMENT_INFO, QUESTIONS } from './src/data/assessmentData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_FILE = path.join(__dirname, 'data', 'assessment_db.json');

// Ensure data folder and file exists
if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

function readDatabase(): DatabaseState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }
  return { attempts: {}, history: [], lastUpdated: new Date().toISOString() };
}

function writeDatabase(data: DatabaseState): void {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // Get assessment info & students
  app.get('/api/assessment-meta', (req, res) => {
    res.json({
      info: ASSESSMENT_INFO,
      students: STUDENTS_LIST,
      questionsCount: QUESTIONS.length,
    });
  });

  // Get all attempts (for teacher dashboard)
  app.get('/api/attempts', (req, res) => {
    const db = readDatabase();
    res.json(db.attempts);
  });

  // Get single student attempt
  app.get('/api/attempts/:studentId', (req, res) => {
    const studentId = parseInt(req.params.studentId, 10);
    const db = readDatabase();
    const attempt = db.attempts[String(studentId)];
    res.json(attempt || null);
  });

  // Start or resume attempt for a student
  app.post('/api/attempts/start', (req, res) => {
    const { studentId, studentName } = req.body;
    if (!studentId || !studentName) {
      return res.status(400).json({ error: 'studentId and studentName are required' });
    }

    const db = readDatabase();
    const existing = db.attempts[String(studentId)];

    if (existing) {
      return res.json(existing);
    }

    // Determine attempt number based on history
    const pastAttempts = db.history.filter((h) => h.studentId === studentId);
    const attemptNumber = pastAttempts.length + 1;
    const attemptId = `${studentId}_${ASSESSMENT_INFO.id}_${attemptNumber}`;

    const newAttempt: Attempt = {
      id: attemptId,
      studentId,
      studentName,
      assessmentId: ASSESSMENT_INFO.id,
      attemptNumber,
      startedAt: new Date().toISOString(),
      durationSeconds: 0,
      status: 'in_progress',
      answers: {},
      activeQuestionIndex: 0,
      lastSavedAt: new Date().toISOString(),
    };

    db.attempts[String(studentId)] = newAttempt;
    writeDatabase(db);
    res.json(newAttempt);
  });

  // Autosave progress
  app.post('/api/attempts/save-progress', (req, res) => {
    const { studentId, answers, activeQuestionIndex, durationSeconds } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    const db = readDatabase();
    const attempt = db.attempts[String(studentId)];
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    if (attempt.status === 'completed') {
      return res.json(attempt); // already completed, do not overwrite answers
    }

    attempt.answers = answers || attempt.answers;
    if (typeof activeQuestionIndex === 'number') {
      attempt.activeQuestionIndex = activeQuestionIndex;
    }
    if (typeof durationSeconds === 'number') {
      attempt.durationSeconds = durationSeconds;
    }
    attempt.lastSavedAt = new Date().toISOString();

    db.attempts[String(studentId)] = attempt;
    writeDatabase(db);
    res.json({ success: true, lastSavedAt: attempt.lastSavedAt });
  });

  // Submit attempt
  app.post('/api/attempts/submit', (req, res) => {
    const { studentId, answers, durationSeconds } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    const db = readDatabase();
    let attempt = db.attempts[String(studentId)];

    if (!attempt) {
      const student = STUDENTS_LIST.find((s) => s.id === Number(studentId));
      const studentName = student ? student.name : `Siswa ${studentId}`;
      attempt = {
        id: `${studentId}_${ASSESSMENT_INFO.id}_1`,
        studentId: Number(studentId),
        studentName,
        assessmentId: ASSESSMENT_INFO.id,
        attemptNumber: 1,
        startedAt: new Date().toISOString(),
        durationSeconds: durationSeconds || 0,
        status: 'in_progress',
        answers: answers || {},
        activeQuestionIndex: 0,
        lastSavedAt: new Date().toISOString(),
      };
    }

    const finalAnswers = answers || attempt.answers || {};
    const evaluation = evaluateAttempt(finalAnswers);

    attempt.answers = finalAnswers;
    attempt.status = 'completed';
    attempt.completedAt = new Date().toISOString();
    if (typeof durationSeconds === 'number') {
      attempt.durationSeconds = durationSeconds;
    }

    attempt.totalScore = evaluation.totalScore;
    attempt.maxScore = evaluation.maxScore;
    attempt.finalScore = evaluation.finalScore;
    attempt.correctCount = evaluation.correctCount;
    attempt.wrongCount = evaluation.wrongCount;
    attempt.partialCount = evaluation.partialCount;
    attempt.isPassed = evaluation.isPassed;
    attempt.questionGradings = evaluation.questionGradings;
    attempt.tpAnalyses = evaluation.tpAnalyses;
    attempt.lastSavedAt = new Date().toISOString();

    db.attempts[String(studentId)] = attempt;
    writeDatabase(db);

    res.json(attempt);
  });

  // Verify teacher login
  app.post('/api/admin/verify', (req, res) => {
    const { teacherName } = req.body;
    if (!teacherName) {
      return res.status(400).json({ error: 'Nama guru wajib diisi' });
    }

    const normalized = teacherName.trim().toUpperCase();
    if (normalized === 'SULTRIYANTI POU' || normalized === 'SULTRIYANTI POU S.PD' || normalized === 'SULTRIYANTI POU S.PD.') {
      return res.json({ authenticated: true, teacherName: 'SULTRIYANTI POU S.Pd.' });
    }

    return res.status(401).json({ authenticated: false, message: 'Akses ditolak. Nama guru tidak terverifikasi.' });
  });

  // Reset student attempt (moves to history)
  app.post('/api/admin/reset-student', (req, res) => {
    const { studentId, reason } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    const db = readDatabase();
    const current = db.attempts[String(studentId)];

    if (current) {
      const historyItem: AttemptHistoryItem = {
        id: current.id,
        studentId: current.studentId,
        studentName: current.studentName,
        attemptNumber: current.attemptNumber,
        startedAt: current.startedAt,
        completedAt: current.completedAt,
        durationSeconds: current.durationSeconds,
        finalScore: current.finalScore,
        totalScore: current.totalScore,
        resetAt: new Date().toISOString(),
        reason: reason || 'Direset oleh guru',
      };
      db.history.push(historyItem);
      delete db.attempts[String(studentId)];
      writeDatabase(db);
    }

    res.json({ success: true, message: `Pekerjaan siswa ID ${studentId} berhasil direset.` });
  });

  // Teacher override score for specific question (e.g. essay grading review)
  app.post('/api/admin/override-score', (req, res) => {
    const { studentId, questionId, score } = req.body;
    const db = readDatabase();
    const attempt = db.attempts[String(studentId)];
    if (!attempt || !attempt.questionGradings) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const grading = attempt.questionGradings[questionId];
    if (grading) {
      grading.score = Number(score);
      grading.teacherScoreOverride = Number(score);
      if (grading.score === grading.maxScore) {
        grading.status = 'Benar';
      } else if (grading.score > 0) {
        grading.status = 'Parsial';
      } else {
        grading.status = 'Salah';
      }
    }

    // Recalculate totals
    let newTotal = 0;
    let corrects = 0;
    let partials = 0;
    let wrongs = 0;

    QUESTIONS.forEach((q) => {
      const gr = attempt.questionGradings![q.id];
      if (gr) {
        newTotal += gr.score;
        if (gr.status === 'Benar') corrects += 1;
        else if (gr.status === 'Parsial') partials += 1;
        else wrongs += 1;
      }
    });

    attempt.totalScore = newTotal;
    attempt.finalScore = Math.round(((newTotal / 45) * 100) * 10) / 10;
    attempt.correctCount = corrects;
    attempt.partialCount = partials;
    attempt.wrongCount = wrongs;
    attempt.isPassed = attempt.finalScore >= 70;

    // Recalculate TP analysis
    attempt.tpAnalyses?.forEach((tp) => {
      const tpQuestions = QUESTIONS.filter((q) => q.tpId === tp.tpId);
      const studentScores = tpQuestions.map((q) => attempt.questionGradings![q.id]?.score ?? 0);
      const sum = studentScores.reduce((a, b) => a + b, 0);
      tp.questionStudentScores = studentScores;
      tp.totalStudentScore = sum;
      tp.nilai = Math.round(((sum / tp.totalMaxScore) * 100) * 10) / 10;
    });

    db.attempts[String(studentId)] = attempt;
    writeDatabase(db);
    res.json(attempt);
  });

  // Get full attempt history
  app.get('/api/admin/history', (req, res) => {
    const db = readDatabase();
    res.json(db.history || []);
  });

  // Seed sample student attempts if database is empty (so the teacher can preview realistic full dashboard immediately)
  app.post('/api/admin/seed-demo', (req, res) => {
    const db = readDatabase();
    // Seed 4 sample students with realistic answers if not yet present
    const demoStudents = [
      { id: 1, name: "AIN'NUN DAVINA LAMATO" },
      { id: 2, name: "ALISA PUTRI ABUNA" },
      { id: 3, name: "ALNANDO HASAN" },
    ];

    demoStudents.forEach((student, index) => {
      if (!db.attempts[String(student.id)]) {
        const dummyAnswers = {
          1: { pgChoice: 'A' },
          2: { pgChoice: index === 2 ? 'A' : 'B' },
          3: { mcmaChoices: ['A', 'B'] },
          4: { categoryChoices: { row_1: 'Ditulis dengan benar', row_2: 'Ditulis dengan benar', row_3: 'Ditulis dengan benar', row_4: 'Ditulis tidak benar' } },
          5: { matchingChoices: { '1': 'B', '2': 'A', '3': 'C' } },
          6: { essayText: '821.036. Angka 0 di tempat ratusan menjaga nilai tempat puluhan dan satuan.' },
          7: { pgChoice: 'B' },
          8: { pgChoice: 'A' },
          9: { mcmaChoices: ['A', 'C'] },
          10: { categoryChoices: { row_1: 'Benar', row_2: 'Benar', row_3: 'Benar', row_4: 'Salah' } },
          11: { matchingChoices: { '1': 'B', '2': 'A', '3': 'C' } },
          12: { essayText: '600.000 + 80.000 + 2.000 + 400 + 5' },
          13: { pgChoice: 'B' },
          14: { pgChoice: 'B' },
          15: { mcmaChoices: ['A', 'B'] },
          16: { categoryChoices: { row_1: 'Benar', row_2: 'Benar', row_3: 'Benar', row_4: 'Salah' } },
          17: { matchingChoices: { '1': 'B', '2': 'C', '3': 'A' } },
          18: { essayText: 'Uang Nisa cukup. Total belanja Rp42.000, kembalian Rp8.000.' },
        };
        const evaluation = evaluateAttempt(dummyAnswers as any);
        db.attempts[String(student.id)] = {
          id: `${student.id}_${ASSESSMENT_INFO.id}_1`,
          studentId: student.id,
          studentName: student.name,
          assessmentId: ASSESSMENT_INFO.id,
          attemptNumber: 1,
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          completedAt: new Date(Date.now() - 1800000).toISOString(),
          durationSeconds: 1420 - index * 120,
          status: 'completed',
          answers: dummyAnswers as any,
          activeQuestionIndex: 17,
          totalScore: evaluation.totalScore - (index === 2 ? 5 : 0),
          maxScore: 45,
          finalScore: Math.round((((evaluation.totalScore - (index === 2 ? 5 : 0)) / 45) * 100) * 10) / 10,
          correctCount: evaluation.correctCount - (index === 2 ? 2 : 0),
          wrongCount: evaluation.wrongCount + (index === 2 ? 2 : 0),
          partialCount: evaluation.partialCount,
          isPassed: true,
          questionGradings: evaluation.questionGradings,
          tpAnalyses: evaluation.tpAnalyses,
          lastSavedAt: new Date().toISOString(),
        };
      }
    });

    writeDatabase(db);
    res.json({ success: true, count: Object.keys(db.attempts).length });
  });

  // In production, serve built dist files; in dev, attach Vite middleware
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on http://0.0.0.0:${PORT}`);
  });
}

startServer();
