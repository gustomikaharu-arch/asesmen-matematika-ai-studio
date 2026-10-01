import { Attempt } from '../types';
import { ASSESSMENT_INFO, QUESTIONS, STUDENTS_LIST, TP_LIST } from '../data/assessmentData';

export function exportAnalysisToExcelCsv(attemptsMap: Record<string, Attempt>): void {
  const validStudents = STUDENTS_LIST.filter((s) => !s.name.toUpperCase().includes('FERY KAHARU'));

  // CSV lines with UTF-8 BOM
  const lines: string[] = [];

  lines.push(`"${ASSESSMENT_INFO.school} - FORMAT ANALISIS ASESMEN SUMATIF"`);
  lines.push(`"Mata Pelajaran: ${ASSESSMENT_INFO.subject}"`);
  lines.push(`"Kelas: ${ASSESSMENT_INFO.grade} | Fase: ${ASSESSMENT_INFO.phase} | Semester: ${ASSESSMENT_INFO.semester}"`);
  lines.push(`"Guru: ${ASSESSMENT_INFO.teacher}"`);
  lines.push(`"Tanggal Unduh: ${new Date().toLocaleDateString('id-ID')}"`);
  lines.push('');

  // Headers
  const questionHeaders = QUESTIONS.map((q) => `"S${q.id} (${q.type}, ${q.maxScore})"`).join(',');
  const header = `"No","Nama Siswa",${questionHeaders},"Total Skor (45)","Nilai Akhir (100)","Nilai TP1 (100)","Kategori TP1","Nilai TP2 (100)","Kategori TP2","Nilai TP3 (100)","Kategori TP3","Status Ketuntasan"`;
  lines.push(header);

  validStudents.forEach((student, index) => {
    const att = attemptsMap[String(student.id)];
    if (!att || att.status !== 'completed') {
      const emptyScores = QUESTIONS.map(() => '""').join(',');
      lines.push(`"${index + 1}","${student.name}",${emptyScores},"0","0","-","-","-","-","-","-","Belum Mengerjakan"`);
      return;
    }

    const gradings = att.questionGradings || {};
    const questionScores = QUESTIONS.map((q) => `"${gradings[q.id]?.score ?? 0}"`).join(',');

    const tp1 = (att.tpAnalyses || []).find((t) => t.tpId === 1);
    const tp2 = (att.tpAnalyses || []).find((t) => t.tpId === 2);
    const tp3 = (att.tpAnalyses || []).find((t) => t.tpId === 3);

    const totalScore = att.totalScore ?? 0;
    const finalScore = att.finalScore ?? 0;
    const ket = finalScore >= 70 ? 'TUNTAS' : 'PERLU BIMBINGAN';

    lines.push(
      `"${index + 1}","${student.name}",${questionScores},"${totalScore}","${finalScore}","${tp1?.nilai ?? 0}","${tp1?.code ?? '-'}","${tp2?.nilai ?? 0}","${tp2?.code ?? '-'}","${tp3?.nilai ?? 0}","${tp3?.code ?? '-'}","${ket}"`
    );
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Analisis_Asesmen_Kelas_V_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
