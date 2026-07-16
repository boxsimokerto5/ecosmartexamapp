import React, { useState, useEffect, useRef } from "react";
import { doc, updateDoc, setDoc } from "../lib/firebase";
import { db } from "../lib/firebase";
import { Exam, Question, Result } from "../types";
import { Clock, CheckSquare, ChevronLeft, ChevronRight, Send, HelpCircle, Image as ImageIcon, Maximize2, AlertTriangle, Award, Check, X, CheckCircle2, AlertCircle } from "lucide-react";
import LiveExamTimer from "./LiveExamTimer";
import SafeImage from "./SafeImage";

interface ActiveExamProps {
  exam: Exam;
  studentId: string;
  studentName: string;
  studentClass: string;
  onFinish: () => void;
  initialAnswers?: Record<string, number | string>;
  initialDurationSpent?: number;
}

export default function ActiveExam({
  exam,
  studentId,
  studentName,
  studentClass,
  onFinish,
  initialAnswers = {},
  initialDurationSpent = 0
}: ActiveExamProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>(initialAnswers);
  const [timeLeft, setTimeLeft] = useState(Math.max(0, exam.duration * 60 - initialDurationSpent)); // seconds
  const [durationSpent, setDurationSpent] = useState(initialDurationSpent); // seconds spent
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    score: number;
    correctCount: number;
    totalQuestions: number;
    durationSpent: number;
    answers: Record<string, number | string>;
  } | null>(null);

  // Custom modal states to replace window.confirm and alert
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAutoSubmitModal, setShowAutoSubmitModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const resultId = `res-${studentId}-${exam.id}`;
  const syncRef = useRef<NodeJS.Timeout | null>(null);

  const activeQuestion: Question = exam.questions[currentIdx];

  // Ref-based state tracking to completely avoid stale closures in asynchronous callbacks (timer & sync)
  const answersRef = useRef(answers);
  const durationSpentRef = useRef(durationSpent);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    durationSpentRef.current = durationSpent;
  }, [durationSpent]);


  // Fullscreen helper functions
  const requestFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).mozRequestFullScreen) {
        await (elem as any).mozRequestFullScreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
    } catch (err) {
      console.warn("Sistem gagal mengaktifkan layar penuh otomatis:", err);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Gagal menonaktifkan layar penuh:", err);
    }
  };

  // Set up fullscreen listeners and attempt initial fullscreen on mount
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    // Request fullscreen immediately on mount (triggered by user gesture 'Mulai/Lanjutkan')
    requestFullscreen();

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
      exitFullscreen();
    };
  }, []);

  const handleTimerTick = (newTimeLeft: number, newDurationSpent: number) => {
    setTimeLeft(newTimeLeft);
    setDurationSpent(newDurationSpent);
  };

  // Sync duration and selected answers with Firestore every 5 seconds for real-time teacher tracking
  // Runs once at mount to avoid tearing down and creating interval every second when durationSpent changes
  useEffect(() => {
    syncRef.current = setInterval(async () => {
      if (isSubmittingRef.current) return;
      try {
        await updateDoc(doc(db, "results", resultId), {
          durationSpent: durationSpentRef.current,
          answers: answersRef.current
        });
      } catch (err) {
        console.error("Gagal menyinkronkan durasi real-time:", err);
      }
    }, 5000);

    return () => {
      if (syncRef.current) clearInterval(syncRef.current);
    };
  }, []);

  const selectAnswer = (questionId: string, optionIdx: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx
    }));
  };

  const handleAutoSubmit = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setShowAutoSubmitModal(true);
    await submitExam(answersRef.current, durationSpentRef.current);
  };

  const handleManualSubmit = () => {
    if (isSubmittingRef.current) return;
    setShowConfirmModal(true);
  };

  const confirmSubmitExam = async () => {
    setShowConfirmModal(false);
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    await submitExam(answers, durationSpent);
  };

  const submitExam = async (currentAnswers: Record<string, number | string>, currentDuration: number) => {
    setIsSubmitting(true);
    isSubmittingRef.current = true;
    if (syncRef.current) clearInterval(syncRef.current);

    // Calculate score based on point weights
    let earnedPoints = 0;
    let totalMaxPoints = 0;
    let correctCount = 0;
    let hasEssay = false;
    const initialEssayScores: Record<string, number> = {};

    exam.questions.forEach((q) => {
      const chosen = currentAnswers[q.id];
      const maxPts = q.points || 10;
      totalMaxPoints += maxPts;

      if (q.type === "isian") {
        hasEssay = true;
        // Case-insensitive keyword matching
        const studentAns = String(chosen || "").trim().toLowerCase();
        const keywords = String(q.correctAnswer || "")
          .split(",")
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean);

        const isMatch = keywords.some(
          (kw) => studentAns === kw || (studentAns.length > 2 && studentAns.includes(kw))
        );

        if (isMatch && studentAns.length > 0) {
          initialEssayScores[q.id] = maxPts;
          earnedPoints += maxPts;
          correctCount += 1;
        } else {
          initialEssayScores[q.id] = 0;
        }
      } else {
        // Pilihan ganda
        if (chosen !== undefined && Number(chosen) === Number(q.correctAnswer)) {
          earnedPoints += maxPts;
          correctCount += 1;
        }
      }
    });

    const totalQuestions = exam.questions.length;
    const finalScore = totalMaxPoints > 0 ? Math.round((earnedPoints / totalMaxPoints) * 100) : 0;

    try {
      // Update result record in Firestore
      await updateDoc(doc(db, "results", resultId), {
        status: "submitted",
        answers: currentAnswers,
        score: finalScore,
        correctCount: correctCount,
        totalQuestions: totalQuestions,
        submittedAt: new Date().toISOString(),
        durationSpent: currentDuration,
        essayScores: initialEssayScores,
        gradedByTeacher: !hasEssay
      });

      // Send an automated notification to this student
      const notifId = `notif-graded-${Date.now()}`;
      await setDoc(doc(db, "notifications", notifId), {
        id: notifId,
        studentId: studentId,
        schoolId: exam.schoolId || "",
        title: "Evaluasi Ujian Selesai",
        message: `Ujian "${exam.title}" Anda telah berhasil dinilai. Skor Anda: ${finalScore}.`,
        read: false,
        createdAt: new Date().toISOString(),
        type: "exam_graded"
      });
      
      // Exit fullscreen mode to display the summary comfortably
      await exitFullscreen();
      
      setSummaryData({
        score: finalScore,
        correctCount: correctCount,
        totalQuestions: totalQuestions,
        durationSpent: currentDuration,
        answers: currentAnswers
      });
      setShowSummary(true);
      setIsSubmitting(false);
    } catch (err) {
      console.error("Gagal mengirim hasil ujian:", err);
      setErrorMessage("Terjadi masalah saat mengumpulkan ujian ke server. Harap periksa jaringan Anda atau hubungi pengawas.");
      setShowErrorModal(true);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const answeredPercent = Math.round((Object.keys(answers).length / exam.questions.length) * 100);

  if (showSummary && summaryData) {
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
      return ["A", "B", "C", "D"][idx] || String.fromCharCode(65 + idx);
    };

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-12 animate-fadeIn">
        {/* Header */}
        <header className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-6 py-6 shadow-md">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                Ujian Berhasil Dikumpulkan
              </div>
              <h2 className="text-xl font-black tracking-tight">{exam.title}</h2>
              <p className="text-xs text-indigo-200/80 max-w-xl">{exam.description}</p>
            </div>
            
            <button
              id="btn-summary-finish"
              onClick={onFinish}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-900/30 cursor-pointer self-start sm:self-center"
            >
              Kembali ke Dashboard
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-4xl w-full mx-auto px-4 mt-8 space-y-6 flex-1">
          {/* Welcome/Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xl p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-6 justify-between border-b border-slate-100 pb-6">
              <div className="space-y-2 text-center md:text-left">
                <h3 className="text-lg font-bold text-slate-800">Analisis Hasil Ujian Anda</h3>
                <p className="text-xs text-slate-500 max-w-md">
                  Berikut adalah rincian performa Anda dalam ujian ini. Gunakan hasil pembahasan di bawah untuk memahami letak kesalahan dan mempelajari konsep materi lebih mendalam.
                </p>
              </div>

              {/* Big Score Circle */}
              <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-100 w-32 h-32 rounded-3xl relative overflow-hidden shadow-inner">
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${summaryData.score >= 70 ? "bg-emerald-500" : "bg-rose-500"}`} />
                <Award className={`w-6 h-6 mb-1 ${summaryData.score >= 70 ? "text-emerald-500" : "text-rose-500"}`} />
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Skor Akhir</span>
                <span className={`text-4xl font-black ${summaryData.score >= 70 ? "text-emerald-600" : "text-rose-500"}`}>
                  {summaryData.score}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">KKM: 70</span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Jawaban Benar</div>
                  <div className="text-sm font-extrabold text-slate-800">{summaryData.correctCount} / {summaryData.totalQuestions} Soal</div>
                </div>
              </div>

              <div className="bg-rose-50/30 border border-rose-100 p-4 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  ✗
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Jawaban Salah</div>
                  <div className="text-sm font-extrabold text-slate-800">{summaryData.totalQuestions - summaryData.correctCount} Soal</div>
                </div>
              </div>

              <div className="bg-amber-50/40 border border-amber-100 p-4 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Waktu Pengerjaan</div>
                  <div className="text-sm font-extrabold text-slate-800">{formatDuration(summaryData.durationSpent)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Discussion List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 px-1">
              <CheckSquare className="w-4 h-4 text-indigo-600" />
              Pembahasan Soal & Analisis Pilihan Jawaban
            </h3>

            <div className="space-y-6">
              {exam.questions.map((q, qIndex) => {
                const studentAnswerIdx = summaryData.answers[q.id];
                const isAnswered = studentAnswerIdx !== undefined;
                const isCorrect = isAnswered && studentAnswerIdx === q.correctAnswer;

                return (
                  <div
                    key={q.id}
                    className={`bg-white rounded-2xl border p-6 md:p-7 space-y-5 shadow-sm transition-all ${
                      !isAnswered
                        ? "border-amber-200 bg-amber-50/10"
                        : isCorrect
                        ? "border-emerald-200/80 bg-emerald-50/10"
                        : "border-rose-200 bg-rose-50/10"
                    }`}
                  >
                    {/* Question Header */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                        SOAL #{qIndex + 1}
                      </span>

                      {/* Correctness Badge */}
                      {!isAnswered ? (
                        <span className="bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          TIDAK DIJAWAB
                        </span>
                      ) : isCorrect ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          JAWABAN BENAR (+{q.points || 10} Poin)
                        </span>
                      ) : (
                        <span className="bg-rose-100 text-rose-800 border border-rose-200 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <X className="w-3.5 h-3.5" />
                          JAWABAN SALAH (0 Poin)
                        </span>
                      )}
                    </div>

                    {/* Question Text */}
                    <p className="text-slate-800 font-bold text-sm leading-relaxed whitespace-pre-line">
                      {q.text}
                    </p>

                    {/* Question Image if exists */}
                    {q.imageUrl && (
                      <div className="max-w-md overflow-hidden">
                        <SafeImage
                          src={q.imageUrl}
                          alt={`Visual Soal ${qIndex + 1}`}
                          className="rounded-lg max-h-52 object-contain mx-auto"
                          fallbackText="Gagal memuat gambar soal"
                        />
                      </div>
                    )}

                    {/* Options Details */}
                    {q.type === "isian" ? (
                      <div className="space-y-2">
                        <div className="p-3.5 rounded-xl border-2 border-slate-150 bg-slate-50 text-xs">
                          <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Jawaban Anda:</div>
                          <div className="font-mono text-slate-800 bg-white p-2 rounded-lg border border-slate-200">{String(studentAnswerIdx ?? "-")}</div>
                        </div>
                        <div className="p-3.5 rounded-xl border-2 border-emerald-100 bg-emerald-50/20 text-xs">
                          <div className="text-emerald-600 font-bold uppercase tracking-wider text-[10px] mb-1">Kunci Jawaban Soal:</div>
                          <div className="font-mono text-emerald-800 bg-white p-2 rounded-lg border border-emerald-150 font-bold">{String(q.correctAnswer)}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2.5">
                        {q.options && q.options.map((opt, optIdx) => {
                          const isChosenByStudent = studentAnswerIdx === optIdx;
                          const isThisCorrectAnswer = q.correctAnswer === optIdx;

                          let optStyle = "bg-slate-50 border-slate-200 text-slate-600";
                          let iconToRender = null;

                          if (isThisCorrectAnswer) {
                            optStyle = "bg-emerald-500/5 border-emerald-300 text-emerald-900 font-semibold ring-1 ring-emerald-300";
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
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                isThisCorrectAnswer
                                  ? "bg-emerald-600 text-white"
                                  : isChosenByStudent && !isCorrect
                                  ? "bg-rose-600 text-white"
                                  : "bg-slate-200 text-slate-600"
                              }`}>
                                {getOptionLabel(optIdx)}
                              </div>
                              <span className="flex-1 pt-0.5 leading-relaxed">{opt}</span>
                              {iconToRender}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Explanation Box */}
                    <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-3">
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
                            <strong>Pembahasan Umum:</strong> Kunci jawaban yang benar adalah {q.type === "isian" ? <strong>{String(q.correctAnswer)}</strong> : <>opsi <strong>{getOptionLabel(Number(q.correctAnswer))}</strong></>}. Pilihan ini adalah jawaban paling tepat yang menjawab persoalan di atas berdasarkan ketentuan materi pelajaran.
                          </p>
                        )}

                        {/* Detailed choice-by-choice explanations */}
                        {q.type !== "isian" && q.options && (
                          <div className="space-y-2 pt-1 border-t border-slate-200">
                            <h5 className="font-bold text-slate-700">Penjelasan Mengapa Opsi Lain Kurang Tepat:</h5>
                            <ul className="space-y-1.5 pl-1">
                              {q.options.map((opt, optIdx) => {
                                const isCorrectOption = Number(q.correctAnswer) === optIdx;
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
          </div>

          {/* Bottom Call to Action */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-bold text-slate-800 text-sm">Selesai Mempelajari Pembahasan?</h4>
              <p className="text-[11px] text-slate-400">Hasil pengerjaan dan skor Anda sudah tersimpan permanen di basis data sekolah.</p>
            </div>
            
            <button
              id="btn-summary-finish-bottom"
              onClick={onFinish}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 flex items-center gap-2 cursor-pointer"
            >
              Kembali ke Dashboard
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      {/* Fullscreen Requirement Overlay */}
      {!isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full text-center space-y-6 border border-slate-100">
            <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto animate-bounce">
              <Maximize2 className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Mode Layar Penuh Diperlukan</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Untuk meningkatkan integritas, kejujuran, dan fokus Anda selama ujian berlangsung, Anda wajib mengerjakan ujian dalam mode <strong>Layar Penuh (Fullscreen)</strong>.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-[11px] text-slate-600 space-y-2 text-left">
              <p className="font-bold text-slate-700 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Aturan Menjaga Integritas Ujian:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Dilarang berpindah tab atau membuka aplikasi lain.</li>
                <li>Jika keluar dari mode layar penuh, soal pengerjaan akan terkunci hingga Anda mengaktifkannya kembali.</li>
                <li>Gunakan tombol di bawah untuk mengaktifkan kembali mode Layar Penuh.</li>
              </ul>
            </div>

            <button
              id="btn-activate-fullscreen"
              onClick={requestFullscreen}
              className="w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              Aktifkan Mode Layar Penuh
            </button>

            <p className="text-[10px] text-slate-400 leading-relaxed italic">
              *Tips: Jika tombol tidak merespon, buka aplikasi di tab baru menggunakan opsi Buka di Tab Baru di kanan atas panel preview.
            </p>
          </div>
        </div>
      )}

      {/* Exam Panel Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Lembar Pengerjaan Ujian</span>
          <h3 className="font-bold text-slate-800 text-sm md:text-base leading-tight line-clamp-1">{exam.title}</h3>
        </div>

        {/* Fullscreen Status & Countdown Timer */}
        <div className="flex items-center gap-3">
          <button
            id="btn-header-fullscreen"
            onClick={requestFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Aktifkan Layar Penuh"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Layar Penuh</span>
          </button>

          <button
            id="btn-header-submit"
            onClick={handleManualSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
            title="Kumpulkan lembar jawaban ujian sekarang"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kumpulkan</span>
          </button>

          {/* Real-time Countdown Timer Display */}
          <LiveExamTimer
            durationMinutes={exam.duration}
            initialDurationSpent={initialDurationSpent}
            isSubmitting={isSubmitting}
            onTick={handleTimerTick}
            onTimeout={handleAutoSubmit}
          />
        </div>
      </header>

      {/* Progress indicators */}
      <div className="w-full bg-slate-200 h-1">
        <div 
          className="bg-indigo-600 h-1 transition-all duration-300"
          style={{ width: `${((currentIdx + 1) / exam.questions.length) * 100}%` }}
        />
      </div>

      {/* Main question panel */}
      <main className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full flex flex-col justify-between">
        
        {/* Question content */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>SOAL NO. <span className="font-bold text-slate-700">{currentIdx + 1}</span> DARI <span className="font-bold text-slate-700">{exam.questions.length}</span></span>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">Poin: {activeQuestion.points}</span>
          </div>

          <h4 className="text-sm md:text-base font-semibold text-slate-800 leading-relaxed">
            {activeQuestion.text}
          </h4>

          {/* Picture support */}
          {activeQuestion.imageUrl && (
            <div className="rounded-xl overflow-hidden max-h-64 flex justify-center">
              <SafeImage
                src={activeQuestion.imageUrl}
                alt="Ilustrasi Soal"
                className="max-h-64 object-contain"
                fallbackText="Gagal memuat gambar soal"
              />
            </div>
          )}

          {/* Option A, B, C, D targets or Textarea based on Question Type */}
          {activeQuestion.type === "isian" ? (
            <div className="space-y-3 pt-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Tuliskan Jawaban Anda:
              </label>
              <textarea
                id="student-answer-textarea"
                rows={3}
                placeholder="Ketik jawaban singkat Anda di sini..."
                value={answers[activeQuestion.id] !== undefined ? String(answers[activeQuestion.id]) : ""}
                onChange={(e) => {
                  setAnswers((prev) => ({
                    ...prev,
                    [activeQuestion.id]: e.target.value
                  }));
                }}
                className="w-full p-4 border-2 border-slate-150 rounded-xl text-xs md:text-sm bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium leading-relaxed shadow-2xs"
              />
              <p className="text-[10px] text-slate-400 italic">
                * Pastikan penulisan ejaan benar sesuai dengan materi pelajaran.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 pt-4">
              {activeQuestion.options && activeQuestion.options.map((option, idx) => {
                const optionLetters = ["A", "B", "C", "D"];
                const isSelected = answers[activeQuestion.id] === idx;

                return (
                  <button
                    id={`btn-option-${idx}`}
                    key={idx}
                    type="button"
                    onClick={() => selectAnswer(activeQuestion.id, idx)}
                    className={`w-full text-left min-h-[50px] py-3.5 px-5 rounded-xl border-2 text-xs md:text-sm transition-all flex items-center gap-4 cursor-pointer ${
                      isSelected 
                        ? "border-indigo-600 bg-indigo-50/40 text-indigo-900 font-semibold" 
                        : "border-slate-150 bg-white text-slate-700 hover:border-indigo-200"
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected 
                        ? "bg-indigo-600 text-white" 
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {optionLetters[idx]}
                    </span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            id="btn-prev-q"
            onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
            disabled={currentIdx === 0}
            className="flex items-center gap-1 py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Sebelumnya</span>
          </button>

          {/* Nav direct bullets panel */}
          <div className="hidden sm:flex items-center gap-1.5">
            {exam.questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              return (
                <button
                  id={`nav-bullet-${idx}`}
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center transition-all ${
                    idx === currentIdx 
                      ? "bg-indigo-600 text-white" 
                      : isAnswered 
                      ? "bg-indigo-50 text-indigo-600 border border-indigo-200" 
                      : "bg-white border border-slate-200 text-slate-500"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {currentIdx === exam.questions.length - 1 ? (
            <button
              id="btn-submit-exam-manual"
              onClick={handleManualSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 py-2.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-50 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Mengirim..." : "Kumpulkan Ujian"}</span>
            </button>
          ) : (
            <button
              id="btn-next-q"
              onClick={() => setCurrentIdx((prev) => Math.min(exam.questions.length - 1, prev + 1))}
              className="flex items-center gap-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )
          }
        </div>

      </main>

      {/* Custom Confirmation Submit Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-scaleUp">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <AlertTriangle className="text-amber-500 w-5 h-5" />
                  Konfirmasi Selesai Ujian
                </h4>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Apakah Anda yakin ingin menyelesaikan ujian ini dan mengirimkan lembar jawaban Anda? Setelah dikumpulkan, jawaban Anda tidak dapat diubah lagi.
                </p>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Ujian:</span>
                    <span className="font-bold text-slate-800">{exam.title}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Jumlah Soal:</span>
                    <span className="font-bold text-slate-800">{exam.questions.length} Soal</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Soal Dijawab:</span>
                    <span className={`font-black ${Object.keys(answers).length === exam.questions.length ? "text-emerald-600" : "text-amber-600"}`}>
                      {Object.keys(answers).length} / {exam.questions.length} Soal
                    </span>
                  </div>
                </div>

                {Object.keys(answers).length < exam.questions.length && (
                  <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-[11px] text-rose-700 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Perhatian:
                    </p>
                    <p>
                      Ada <strong>{exam.questions.length - Object.keys(answers).length} soal yang belum Anda jawab</strong>. Sangat disarankan untuk mengisi semua jawaban sebelum mengumpulkan ujian.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl font-semibold text-xs transition-all cursor-pointer"
                >
                  Periksa Lagi
                </button>
                <button
                  type="button"
                  onClick={confirmSubmitExam}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-emerald-100 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  Kumpulkan Ujian
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto Submit Modal (Countdown Expiry) */}
      {showAutoSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl p-6 text-center space-y-5 border border-slate-100 animate-scaleUp">
            <div className="w-16 h-16 bg-amber-50 border border-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Waktu Ujian Habis!</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Waktu pengerjaan untuk ujian ini telah berakhir. Sistem sedang mengumpulkan lembar jawaban Anda secara otomatis. Harap tunggu sebentar...
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-indigo-600 font-semibold text-xs">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              Mengirimkan Jawaban...
            </div>
          </div>
        </div>
      )}

      {/* Error Submit Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl p-6 text-center space-y-5 border border-slate-100 animate-scaleUp">
            <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Pengiriman Gagal</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowErrorModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Tutup & Coba Lagi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
