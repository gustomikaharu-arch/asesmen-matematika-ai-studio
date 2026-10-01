import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Attempt, Question } from '../types';
import { ASSESSMENT_INFO, QUESTIONS, STUDENTS_LIST, TP_LIST } from '../data/assessmentData';

// PDF 1: Hasil Pekerjaan Siswa (Individual)
export function generateStudentWorkPdf(attempt: Attempt): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 14;

  // Header / Kop Dokumen
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text('PEMERINTAH KABUPATEN GORONTALO UTARA', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  doc.setFontSize(15);
  doc.text('SD NEGERI 11 ANGGREK', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('LAPORAN HASIL ASESMEN SUMATIF PESERTA DIDIK - KURIKULUM MERDEKA', pageWidth / 2, currentY, { align: 'center' });
  currentY += 3;

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 6;

  // Identitas Siswa & Asesmen
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('A. IDENTITAS PESERTA DIDIK & ASESMEN', 14, currentY);
  currentY += 4;

  const durMinutes = Math.floor((attempt.durationSeconds || 0) / 60);
  const durSecs = (attempt.durationSeconds || 0) % 60;
  const durDisplay = `${durMinutes} menit ${durSecs} detik`;
  const startTime = attempt.startedAt ? new Date(attempt.startedAt).toLocaleString('id-ID') : '-';
  const finishTime = attempt.completedAt ? new Date(attempt.completedAt).toLocaleString('id-ID') : '-';

  autoTable(doc, {
    startY: currentY,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 1.2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', cellWidth: 35 },
      3: { cellWidth: 55 },
    },
    body: [
      ['Nama Siswa', `: ${attempt.studentName}`, 'Mata Pelajaran', `: ${ASSESSMENT_INFO.subject}`],
      ['Sekolah', `: ${ASSESSMENT_INFO.school}`, 'Materi Pokok', `: ${ASSESSMENT_INFO.scope}`],
      ['Kelas / Fase', `: ${ASSESSMENT_INFO.grade} / Fase ${ASSESSMENT_INFO.phase}`, 'Waktu Mulai', `: ${startTime}`],
      ['Guru Kelas', `: ${ASSESSMENT_INFO.teacher}`, 'Waktu Selesai', `: ${finishTime}`],
      ['Nomor Attempt', `: Percobaan ke-${attempt.attemptNumber || 1}`, 'Durasi Pengerjaan', `: ${durDisplay}`],
    ],
  });

  // @ts-expect-error autoTable adds lastAutoTable to doc
  currentY = doc.lastAutoTable.finalY + 6;

  // B. Ringkasan Nilai
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('B. RINGKASAN HASIL PENILAIAN', 14, currentY);
  currentY += 4;

  const finalScore = attempt.finalScore ?? 0;
  const isLulus = finalScore >= 70;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Total Skor', 'Skor Maksimal', 'Nilai Akhir (0-100)', 'Benar', 'Parsial', 'Salah', 'Ketuntasan']],
    body: [
      [
        `${attempt.totalScore ?? 0}`,
        `${attempt.maxScore ?? 45}`,
        `${finalScore}`,
        `${attempt.correctCount ?? 0}`,
        `${attempt.partialCount ?? 0}`,
        `${attempt.wrongCount ?? 0}`,
        isLulus ? 'TUNTAS' : 'PERLU BIMBINGAN',
      ],
    ],
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 9, halign: 'center', cellPadding: 2 },
  });

  // @ts-expect-error autoTable
  currentY = doc.lastAutoTable.finalY + 6;

  // C. Analisis Ketercapaian per TP
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('C. ANALISIS CAPAIAN PEMBELAJARAN (PER TP)', 14, currentY);
  currentY += 4;

  const tpRows = (attempt.tpAnalyses || []).map((tp) => [
    tp.tpCode,
    tp.tpTitle,
    `${tp.totalStudentScore} / ${tp.totalMaxScore}`,
    `${tp.nilai}`,
    `${tp.code} (${tp.category})`,
    tp.description,
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['TP', 'Tujuan Pembelajaran', 'Skor', 'Nilai', 'Kategori', 'Deskripsi Ketercapaian']],
    body: tpRows,
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 15, fontStyle: 'bold', halign: 'center' },
      1: { cellWidth: 48, fontSize: 7.5 },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 26, fontSize: 7.5 },
      5: { cellWidth: 63, fontSize: 7.5 },
    },
    styles: { fontSize: 8, cellPadding: 1.8 },
  });

  // @ts-expect-error autoTable
  currentY = doc.lastAutoTable.finalY + 8;

  // Page break for Detailed Questions
  doc.addPage();
  currentY = 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('D. DETAIL PEKERJAAN SISWA (SEMUA 18 SOAL)', 14, currentY);
  currentY += 5;

  const gradings = attempt.questionGradings || {};

  QUESTIONS.forEach((q, idx) => {
    const gr = gradings[q.id];
    const score = gr ? gr.score : 0;
    const status = gr ? gr.status : 'Salah';
    const answerGiven = gr ? gr.studentAnswerDisplay : 'Tidak dijawab';

    if (currentY > 240) {
      doc.addPage();
      currentY = 14;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 138);
    doc.text(`SOAL NOMOR ${q.id} [${q.tpCode}] — Bentuk: ${q.type} | Level: ${q.level}`, 14, currentY);
    currentY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    if (q.stimulus) {
      const splitStimulus = doc.splitTextToSize(`Stimulus: ${q.stimulus}`, pageWidth - 28);
      doc.text(splitStimulus, 14, currentY);
      currentY += splitStimulus.length * 3.5 + 1;
    }

    const splitQ = doc.splitTextToSize(`Pertanyaan: ${q.questionText}`, pageWidth - 28);
    doc.text(splitQ, 14, currentY);
    currentY += splitQ.length * 3.5 + 2;

    // Table item result
    autoTable(doc, {
      startY: currentY,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.5 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 32, fillColor: [248, 250, 252] },
        1: { cellWidth: pageWidth - 28 - 32 },
      },
      body: [
        ['Jawaban Siswa', answerGiven],
        ['Skor Diperoleh', `${score} dari ${q.maxScore} (Status: ${status})`],
        ['Kunci Jawaban', q.correctKeyDisplay],
        ['Pembahasan', q.explanation],
      ],
    });

    // @ts-expect-error autoTable
    currentY = doc.lastAutoTable.finalY + 4;
  });

  // Signatures on last page
  if (currentY > 230) {
    doc.addPage();
    currentY = 14;
  }
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  const dateNow = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Anggrek, ${dateNow}`, pageWidth - 70, currentY);
  currentY += 4;
  doc.text('Mengetahui / Mengesahkan,', 14, currentY);
  doc.text('Guru Mata Pelajaran,', pageWidth - 70, currentY);
  currentY += 18;
  doc.setFont('helvetica', 'bold');
  doc.text('Orang Tua / Wali Murid', 14, currentY);
  doc.text(ASSESSMENT_INFO.teacher, pageWidth - 70, currentY);

  return doc;
}

// PDF 2: Analisis Nilai per TP (Format Guru Lengkap)
export function generateTeacherTPAnalysisPdf(attemptsMap: Record<string, Attempt>): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 14;

  // Header / Kop Guru
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('SD NEGERI 11 ANGGREK', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  doc.setFontSize(12);
  doc.text('FORMAT ANALISIS HASIL PENILAIAN PER TUJUAN PEMBELAJARAN (TP)', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Mata Pelajaran: ${ASSESSMENT_INFO.subject} | Kelas/Fase: ${ASSESSMENT_INFO.grade}/Fase ${ASSESSMENT_INFO.phase} | Semester: ${ASSESSMENT_INFO.semester} | Guru: ${ASSESSMENT_INFO.teacher}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 3;

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 6;

  // Loop through each TP as mandated: ANALISIS TP 1, ANALISIS TP 2, ANALISIS TP 3
  TP_LIST.forEach((tp, tpIdx) => {
    if (tpIdx > 0) {
      doc.addPage();
      currentY = 14;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138);
    doc.text(`ANALISIS ${tp.code}`, 14, currentY);
    currentY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const splitTpTitle = doc.splitTextToSize(`Tujuan Pembelajaran: ${tp.title}`, pageWidth - 28);
    doc.text(splitTpTitle, 14, currentY);
    currentY += splitTpTitle.length * 4 + 2;

    const tpQuestions = QUESTIONS.filter((q) => q.tpId === tp.id);

    // Structure mandated: No | Nama Siswa | Nomor Soal (with Bentuk & Skor) | TOTAL SKOR | NILAI | KET | DESKRIPSI
    const tableHead1 = [
      { content: 'No', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'Nama Siswa', rowSpan: 2, styles: { halign: 'left' as const, valign: 'middle' as const } },
      ...tpQuestions.map((q) => ({
        content: `Soal ${q.id}\n(${q.type})\n[Maks: ${q.maxScore}]`,
        styles: { halign: 'center' as const },
      })),
      { content: `TOTAL\nSKOR\n[${tp.maxScore}]`, rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'NILAI\n(0-100)', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'KET\n(KODE)', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'DESKRIPSI KETERCAPAIAN', rowSpan: 2, styles: { halign: 'left' as const, valign: 'middle' as const } },
    ];

    // Filter students: Note from prompt "Jika mau menghitung presentase atau memasukan nilai dalam daftar nilai atau rapor jangan Masukan ke hitungan atau daftar siswa atas nama FERY KAHARU No. 16."
    const validStudents = STUDENTS_LIST.filter((s) => !s.name.toUpperCase().includes('FERY KAHARU'));

    const tableBody = validStudents.map((student, idx) => {
      const studentAttempt = attemptsMap[String(student.id)];
      const hasCompleted = studentAttempt && studentAttempt.status === 'completed';

      if (!hasCompleted) {
        return [
          `${idx + 1}`,
          student.name,
          ...tpQuestions.map(() => '-'),
          '-',
          '-',
          'Belum',
          'Belum mengerjakan asesmen',
        ];
      }

      const gradings = studentAttempt.questionGradings || {};
      const tpAnalysis = (studentAttempt.tpAnalyses || []).find((t) => t.tpId === tp.id);

      const scoresCells = tpQuestions.map((q) => `${gradings[q.id]?.score ?? 0}`);
      const totScore = tpAnalysis?.totalStudentScore ?? 0;
      const nilai = tpAnalysis?.nilai ?? 0;
      const code = tpAnalysis?.code ?? '-';
      const desc = tpAnalysis?.description ?? '-';

      return [
        `${idx + 1}`,
        student.name,
        ...scoresCells,
        `${totScore}`,
        `${nilai}`,
        `${code}`,
        desc,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      theme: 'grid',
      head: [tableHead1],
      body: tableBody,
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 46, fontStyle: 'bold', fontSize: 7 },
        // Soal cols: 6 questions
        2: { cellWidth: 16, halign: 'center' },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 16, halign: 'center' },
        6: { cellWidth: 16, halign: 'center' },
        7: { cellWidth: 16, halign: 'center' },
        8: { cellWidth: 17, halign: 'center', fontStyle: 'bold' },
        9: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        10: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
        11: { cellWidth: 68, fontSize: 6.8 },
      },
      styles: { fontSize: 7.2, cellPadding: 1.4 },
    });

    // @ts-expect-error autoTable
    currentY = doc.lastAutoTable.finalY + 5;
  });

  // Final Summary Page
  doc.addPage();
  currentY = 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 138);
  doc.text('REKAPITULASI NILAI AKHIR ASESMEN & TINGKAT KETUNTASAN', 14, currentY);
  currentY += 6;

  const validStudents = STUDENTS_LIST.filter((s) => !s.name.toUpperCase().includes('FERY KAHARU'));
  const summaryRows = validStudents.map((s, idx) => {
    const att = attemptsMap[String(s.id)];
    if (!att || att.status !== 'completed') {
      return [`${idx + 1}`, s.name, '-', '-', '-', '-', '-', 'Belum Tes'];
    }

    const tp1 = (att.tpAnalyses || []).find((t) => t.tpId === 1)?.nilai ?? 0;
    const tp2 = (att.tpAnalyses || []).find((t) => t.tpId === 2)?.nilai ?? 0;
    const tp3 = (att.tpAnalyses || []).find((t) => t.tpId === 3)?.nilai ?? 0;
    const totScore = att.totalScore ?? 0;
    const finalNilai = att.finalScore ?? 0;
    const ket = finalNilai >= 70 ? 'TUNTAS' : 'PERLU BIMBINGAN';

    return [
      `${idx + 1}`,
      s.name,
      `${tp1}`,
      `${tp2}`,
      `${tp3}`,
      `${totScore} / 45`,
      `${finalNilai}`,
      ket,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['No', 'Nama Siswa', 'Nilai TP 1', 'Nilai TP 2', 'Nilai TP 3', 'Total Skor (45)', 'Nilai Akhir (100)', 'Status Ketuntasan']],
    body: summaryRows,
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 8, cellPadding: 1.8, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 70, halign: 'left', fontStyle: 'bold' },
    },
  });

  // @ts-expect-error autoTable
  currentY = doc.lastAutoTable.finalY + 8;
  if (currentY > 165) {
    doc.addPage();
    currentY = 14;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const dateNow = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Anggrek, ${dateNow}`, pageWidth - 70, currentY);
  currentY += 4;
  doc.text('Mengetahui,', 20, currentY);
  doc.text('Guru Kelas V,', pageWidth - 70, currentY);
  currentY += 4;
  doc.text('Kepala SDN 11 Anggrek', 20, currentY);
  currentY += 18;
  doc.setFont('helvetica', 'bold');
  doc.text('( .................................................... )', 20, currentY);
  doc.text(ASSESSMENT_INFO.teacher, pageWidth - 70, currentY);

  return doc;
}
