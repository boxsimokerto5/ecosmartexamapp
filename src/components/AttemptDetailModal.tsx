import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "../lib/firebase";
import { db } from "../lib/firebase";
import { Exam, Result } from "../types";
import { X, CheckCircle2, AlertCircle, Clock, Award, FileText, Check, AlertTriangle, HelpCircle } from "lucide-react";
import { motion } from "motion/react";
import SafeImage from "./SafeImage";
import { generateStudentExamPDF } from "../lib/printStudentExamPdf";

interface AttemptDetailModalProps {
  result: Result;
  isTeacher?: boolean;
  onClose: () => void;
  onGraded?: () => void;
}

export default function AttemptDetailModal({ result, isTeacher = false, onClose, onGraded }: AttemptDetailModalProps) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual grading states for essays
  const [localEssayScores, setLocalEssayScores] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function fetchExamDetails() {
      setLoading(true);
      setError(null);
      try {
        const docRef = doc(db, "exams", result.examId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const examData = { ...docSnap.data(), id: docSnap.id } as Exam;
          setExam(examData);
          
          // Initialize local essay scores
          const initialScores: Record<string, number> = {};
          examData.questions.forEach((q) => {
            if (q.type === "isian") {
              initialScores[q.id] = result.essayScores?.[q.id] ?? 0;
            }
          });
          setLocalEssayScores(initialScores);
        } else {
          setError("Dokumen paket ujian ini telah dihapus oleh pengajar.");
        }
      } catch (err) {
        console.error("Gagal memuat rincian ujian:", err);
        setError("Terjadi kesalahan koneksi saat memuat rincian ujian.");
      } finally {
        setLoading(false);
      }
    }

    fetchExamDetails();
  }, [result.examId, result.essayScores]);

  // Format duration in minutes and seconds
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

  const handleScoreChange = (questionId: string, val: number) => {
    setLocalEssayScores((prev) => ({
      ...prev,
      [questionId]: val
    }));
  };

  const handleSaveGrading = async () => {
    if (!exam) return;
    setIsSaving(true);
    setSaveSuccess(false);

    // Calculate score based on total weights
    let totalEarnedPoints = 0;
    let totalMaxPoints = 0;
    let correctCount = 0;

    exam.questions.forEach((q) => {
      const maxPts = q.points || 10;
      totalMaxPoints += maxPts;

      if (q.type === "isian") {
        const essayScore = localEssayScores[q.id] ?? 0;
        totalEarnedPoints += essayScore;
        if (essayScore === maxPts) {
          correctCount += 1;
        }
      } else {
        const chosen = result.answers[q.id];
        if (chosen !== undefined && Number(chosen) === Number(q.correctAnswer)) {
          totalEarnedPoints += maxPts;
          correctCount += 1;
        }
      }
    });

    const updatedScore = totalMaxPoints > 0 ? Math.round((totalEarnedPoints / totalMaxPoints) * 100) : 0;

    try {
      await updateDoc(doc(db, "results", result.id), {
        essayScores: localEssayScores,
        score: updatedScore,
        correctCount: correctCount,
        gradedByTeacher: true
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        if (onGraded) onGraded();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Gagal menyimpan hasil penilaian:", err);
      alert("Gagal menyimpan penilaian. Silakan coba kembali.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" id="attempt-detail-modal">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Wrapper */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-6 py-5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300">Hasil Analisis Ujian</span>
              <h3 className="text-lg font-bold leading-tight">{result.examTitle}</h3>
            </div>
            <button 
              id="btn-close-modal"
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Summary Banner Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Score Display Card */}
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex flex-col justify-center items-center text-center space-y-1 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-600" />
                <Award className="w-6 h-6 text-indigo-600 mb-1" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Skor Evaluasi</span>
                <span className={`text-4xl font-black ${result.score >= 70 ? "text-emerald-600" : "text-rose-500"}`}>
                  {result.score}
                </span>
                <span className="text-xs text-slate-500 font-medium">Kriteria Ketuntasan: 70</span>
                {exam && exam.questions.some(q => q.type === "isian") && (
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                    result.gradedByTeacher ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800 animate-pulse"
                  }`}>
                    {result.gradedByTeacher ? "Dinilai Guru" : "Butuh Penilaian Guru"}
                  </span>
                )}
              </div>

              {/* Stats Breakdown Card */}
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex flex-col justify-center space-y-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center md:text-left">Statistik Soal</div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <div className="text-[10px] text-emerald-600 font-bold">Tuntas</div>
                    <div className="text-lg font-extrabold text-slate-800">{result.correctCount}</div>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <div className="text-[10px] text-rose-500 font-bold">Salah</div>
                    <div className="text-lg font-extrabold text-slate-800">{result.totalQuestions - result.correctCount}</div>
                  </div>
                </div>
              </div>

              {/* Time Spent Card */}
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex flex-col justify-center items-center text-center space-y-1 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />
                <Clock className="w-6 h-6 text-amber-500 mb-1" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Durasi Pengerjaan</span>
                <span className="text-sm font-bold text-slate-800">
                  {formatDuration(result.durationSpent)}
                </span>
                <span className="text-xs text-slate-500">Dari batas waktu ujian</span>
              </div>

              {/* Date Submitted Card */}
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex flex-col justify-center items-center text-center space-y-1 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-sky-500" />
                <FileText className="w-6 h-6 text-sky-500 mb-1" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Waktu Submit</span>
                <span className="text-xs font-bold text-slate-800">
                  {new Date(result.submittedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {new Date(result.submittedAt).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })} WIB
                </span>
              </div>
            </div>

            {/* Questions Discussion / Explanation Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  Pembahasan Soal & Kunci Jawaban
                </h4>
                <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                  Total {result.totalQuestions} Soal
                </span>
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-500 font-medium">Sedang memuat rincian lembar soal & pembahasan...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center bg-amber-50 border border-amber-100 rounded-2xl space-y-2">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="text-xs text-amber-800 font-semibold">{error}</p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Meskipun lembar soal tidak tersedia, data skor Anda ({result.score}) tetap tersimpan aman di sistem pengerjaan siswa.
                  </p>
                </div>
              ) : exam && exam.questions ? (
                <div className="space-y-6">
                  {exam.questions.map((q, qIndex) => {
                    const studentAnswerIdx = result.answers[q.id];
                    const isAnswered = studentAnswerIdx !== undefined;

                    let isCorrect = false;
                    let earnedPts = 0;

                    if (q.type === "isian") {
                      earnedPts = localEssayScores[q.id] ?? result.essayScores?.[q.id] ?? 0;
                      isCorrect = isAnswered && earnedPts === (q.points || 10);
                    } else {
                      isCorrect = isAnswered && Number(studentAnswerIdx) === Number(q.correctAnswer);
                      earnedPts = isCorrect ? (q.points || 10) : 0;
                    }

                    return (
                      <div 
                        key={q.id} 
                        className={`p-5 rounded-2xl border ${
                          !isAnswered 
                            ? "bg-slate-50 border-slate-200" 
                            : isCorrect 
                            ? "bg-emerald-50/30 border-emerald-150" 
                            : q.type === "isian" && earnedPts > 0
                            ? "bg-amber-50/30 border-amber-150"
                            : "bg-rose-50/20 border-rose-100"
                        } space-y-4 transition-all`}
                      >
                        {/* Question Header Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-150">
                              SOAL #{qIndex + 1}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                              q.type === "isian"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-indigo-100 text-indigo-800"
                            }`}>
                              {q.type === "isian" ? "Isian / Essay" : "Pilihan Ganda"}
                            </span>
                          </div>

                          {/* Correctness Badge */}
                          {!isAnswered ? (
                            <span className="bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              TIDAK DIJAWAB
                            </span>
                          ) : q.type === "isian" ? (
                            earnedPts === (q.points || 10) ? (
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                BENAR (+{earnedPts} Poin)
                              </span>
                            ) : earnedPts > 0 ? (
                              <span className="bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                SEBAGIAN (+{earnedPts} Poin)
                              </span>
                            ) : (
                              <span className="bg-rose-100 text-rose-800 border border-rose-200 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                                <X className="w-3.5 h-3.5" />
                                SALAH (0 Poin)
                              </span>
                            )
                          ) : isCorrect ? (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              BENAR (+{q.points || 10} Poin)
                            </span>
                          ) : (
                            <span className="bg-rose-100 text-rose-800 border border-rose-200 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                              <X className="w-3.5 h-3.5" />
                              SALAH (0 Poin)
                            </span>
                          )}
                        </div>

                        {/* Question Text */}
                        <p className="text-slate-800 font-medium text-sm leading-relaxed whitespace-pre-line">
                          {q.text}
                        </p>

                        {/* Optional Question Image */}
                        {q.imageUrl && (
                          <div className="mt-2 max-w-md overflow-hidden">
                            <SafeImage 
                              src={q.imageUrl} 
                              alt={`Visual Soal ${qIndex + 1}`}
                              className="rounded-lg max-h-60 object-contain mx-auto"
                              fallbackText="Gagal memuat gambar soal"
                            />
                          </div>
                        )}

                        {/* Options or Answer display based on type */}
                        {q.type === "isian" ? (
                          <div className="space-y-3 pt-2">
                            <div className="p-3.5 rounded-xl border border-slate-150 bg-slate-50 text-xs">
                              <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1.5 flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                Jawaban Siswa:
                              </div>
                              <div className="font-mono text-slate-800 bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap font-semibold leading-relaxed">
                                {studentAnswerIdx !== undefined ? String(studentAnswerIdx) : <span className="italic text-slate-400">Tidak menjawab</span>}
                              </div>
                            </div>

                            <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/20 text-xs">
                              <div className="text-emerald-600 font-bold uppercase tracking-wider text-[10px] mb-1.5 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                Kunci Jawaban Koreksi Otomatis:
                              </div>
                              <div className="font-mono text-emerald-800 bg-white p-3 rounded-lg border border-emerald-150 font-bold whitespace-pre-wrap">
                                {String(q.correctAnswer)}
                              </div>
                            </div>

                            {/* Manual score adjustment for teacher */}
                            {isTeacher && (
                              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Award className="w-4 h-4 text-indigo-600" />
                                    <span>Penilaian Nilai Pengajar (Essay)</span>
                                  </label>
                                  <span className="text-xs font-bold text-indigo-700">Maks: {q.points || 10} Poin</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <input
                                    type="range"
                                    min={0}
                                    max={q.points || 10}
                                    value={localEssayScores[q.id] ?? 0}
                                    onChange={(e) => handleScoreChange(q.id, parseInt(e.target.value) || 0)}
                                    className="flex-1 accent-indigo-600 cursor-pointer"
                                  />
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min={0}
                                      max={q.points || 10}
                                      value={localEssayScores[q.id] ?? 0}
                                      onChange={(e) => handleScoreChange(q.id, parseInt(e.target.value) || 0)}
                                      className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <span className="text-xs font-bold text-slate-500">/ {q.points || 10}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Options List */
                          <div className="grid grid-cols-1 gap-2.5 pt-2">
                            {q.options && q.options.map((opt, optIdx) => {
                              const isChosenByStudent = studentAnswerIdx === optIdx;
                              const isThisCorrectAnswer = q.correctAnswer === optIdx;

                              let optStyle = "bg-white border-slate-200 hover:border-slate-300 text-slate-700";
                              let iconToRender = null;

                              if (isThisCorrectAnswer) {
                                optStyle = "bg-emerald-500/10 border-emerald-300 text-emerald-900 font-semibold ring-1 ring-emerald-300";
                                iconToRender = <Check className="w-4 h-4 text-emerald-600 shrink-0" />;
                              } else if (isChosenByStudent && !isCorrect) {
                                optStyle = "bg-rose-50 border-rose-300 text-rose-900 font-medium ring-1 ring-rose-300";
                                iconToRender = <X className="w-4 h-4 text-rose-600 shrink-0" />;
                              }

                              return (
                                <div 
                                  key={optIdx} 
                                  className={`flex items-start gap-3 p-3 rounded-xl border text-xs transition-all ${optStyle}`}
                                >
                                  {/* Option Prefix Label (A, B, C, D) */}
                                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                    isThisCorrectAnswer 
                                      ? "bg-emerald-600 text-white" 
                                      : isChosenByStudent && !isCorrect
                                      ? "bg-rose-600 text-white"
                                      : "bg-slate-100 text-slate-600"
                                  }`}>
                                    {getOptionLabel(optIdx)}
                                  </div>

                                  {/* Option Text */}
                                  <span className="flex-1 pt-0.5 leading-relaxed">{opt}</span>

                                  {/* Status Icon */}
                                  {iconToRender}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Explanation & Choice Breakdown Box */}
                        <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-3 mt-3">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 border-b border-slate-200 pb-1.5">
                            <HelpCircle className="w-4 h-4 text-indigo-500" />
                            <span>Pembahasan Soal & Analisis Detail:</span>
                          </div>
                          
                          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                            {/* Custom Teacher Explanation */}
                            {q.explanation ? (
                              <div className="bg-indigo-50/45 p-3 rounded-lg border border-indigo-100 text-slate-700 whitespace-pre-wrap">
                                <strong className="text-indigo-800">Penjelasan Pengajar:</strong> <br/>
                                {q.explanation}
                              </div>
                            ) : (
                              <p className="italic text-slate-500 bg-indigo-50/20 p-2.5 rounded-lg border border-dashed border-slate-200">
                                <strong>Pembahasan Umum:</strong> Kunci jawaban yang benar adalah <strong>{String(q.correctAnswer)}</strong>. Pilihan ini adalah jawaban paling tepat yang menjawab persoalan di atas berdasarkan ketentuan materi pelajaran.
                              </p>
                            )}

                            {/* Detailed choice-by-choice explanations if multiple choice */}
                            {q.type !== "isian" && q.options && (
                              <div className="space-y-2 pt-1 border-t border-slate-200">
                                <h5 className="font-bold text-slate-700">Penjelasan Mengapa Opsi Lain Kurang Tepat:</h5>
                                <ul className="space-y-1.5 pl-1">
                                  {q.options.map((opt, optIdx) => {
                                    const isCorrectOption = q.correctAnswer === optIdx;
                                    const isStudentChoice = studentAnswerIdx === optIdx;
                                    
                                    return (
                                      <li key={optIdx} className="flex items-start gap-2">
                                        <span className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                                          isCorrectOption
                                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                            : "bg-slate-100 text-slate-500 border border-slate-200"
                                        }`}>
                                          {getOptionLabel(optIdx)}
                                        </span>
                                        <div className="text-[11px]">
                                          <span className="font-semibold text-slate-700">{opt}: </span>
                                          {isCorrectOption ? (
                                            <span className="text-emerald-700 font-medium">
                                              (Opsi Benar) Pilihan jawaban yang tepat sesuai esensi materi soal.
                                            </span>
                                          ) : (
                                            <span className="text-slate-500">
                                              (Opsi Salah) Opsi ini kurang tepat karena tidak memenuhi indikator kompetensi dari pertanyaan. {isStudentChoice && <strong className="text-rose-600 font-medium">(Pilihan Anda)</strong>}
                                            </span>
                                          )}
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">Tidak dapat memetakan rincian soal.</p>
              )}
            </div>

          </div>

          {/* Footer Controls */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex flex-wrap gap-3 items-center justify-between">
            <button
              onClick={() => {
                if (exam) {
                  generateStudentExamPDF(result, exam);
                }
              }}
              disabled={!exam}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all border shadow-xs cursor-pointer flex items-center gap-1.5 ${
                exam 
                  ? "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100" 
                  : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
              }`}
              title={exam ? "Cetak PDF Hasil Evaluasi Siswa" : "Sedang memuat data ujian..."}
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              <span>Cetak PDF</span>
            </button>

            {isTeacher && exam && exam.questions.some(q => q.type === "isian") && (
              <button
                onClick={handleSaveGrading}
                disabled={isSaving}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Tersimpan!</span>
                  </>
                ) : (
                  <>
                    <Award className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Simpan & Selesaikan Penilaian</span>
                  </>
                )}
              </button>
            )}

            <button
              id="btn-close-footer"
              onClick={onClose}
              className="py-2 px-5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
            >
              Tutup Rincian
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
