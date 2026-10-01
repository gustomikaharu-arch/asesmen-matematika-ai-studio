import { Attempt, AttemptHistoryItem } from '../types';

export async function fetchAllAttempts(): Promise<Record<string, Attempt>> {
  try {
    const res = await fetch('/api/attempts');
    if (!res.ok) throw new Error('Failed to fetch attempts');
    return await res.json();
  } catch (err) {
    console.warn('API error fetching all attempts, checking local cache:', err);
    const cached = localStorage.getItem('s_attempts_cache');
    return cached ? JSON.parse(cached) : {};
  }
}

export async function fetchStudentAttempt(studentId: number): Promise<Attempt | null> {
  try {
    const res = await fetch(`/api/attempts/${studentId}`);
    if (!res.ok) throw new Error('Failed to fetch student attempt');
    return await res.json();
  } catch (err) {
    console.warn('API error fetching student attempt:', err);
    const cached = localStorage.getItem(`attempt_${studentId}`);
    return cached ? JSON.parse(cached) : null;
  }
}

export async function startStudentAttempt(studentId: number, studentName: string): Promise<Attempt> {
  const res = await fetch('/api/attempts/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, studentName }),
  });
  if (!res.ok) {
    throw new Error('Gagal memulai asesmen pada server');
  }
  const data = await res.json();
  localStorage.setItem(`attempt_${studentId}`, JSON.stringify(data));
  return data;
}

export async function saveAttemptProgress(
  studentId: number,
  answers: any,
  activeQuestionIndex: number,
  durationSeconds: number
): Promise<void> {
  try {
    await fetch('/api/attempts/save-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, answers, activeQuestionIndex, durationSeconds }),
    });
  } catch (err) {
    console.warn('Failed to save to server, saving locally:', err);
  }
}

export async function submitStudentAttempt(
  studentId: number,
  answers: any,
  durationSeconds: number
): Promise<Attempt> {
  const res = await fetch('/api/attempts/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, answers, durationSeconds }),
  });
  if (!res.ok) {
    throw new Error('Gagal mengirimkan asesmen ke server');
  }
  const data: Attempt = await res.json();
  localStorage.setItem(`attempt_${studentId}`, JSON.stringify(data));
  return data;
}

export async function verifyTeacherLogin(teacherName: string): Promise<boolean> {
  const res = await fetch('/api/admin/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teacherName }),
  });
  return res.ok;
}

export async function resetStudent(studentId: number, reason?: string): Promise<void> {
  const res = await fetch('/api/admin/reset-student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, reason }),
  });
  if (!res.ok) throw new Error('Gagal mereset pekerjaan siswa');
  localStorage.removeItem(`attempt_${studentId}`);
}

export async function overrideQuestionScore(studentId: number, questionId: number, score: number): Promise<Attempt> {
  const res = await fetch('/api/admin/override-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, questionId, score }),
  });
  if (!res.ok) throw new Error('Gagal memperbarui nilai');
  return await res.json();
}

export async function fetchAttemptHistory(): Promise<AttemptHistoryItem[]> {
  try {
    const res = await fetch('/api/admin/history');
    if (!res.ok) throw new Error('Failed to fetch history');
    return await res.json();
  } catch (err) {
    console.warn('Error fetching history:', err);
    return [];
  }
}

export async function seedDemoData(): Promise<void> {
  await fetch('/api/admin/seed-demo', { method: 'POST' });
}
