export type QuestionType = 'PG' | 'MCMA' | 'KATEGORI' | 'MENJODOHKAN' | 'URAIAN';

export interface MultipleChoiceOption {
  id: string; // 'A' | 'B' | 'C' | 'D'
  text: string;
}

export interface CategoryRow {
  id: string;
  statement: string;
  correctCategory: string; // 'Benar' | 'Salah' or custom label
}

export interface MatchingPair {
  id: string; // e.g. '1', '2', '3'
  leftText: string;
  correctRightId: string; // e.g. 'A', 'B', 'C'
}

export interface MatchingRightItem {
  id: string; // 'A', 'B', 'C'
  text: string;
}

export interface Question {
  id: number;
  tpId: number; // 1, 2, or 3
  tpCode: string; // 'TP 1', 'TP 2', 'TP 3'
  tpTitle: string;
  type: QuestionType;
  level: string; // 'C2', 'C3', 'C4'
  maxScore: number;
  stimulus?: string;
  questionText: string;
  // For PG:
  options?: MultipleChoiceOption[];
  // For MCMA:
  mcmaOptions?: MultipleChoiceOption[];
  correctMcma?: string[];
  // For KATEGORI:
  categoryLabels?: [string, string]; // e.g. ['Benar', 'Salah'] or ['Ditulis dengan benar', 'Ditulis tidak benar']
  categoryRows?: CategoryRow[];
  // For MENJODOHKAN:
  matchingPairs?: MatchingPair[];
  matchingRightItems?: MatchingRightItem[];
  // For URAIAN:
  referenceAnswer?: string;
  scoringGuide?: string;
  // Key display:
  correctKeyDisplay: string;
  // Discussion:
  explanation: string;
}

export interface Student {
  id: number;
  name: string;
  nisn?: string;
  isTestUser?: boolean;
}

export interface AnswerValue {
  pgChoice?: string; // 'A' | 'B' | 'C' | 'D'
  mcmaChoices?: string[]; // e.g. ['A', 'B']
  categoryChoices?: Record<string, string>; // { 'row_1': 'Benar', 'row_2': 'Salah' }
  matchingChoices?: Record<string, string>; // { '1': 'B', '2': 'A', '3': 'C' }
  essayText?: string;
}

export interface QuestionGrading {
  questionId: number;
  score: number;
  maxScore: number;
  status: 'Benar' | 'Salah' | 'Parsial';
  studentAnswerDisplay: string;
  teacherScoreOverride?: number;
  evaluationReason?: string;
}

export interface TPAnalysis {
  tpId: number;
  tpCode: string;
  tpTitle: string;
  questionIds: number[];
  questionTypes: string[];
  questionMaxScores: number[];
  questionStudentScores: number[];
  totalMaxScore: number;
  totalStudentScore: number;
  nilai: number; // 0 - 100
  code: 'BB' | 'MB' | 'BSH' | 'SB';
  category: 'Belum Berkembang' | 'Mulai Berkembang' | 'Berkembang Sesuai Harapan' | 'Sangat Berkembang';
  description: string;
}

export interface Attempt {
  id: string; // unique ID: studentId_assessmentId_attemptNumber
  studentId: number;
  studentName: string;
  assessmentId: string;
  attemptNumber: number;
  startedAt: string; // ISO string
  completedAt?: string; // ISO string
  durationSeconds: number;
  status: 'in_progress' | 'completed';
  answers: Record<number, AnswerValue>;
  activeQuestionIndex: number;
  // Results populated after submit:
  totalScore?: number;
  maxScore?: number;
  finalScore?: number; // 0 - 100
  correctCount?: number;
  wrongCount?: number;
  partialCount?: number;
  isPassed?: boolean;
  questionGradings?: Record<number, QuestionGrading>;
  tpAnalyses?: TPAnalysis[];
  lastSavedAt: string;
}

export interface AttemptHistoryItem {
  id: string;
  studentId: number;
  studentName: string;
  attemptNumber: number;
  startedAt: string;
  completedAt?: string;
  durationSeconds: number;
  finalScore?: number;
  totalScore?: number;
  resetAt: string;
  reason?: string;
}

export interface DatabaseState {
  attempts: Record<string, Attempt>; // key: studentId as string -> current active attempt
  history: AttemptHistoryItem[];
  lastUpdated: string;
}
