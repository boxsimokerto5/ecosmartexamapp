import { jsPDF } from "jspdf";
import { Exam, Result } from "../types";
import { doc as firestoreDoc, getDoc } from "./firebase";
import { db } from "./firebase";

export async function generateStudentExamPDF(result: Result, exam: Exam) {
  // Fetch school details if schoolId exists
  let foundation = "YAYASAN PENDIDIKAN SMART UJIAN INDONESIA";
  let schoolName = result.schoolName || "SEKOLAH SMARTUJI";
  let address = "Alamat: Kompleks Pendidikan Nasional Raya No. 100, Indonesia";
  let contactInfo = "Telepon: (021) 555-0199 • Email: info@smartujian.sch.id • Website: www.smartujian.sch.id";
  let logoUrl: string | null = null;

  const schoolId = result.schoolId || (exam as any).schoolId;
  if (schoolId) {
    try {
      const schoolDoc = await getDoc(firestoreDoc(db, "schools", schoolId));
      if (schoolDoc.exists()) {
        const data = schoolDoc.data();
        if (data.foundation) foundation = data.foundation;
        if (data.name) schoolName = data.name;
        if (data.address) address = `Alamat: ${data.address}`;
        if (data.logoUrl) logoUrl = data.logoUrl;
        
        const phoneStr = data.phone ? `Telepon: ${data.phone}` : "";
        const emailStr = data.email ? `Email: ${data.email}` : "";
        const webStr = data.website ? `Website: ${data.website}` : "";
        
        const contacts = [phoneStr, emailStr, webStr].filter(Boolean);
        if (contacts.length > 0) {
          contactInfo = contacts.join(" • ");
        } else {
          contactInfo = "";
        }
      }
    } catch (err) {
      console.error("Gagal mengambil data profil sekolah untuk KOP:", err);
    }
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 20;
  const rightMargin = 20;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  let currentY = 15;

  // Helper for formatting duration
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "0 detik";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins} menit ${secs} detik`;
    }
    return `${secs} detik`;
  };

  const getOptionLabel = (idx: number) => {
    return ["A", "B", "C", "D", "E"][idx] || String.fromCharCode(65 + idx);
  };

  // Check if currentY will overflow, if so add new page
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 20) {
      doc.addPage();
      currentY = 20;
      
      // Mini header on subsequent pages
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Lembar Hasil Evaluasi Siswa: ${result.studentName} - Ujian: ${result.examTitle}`, leftMargin, 12);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(leftMargin, 14, pageWidth - rightMargin, 14);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
    }
  };

  // --- 1. KOP SEKOLAH (School Letterhead) ---
  const textCenterX = logoUrl ? (pageWidth / 2 + 10) : (pageWidth / 2);

  if (logoUrl) {
    try {
      let format = "PNG";
      if (logoUrl.includes("image/jpeg") || logoUrl.includes("image/jpg")) {
        format = "JPEG";
      } else if (logoUrl.includes("image/svg+xml")) {
        format = "SVG";
      }
      doc.addImage(logoUrl, format, leftMargin, 12, 22, 22);
    } catch (e) {
      console.error("Gagal menggambar logo sekolah di PDF:", e);
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text(foundation.toUpperCase(), textCenterX, currentY, { align: "center" });
  currentY += 5;

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(schoolName.toUpperCase(), textCenterX, currentY, { align: "center" });
  currentY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(address, textCenterX, currentY, { align: "center" });
  currentY += 4;
  doc.text(contactInfo, textCenterX, currentY, { align: "center" });
  currentY += 5;

  // Draw Kop separator double lines
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1.0);
  doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);
  currentY += 1.2;
  doc.setLineWidth(0.4);
  doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);
  currentY += 8;

  // --- 2. TITLE ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("LAPORAN HASIL EVALUASI SISWA (LHE)", pageWidth / 2, currentY, { align: "center" });
  currentY += 8;

  // --- 3. STUDENT & EXAM DATA ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);

  // Left Side Data
  doc.setFont("helvetica", "bold");
  doc.text("DATA SISWA", leftMargin, currentY);
  doc.setFont("helvetica", "normal");
  currentY += 4.5;
  doc.text(`Nama Lengkap   : ${result.studentName}`, leftMargin, currentY);
  currentY += 4.5;
  doc.text(`Kelas / Tingkat   : ${result.studentClass}`, leftMargin, currentY);
  currentY += 4.5;
  doc.text(`ID / Username    : ${result.studentId}`, leftMargin, currentY);

  // Reset to original Y for Right Side Data
  let rightY = currentY - (4.5 * 2);
  doc.setFont("helvetica", "bold");
  doc.text("DATA EVALUASI UJIAN", pageWidth / 2, rightY);
  doc.setFont("helvetica", "normal");
  rightY += 4.5;
  doc.text(`Nama Ujian          : ${result.examTitle}`, pageWidth / 2, rightY);
  rightY += 4.5;
  doc.text(`Tanggal Selesai  : ${new Date(result.submittedAt).toLocaleString("id-ID")}`, pageWidth / 2, rightY);
  rightY += 4.5;
  doc.text(`Durasi Kerja        : ${formatDuration(result.durationSpent)}`, pageWidth / 2, rightY);

  currentY = Math.max(currentY, rightY) + 8;

  // --- 4. SCORE & EVALUATION BOX ---
  checkPageBreak(35);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(leftMargin, currentY, contentWidth, 26, "FD");

  let boxY = currentY + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("HASIL PENILAIAN AKHIR", leftMargin + 8, boxY);

  doc.setFontSize(22);
  if (result.score >= 70) {
    doc.setTextColor(16, 185, 129); // emerald
  } else {
    doc.setTextColor(239, 68, 68); // rose
  }
  doc.text(`${result.score}`, leftMargin + 8, boxY + 11);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("/ 100 Poin", leftMargin + 31, boxY + 11);

  // Score stats on the right inside box
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`• Total Pertanyaan : ${result.totalQuestions} soal`, pageWidth / 2 + 10, boxY);
  doc.text(`• Jawaban Benar    : ${result.correctCount} soal`, pageWidth / 2 + 10, boxY + 4.5);
  doc.text(`• Jawaban Salah    : ${result.totalQuestions - result.correctCount} soal`, pageWidth / 2 + 10, boxY + 9);

  // KKM Status
  const isLulus = result.score >= 70;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  if (isLulus) {
    doc.setTextColor(4, 120, 87);
  } else {
    doc.setTextColor(185, 28, 28);
  }
  doc.text(
    `STATUS: ${isLulus ? "LULUS EVALUASI" : "BELUM LULUS EVALUASI"} (KKM: 70)`,
    leftMargin + 8,
    boxY + 16
  );

  currentY += 34;

  // --- 5. DETAILED QUESTIONS SECTION ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("RINCIAN JAWABAN DAN PEMBAHASAN SOAL", leftMargin, currentY);
  currentY += 6;

  if (exam && exam.questions && exam.questions.length > 0) {
    exam.questions.forEach((q, idx) => {
      const studentAnsIdx = result.answers[q.id];
      const isAnswered = studentAnsIdx !== undefined;
      const isCorrect = isAnswered && studentAnsIdx === q.correctAnswer;

      // Estimate required height for the question block
      // 1 line for text, 4 lines for options, some spacing
      const linesQuestion = doc.splitTextToSize(`${idx + 1}. ${q.text}`, contentWidth);
      const neededHeight = (linesQuestion.length * 5) + (q.options.length * 5.5) + 20;

      checkPageBreak(neededHeight);

      // Question Number & Text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);

      linesQuestion.forEach((line: string) => {
        doc.text(line, leftMargin, currentY);
        currentY += 4.5;
      });

      // Options List
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);

      q.options.forEach((opt, optIdx) => {
        const isChosenByStudent = studentAnsIdx === optIdx;
        const isCorrectOption = q.correctAnswer === optIdx;

        let optPrefix = `${getOptionLabel(optIdx)}. `;
        let optText = opt;

        if (isCorrectOption) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(4, 120, 87); // bold emerald for correct option
          optPrefix += "[KUNCI JAWABAN] ";
        } else if (isChosenByStudent && !isCorrect) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(185, 28, 28); // bold rose for student wrong choice
          optPrefix += "[PILIHAN SISWA] ";
        } else {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(71, 85, 105);
        }

        const linesOpt = doc.splitTextToSize(`${optPrefix}${optText}`, contentWidth - 8);
        linesOpt.forEach((line: string) => {
          doc.text(line, leftMargin + 6, currentY);
          currentY += 4.5;
        });
      });

      // Answer Status Summary line
      currentY += 1.5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      if (!isAnswered) {
        doc.setTextColor(180, 83, 9); // amber
        doc.text("-> Status: TIDAK DIJAWAB (0 Poin)", leftMargin + 6, currentY);
      } else if (isCorrect) {
        doc.setTextColor(4, 120, 87); // green
        doc.text(`-> Status: BENAR (+${q.points || 10} Poin)`, leftMargin + 6, currentY);
      } else {
        doc.setTextColor(185, 28, 28); // red
        doc.text(`-> Status: SALAH (Dipilih: ${getOptionLabel(studentAnsIdx)}, Seharusnya: ${getOptionLabel(q.correctAnswer)}) (0 Poin)`, leftMargin + 6, currentY);
      }
      currentY += 4.5;

      // Explanation if available
      const explanationText = q.explanation || `Kunci jawaban yang benar adalah opsi ${getOptionLabel(q.correctAnswer)}.`;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);

      const linesExpl = doc.splitTextToSize(`Pembahasan: ${explanationText}`, contentWidth - 10);
      linesExpl.forEach((line: string) => {
        checkPageBreak(10);
        doc.text(line, leftMargin + 6, currentY);
        currentY += 4;
      });

      // Divider line between questions
      currentY += 4;
      checkPageBreak(10);
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.25);
      doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);
      currentY += 5;
    });
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("Tidak ada rincian soal untuk paket ujian ini.", leftMargin, currentY);
  }

  // Save the document
  const fileName = `LHE_${result.studentName.replace(/\s+/g, "_")}_${result.examTitle.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}
