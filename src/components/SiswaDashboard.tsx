import React, { useState, useEffect, useRef } from "react";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  getDocs,
  setDoc,
  doc,
  updateDoc
} from "../lib/firebase";
import { db } from "../lib/firebase";
import { checkUserLimit } from "../lib/userLimit";
import { Student, Exam, Result, Notification, School } from "../types";
import { 
  BookOpen, 
  Award, 
  Bell, 
  LogOut, 
  User, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  PlayCircle,
  History,
  BarChart2,
  Calendar
} from "lucide-react";
import ActiveExam from "./ActiveExam";
import AttemptDetailModal from "./AttemptDetailModal";

interface DashboardTimerProps {
  exam: Exam;
  result: Result;
  onTimeout: () => void;
}

function DashboardTimer({ exam, result, onTimeout }: DashboardTimerProps) {
  const totalSeconds = exam.duration * 60;
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, totalSeconds - result.durationSpent));
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    // If already expired, trigger immediately
    if (timeLeft <= 0) {
      onTimeoutRef.current();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => {
            onTimeoutRef.current();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []); // Run once on mount

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <span className="font-mono bg-rose-600 text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider animate-pulse shrink-0 flex items-center gap-1 shadow-sm">
      <span>⏳ {formatTime(timeLeft)}</span>
    </span>
  );
}

interface SiswaDashboardProps {
  user: { id: string; name: string; class?: string; schoolId: string; schoolName: string };
  onLogout: () => void;
}

export default function SiswaDashboard({ user, onLogout }: SiswaDashboardProps) {
  // Global States
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolProfile, setSchoolProfile] = useState<School | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);

  // Active Exam state
  const [activeExam, setActiveExam] = useState<Exam | null>(null);

  // Read Notifications helper
  const [showNotifications, setShowNotifications] = useState(false);

  // Custom states for tabs and detail view
  const [activeTab, setActiveTab] = useState<"exams" | "history">("exams");
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);

  // Real-time student profile class
  const [studentClass, setStudentClass] = useState<string>(user.class || "");

  useEffect(() => {
    if (!user.id) return;
    const studentRef = doc(db, "students", user.id);
    const unsubStudent = onSnapshot(studentRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.class) {
          setStudentClass(data.class);
        }
      }
    });
    return () => unsubStudent();
  }, [user.id]);

  useEffect(() => {
    if (!user.schoolId) return;
    setLoading(true);

    // Fetch active exams for this school only
    const qExams = query(
      collection(db, "exams"),
      where("schoolId", "==", user.schoolId),
      where("status", "==", "active")
    );
    const unsubExams = onSnapshot(qExams, (snap) => {
      const list: Exam[] = [];
      snap.forEach((doc) => {
        const exam = { ...doc.data(), id: doc.id } as Exam;
        
        // Match targeted classes with normalized case-insensitive and trimmed strings
        // If an exam has no classes specified, it is available to all classes (Semua Kelas)
        const isTargetedClass = !exam.classes || exam.classes.length === 0 || (studentClass && exam.classes.some(
          c => c.trim().toLowerCase() === studentClass.trim().toLowerCase()
        ));

        // Only show the exam if it is explicitly assigned to the student's class
        if (isTargetedClass) {
          list.push(exam);
        }
      });
      setExams(list);
    });

    // Fetch this student's results
    const qResults = query(
      collection(db, "results"),
      where("studentId", "==", user.id)
    );
    const unsubResults = onSnapshot(qResults, (snap) => {
      const list: Result[] = [];
      snap.forEach((doc) => {
        list.push({ ...doc.data(), id: doc.id } as Result);
      });
      setResults(list);
    });

    // Fetch this student's notifications + broadcast notifications ("all") for this school only
    const qNotifs = query(
      collection(db, "notifications"),
      where("schoolId", "==", user.schoolId)
    );
    const unsubNotifs = onSnapshot(qNotifs, (snap) => {
      const list: Notification[] = [];
      snap.forEach((doc) => {
        const notif = { ...doc.data(), id: doc.id } as Notification;
        if (notif.studentId === "all" || notif.studentId === user.id) {
          list.push(notif);
        }
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(list);
    });

    const unsubSchoolProfile = onSnapshot(doc(db, "schools", user.schoolId), (docSnap) => {
      if (docSnap.exists()) {
        setSchoolProfile(docSnap.data() as School);
      }
    });

    setLoading(false);

    return () => {
      unsubExams();
      unsubResults();
      unsubNotifs();
      unsubSchoolProfile();
    };
  }, [user.id, user.schoolId, studentClass]);

  useEffect(() => {
    async function verifyLimit() {
      if (user.schoolId && user.id) {
        const res = await checkUserLimit(user.schoolId, user.id);
        if (res.isBlocked) {
          setLimitError(res.message || "Batas kuota pengguna terlampaui.");
        } else {
          setLimitError(null);
        }
      }
    }
    verifyLimit();
  }, [user.schoolId, user.id, schoolProfile]);

  // Determine which exams are completed vs available
  const getExamStatus = (examId: string) => {
    const result = results.find(r => r.examId === examId);
    if (!result) return "available";
    return result.status; // 'started' | 'submitted'
  };

  const getExamScore = (examId: string) => {
    const result = results.find(r => r.examId === examId && r.status === "submitted");
    return result ? result.score : null;
  };

  // Automated locking/submission logic for expired background attempts
  const handleAutoSubmitExam = async (examToSubmit: Exam, resToSubmit: Result) => {
    let correctCount = 0;
    examToSubmit.questions.forEach((q) => {
      const chosen = resToSubmit.answers[q.id];
      if (chosen !== undefined && chosen === q.correctAnswer) {
        correctCount += 1;
      }
    });

    const totalQuestions = examToSubmit.questions.length;
    const finalScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    try {
      await updateDoc(doc(db, "results", resToSubmit.id), {
        status: "submitted",
        score: finalScore,
        correctCount: correctCount,
        totalQuestions: totalQuestions,
        submittedAt: new Date().toISOString(),
        durationSpent: examToSubmit.duration * 60
      });

      const notifId = `notif-graded-auto-${Date.now()}`;
      await setDoc(doc(db, "notifications", notifId), {
        id: notifId,
        studentId: user.id,
        schoolId: examToSubmit.schoolId || "",
        title: "Ujian Selesai Otomatis (Waktu Habis)",
        message: `Waktu pengerjaan untuk ujian "${examToSubmit.title}" telah berakhir. Lembar pengerjaan Anda telah dikunci dan dinilai secara otomatis dengan skor: ${finalScore}.`,
        read: false,
        createdAt: new Date().toISOString(),
        type: "exam_graded"
      });
    } catch (err) {
      console.error("Gagal mengunci/mengumpulkan ujian otomatis di background:", err);
    }
  };

  useEffect(() => {
    if (loading || exams.length === 0 || results.length === 0 || activeExam !== null) return;

    results.forEach((res) => {
      if (res.status === "started") {
        const exam = exams.find((e) => e.id === res.examId);
        if (exam) {
          const timeLeft = exam.duration * 60 - res.durationSpent;
          if (timeLeft <= 0) {
            handleAutoSubmitExam(exam, res);
          }
        }
      }
    });
  }, [exams, results, loading, activeExam]);

  // Proctor Token states
  const [tokenExam, setTokenExam] = useState<Exam | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenError, setTokenError] = useState("");

  const handleVerifyTokenAndStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenExam) return;

    // Enforce schedule limits!
    const sched = getExamScheduleStatus(tokenExam);
    if (!sched.buttonEnabled) {
      setTokenError(`Ujian ini belum dapat dimulai: ${sched.statusText}`);
      return;
    }

    const actualToken = (tokenExam.token || "").trim().toUpperCase();
    const enteredToken = tokenInput.trim().toUpperCase();

    if (enteredToken !== actualToken) {
      setTokenError("Token proktor salah! Harap tanyakan kepada pengawas ujian Anda.");
      return;
    }

    // Create starting record in Firestore for real-time monitoring
    const resultId = `res-${user.id}-${tokenExam.id}`;
    const startingResult: Result = {
      id: resultId,
      examId: tokenExam.id,
      examTitle: tokenExam.title,
      studentId: user.id,
      studentName: user.name,
      studentClass: user.class || "XII",
      schoolId: user.schoolId,
      schoolName: user.schoolName,
      answers: {},
      score: 0,
      totalQuestions: tokenExam.questions.length,
      correctCount: 0,
      submittedAt: new Date().toISOString(),
      status: "started",
      durationSpent: 0
    };

    try {
      await setDoc(doc(db, "results", resultId), startingResult);
      setActiveExam(tokenExam);
      setTokenExam(null); // close modal
      setTokenInput("");
      setTokenError("");
    } catch (err) {
      console.error("Gagal memulai ujian:", err);
      setTokenError("Gagal terhubung ke server ujian. Coba lagi.");
    }
  };

  const handleDismissNotification = async (notifId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notifId), { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  if (activeExam) {
    const existingResult = results.find(r => r.examId === activeExam.id && r.status === "started");
    return (
      <ActiveExam 
        exam={activeExam}
        studentId={user.id}
        studentName={user.name}
        studentClass={user.class || "XII"}
        initialAnswers={existingResult?.answers || {}}
        initialDurationSpent={existingResult?.durationSpent || 0}
        onFinish={() => {
          setActiveExam(null);
        }}
      />
    );
  }

  // Stats Calculations for Histori Tab
  const submittedResults = results.filter(r => r.status === "submitted");
  const totalSubmitted = submittedResults.length;
  const averageScore = totalSubmitted > 0 ? Math.round(submittedResults.reduce((acc, curr) => acc + curr.score, 0) / totalSubmitted) : 0;
  const highestScore = totalSubmitted > 0 ? Math.max(...submittedResults.map(r => r.score)) : 0;
  const passCount = submittedResults.filter(r => r.score >= 70).length;
  const passRate = totalSubmitted > 0 ? Math.round((passCount / totalSubmitted) * 100) : 0;

  const formatDurationSpent = (seconds: number) => {
    if (!seconds || seconds <= 0) return "0 detik";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getLocalDateTimeValues = () => {
    const now = new Date();
    
    // Format YYYY-MM-DD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const date = String(now.getDate()).padStart(2, "0");
    const todayString = `${year}-${month}-${date}`;
    
    // Format HH:MM
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const currentTimeString = `${hours}:${minutes}`;
    
    return { todayString, currentTimeString };
  };

  const getExamScheduleStatus = (exam: Exam) => {
    if (!exam.scheduledDate) {
      return { isAvailable: true, statusText: "Tersedia", buttonEnabled: true };
    }

    const { todayString, currentTimeString } = getLocalDateTimeValues();

    if (exam.scheduledDate < todayString) {
      return { isAvailable: false, statusText: "Sudah Berakhir (Lampau)", buttonEnabled: false };
    }

    if (exam.scheduledDate > todayString) {
      return { isAvailable: false, statusText: `Terjadwal: ${exam.scheduledDate} Pukul ${exam.scheduledStartTime || "00:00"}`, buttonEnabled: false };
    }

    // It is today!
    if (exam.scheduledStartTime && currentTimeString < exam.scheduledStartTime) {
      return { isAvailable: false, statusText: `Belum Dimulai (Mulai Jam ${exam.scheduledStartTime} WIB)`, buttonEnabled: false };
    }

    if (exam.scheduledEndTime && currentTimeString > exam.scheduledEndTime) {
      return { isAvailable: false, statusText: "Waktu Ujian Habis", buttonEnabled: false };
    }

    return { isAvailable: true, statusText: "Sedang Berlangsung", buttonEnabled: true };
  };

  // Spotlight exam represents the next unsubmitted exam that is active/available today or has no schedule
  const spotlightExam = exams.find(e => {
    if (getExamStatus(e.id) === "submitted") return false;
    
    // If it has no schedule, it's open and always available today
    if (!e.scheduledDate) return true;
    
    const { todayString } = getLocalDateTimeValues();
    // Only show in spotlight if scheduled date is today
    return e.scheduledDate === todayString;
  });

  const handleStartSpotlight = () => {
    if (!spotlightExam) return;
    if (spotlightExam.questions.length === 0) {
      alert("Maaf, ujian ini belum memiliki soal di dalamnya.");
      return;
    }
    const status = getExamStatus(spotlightExam.id);
    if (status === "submitted") {
      alert("Ujian ini sudah dikerjakan dan terkunci!");
      return;
    }

    // Enforce schedule limits!
    const sched = getExamScheduleStatus(spotlightExam);
    if (!sched.buttonEnabled) {
      alert(`Ujian ini belum dapat dimulai: ${sched.statusText}`);
      return;
    }

    if (status === "started") {
      setActiveExam(spotlightExam);
    } else {
      setTokenExam(spotlightExam);
      setTokenInput("");
      setTokenError("");
    }
  };

  const { todayString } = getLocalDateTimeValues();

  const activeTodayExams = exams.filter(e => {
    if (!e.scheduledDate) return true;
    return e.scheduledDate === todayString;
  });

  const upcomingExams = exams.filter(e => {
    return e.scheduledDate && e.scheduledDate > todayString;
  });

  const isExpired = schoolProfile && (schoolProfile.subscriptionActive === false || (schoolProfile.subscriptionExpiresAt && new Date(schoolProfile.subscriptionExpiresAt).getTime() < new Date().getTime()));

  if (schoolProfile?.suspended === true || isExpired) {
    const isSuspended = schoolProfile?.suspended === true;

    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden text-center p-8 space-y-6 animate-fadeIn">
          <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center ${isSuspended ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"}`}>
            {isSuspended ? <AlertCircle className="w-10 h-10 animate-bounce" /> : <Clock className="w-10 h-10 animate-pulse" />}
          </div>
          <div className="space-y-2">
            <h2 className={`text-xl font-black tracking-tight uppercase ${isSuspended ? "text-rose-800" : "text-amber-800"}`}>
              {isSuspended ? "Akses Portal Ditangguhkan" : "Masa Aktif Layanan Berakhir"}
            </h2>
            <p className={`text-xs font-bold uppercase tracking-wider ${isSuspended ? "text-rose-600" : "text-amber-600"}`}>
              {schoolProfile.name}
            </p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {isSuspended ? (
              "Maaf, status portal sekolah Anda saat ini sedang ditangguhkan (SUSPENDED) oleh Super Admin. Seluruh ujian dan akses hasil belajar dinonaktifkan sementara. Silakan hubungi wali kelas atau pihak sekolah Anda untuk informasi lebih lanjut."
            ) : (
              "Terima kasih telah menggunakan SmartUjian. Masa aktif paket langganan untuk sekolah Anda telah berakhir (expired). Seluruh aktivitas ujian online dinonaktifkan sementara. Silakan hubungi wali kelas atau operator sekolah Anda untuk perpanjangan paket layanan."
            )}
          </p>
          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={onLogout}
              className={`w-full py-3 px-4 text-white font-bold text-xs rounded-xl transition-all shadow-md ${
                isSuspended
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
                  : "bg-amber-600 hover:bg-amber-700 shadow-amber-200"
              }`}
            >
              Keluar dari Akun
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (limitError) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden text-center p-8 space-y-6 animate-fadeIn">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center bg-amber-100 text-amber-600">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black tracking-tight uppercase text-amber-800">
              Batas Kuota Pengguna Terlampaui
            </h2>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
              {schoolProfile?.name}
            </p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
            {limitError}
          </p>
          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={onLogout}
              className="w-full py-3 px-4 text-white font-bold text-xs rounded-xl transition-all shadow-md bg-amber-600 hover:bg-amber-700 shadow-amber-200"
            >
              Keluar dari Akun
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header Panel */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
            <img 
              src="/logo.png" 
              alt="Eco Smart Exam Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-800 uppercase">Eco Smart Exam</h2>
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider leading-none mt-0.5">{user.schoolName || "Portal Ujian Online Siswa"}</p>
          </div>
        </div>

        {/* Right side navigation details */}
        <div className="flex items-center gap-4">
          {/* Notifications Bell */}
          <div className="relative">
            <button
              id="btn-notif-bell"
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all relative cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-4 space-y-3 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Notifikasi Otomatis ({unreadNotifsCount} Baru)</h4>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold"
                  >
                    Tutup
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Belum ada notifikasi.</p>
                ) : (
                  <div className="space-y-2.5 divide-y divide-slate-50">
                    {notifications.map((notif) => (
                      <div key={notif.id} className={`pt-2 text-xs space-y-1 ${!notif.read ? "bg-indigo-50/20 -mx-2 px-2 py-1 rounded-md" : ""}`}>
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>{notif.title}</span>
                          {!notif.read && (
                            <button 
                              onClick={() => handleDismissNotification(notif.id)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                            >
                              Tandai Dibaca
                            </button>
                          )}
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">{notif.message}</p>
                        <span className="text-[10px] text-slate-400 block">{new Date(notif.createdAt).toLocaleDateString("id-ID")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="hidden sm:flex flex-col items-end text-sm">
            <span className="font-bold text-slate-800">{user.name}</span>
            <div className="flex gap-1.5 mt-0.5">
              <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md">Kelas {studentClass || "XII"}</span>
              <span className="text-[10px] text-indigo-600 font-black uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md">{user.schoolId}</span>
            </div>
          </div>

          <button
            id="btn-logout-siswa"
            onClick={onLogout}
            className="flex items-center gap-2 py-2 px-3.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl text-sm font-medium transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
        
        {/* Welcome Dashboard Block (UNIAN - Dasbor Siswa Orange/Pink Gradient) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. GREETING CARD */}
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 rounded-3xl text-white flex items-center justify-between shadow-lg shadow-orange-100 relative overflow-hidden group">
            <div className="space-y-1.5 z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 block">UNIAN - Dasbor Siswa</span>
              <h3 className="text-2xl font-black tracking-tight">
                Halo, {user.name}! <span className="inline-block animate-bounce">🎓</span>
              </h3>
              <p className="text-white/90 text-xs">Akses lembar pengerjaan soal dan periksa histori nilai secara transparan seketika.</p>
              
              <div className="pt-2 flex gap-1.5">
                <span className="text-[9px] text-orange-900 font-extrabold uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-md">
                  Kelas {studentClass || "XII"}
                </span>
                <span className="text-[9px] text-orange-900 font-black uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-md">
                  ID: {user.id}
                </span>
              </div>
            </div>
            
            {/* Shiny Golden Trophy Medal with Blue Ribbon (custom SVG) */}
            <div className="shrink-0 z-10 bg-white/10 p-2 rounded-2xl backdrop-blur-sm relative hover:scale-110 transition-all cursor-default">
              <div className="w-16 h-16 flex flex-col items-center justify-center relative">
                {/* Blue Ribbons */}
                <div className="absolute top-6 left-2 w-4 h-10 bg-blue-600 rounded-b-sm transform -rotate-12 shadow-sm"></div>
                <div className="absolute top-6 right-2 w-4 h-10 bg-blue-600 rounded-b-sm transform rotate-12 shadow-sm"></div>
                {/* Yellow/Gold medal circle */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 flex items-center justify-center shadow-md relative z-10 border-2 border-yellow-200">
                  <span className="font-black text-amber-900 text-lg">1</span>
                </div>
              </div>
            </div>
            
            <div className="absolute -right-6 -bottom-6 bg-white/5 w-24 h-24 rounded-full group-hover:scale-125 transition-all"></div>
          </div>

          {/* 2. JADWAL UJIAN HARI INI Spotlight card */}
          <div className="bg-[#17a2b8] text-white p-6 rounded-3xl shadow-lg shadow-sky-100 flex flex-col justify-between space-y-4 border border-sky-400/15 relative overflow-hidden group">
            {spotlightExam ? (
              <>
                <div className="space-y-1 z-10">
                  <div className="flex items-center gap-1.5 text-sky-100 font-bold text-xs uppercase tracking-wider">
                    <span>📅</span>
                    <span>Jadwal Ujian Hari Ini</span>
                  </div>
                  <h4 className="font-extrabold text-base tracking-tight leading-snug mt-1 text-white flex items-center justify-between gap-2">
                    <span>{spotlightExam.title}</span>
                    {getExamStatus(spotlightExam.id) === "started" && (
                      results.find(r => r.examId === spotlightExam.id && r.status === "started") && (
                        <DashboardTimer
                          exam={spotlightExam}
                          result={results.find(r => r.examId === spotlightExam.id && r.status === "started")!}
                          onTimeout={() => handleAutoSubmitExam(spotlightExam, results.find(r => r.examId === spotlightExam.id && r.status === "started")!)}
                        />
                      )
                    )}
                  </h4>
                  <p className="text-[11px] text-sky-100 font-medium">
                    {spotlightExam.scheduledDate 
                      ? `Jadwal: ${spotlightExam.scheduledStartTime || "00:00"} - ${spotlightExam.scheduledEndTime || "23:59"} WIB`
                      : "Sesi: Terbuka Bebas"}
                    {` • ${spotlightExam.questions.length} Soal`}
                  </p>
                </div>

                {getExamStatus(spotlightExam.id) === "submitted" ? (
                  <div className="w-full py-2.5 bg-amber-600/50 text-white font-bold text-xs uppercase tracking-wider rounded-2xl border border-amber-400/30 text-center z-10 flex items-center justify-center gap-1.5">
                    <span>🔒 Sudah Dikerjakan (Terkunci)</span>
                  </div>
                ) : !getExamScheduleStatus(spotlightExam).buttonEnabled ? (
                  <div className="w-full py-2.5 bg-slate-800/40 text-slate-150 font-bold text-xs uppercase tracking-wider rounded-2xl border border-slate-450/20 text-center z-10 flex items-center justify-center gap-1.5">
                    <span>⏳ {getExamScheduleStatus(spotlightExam).statusText}</span>
                  </div>
                ) : getExamStatus(spotlightExam.id) === "started" ? (
                  <button
                    id="btn-spotlight-ikuti-ujian"
                    onClick={handleStartSpotlight}
                    className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-md shadow-rose-500/30 hover:scale-[1.01] transition-all cursor-pointer text-center animate-pulse z-10 flex items-center justify-center gap-2"
                  >
                    LANJUTKAN UJIAN ⏳
                  </button>
                ) : (
                  <button
                    id="btn-spotlight-ikuti-ujian"
                    onClick={handleStartSpotlight}
                    className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-md shadow-rose-500/30 hover:scale-[1.01] transition-all cursor-pointer text-center animate-pulse z-10"
                  >
                    IKUTI UJIAN
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="space-y-1 z-10">
                  <div className="flex items-center gap-1.5 text-sky-100 font-bold text-xs uppercase tracking-wider">
                    <span>📅</span>
                    <span>Jadwal Ujian Hari Ini</span>
                  </div>
                  <h4 className="font-extrabold text-base tracking-tight leading-snug mt-1 text-white">
                    Tidak Ada Ujian Hari Ini
                  </h4>
                  <p className="text-[11px] text-sky-100 font-medium">
                    Saat ini belum ada jadwal pelaksanaan ujian untuk hari ini.
                  </p>
                </div>
                <div className="py-2.5 px-3 bg-white/10 rounded-2xl text-center text-xs font-bold text-white/95 z-10 border border-white/10">
                  Santai & Persiapkan Diri! ✨
                </div>
              </>
            )}
            
            <div className="absolute -right-8 -top-8 bg-white/5 w-24 h-24 rounded-full group-hover:scale-125 transition-all"></div>
          </div>

        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            id="tab-exams"
            onClick={() => setActiveTab("exams")}
            className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "exams"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Ujian Aktif ({exams.length})
          </button>
          <button
            id="tab-history"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "history"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="w-4 h-4" />
            Histori & Hasil Lengkap ({totalSubmitted})
          </button>
        </div>

        {activeTab === "exams" ? (
          /* Tab 1: Exams Grid + Quick History Sidebar */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Available Exams Column */}
            <div className="md:col-span-2 space-y-4">
              <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Daftar Ujian Aktif
              </h4>

              {loading ? (
                <div className="p-12 text-center bg-white border border-slate-150 rounded-2xl">
                  Sedang menyinkronkan daftar soal...
                </div>
              ) : activeTodayExams.length === 0 && upcomingExams.length === 0 ? (
                <div className="p-8 text-center bg-white border border-slate-100 rounded-2xl text-slate-400 text-xs">
                  Saat ini belum ada paket ujian yang diaktifkan oleh pengajar untuk kelas Anda.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Section 1: Ujian Hari Ini / Aktif */}
                  {activeTodayExams.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Ujian Hari Ini</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {activeTodayExams.map((exam, index) => {
                          const status = getExamStatus(exam.id);
                          const score = getExamScore(exam.id);
                          const sched = getExamScheduleStatus(exam);
                          
                          const cardThemes = [
                            { bg: "bg-emerald-500", text: "text-white", badge: "bg-emerald-600/40 text-emerald-100", btn: "bg-white text-emerald-600 hover:bg-emerald-50 border border-emerald-400/20" },
                            { bg: "bg-amber-500", text: "text-white", badge: "bg-amber-600/40 text-amber-100", btn: "bg-white text-amber-600 hover:bg-amber-50 border border-amber-400/20" },
                            { bg: "bg-sky-500", text: "text-white", badge: "bg-sky-600/40 text-sky-100", btn: "bg-white text-sky-600 hover:bg-sky-50 border border-sky-400/20" },
                            { bg: "bg-purple-600", text: "text-white", badge: "bg-purple-700/40 text-purple-100", btn: "bg-white text-purple-600 hover:bg-purple-50 border border-purple-400/20" }
                          ];
                          const theme = cardThemes[index % cardThemes.length];
                          
                          return (
                            <div key={exam.id} className={`${theme.bg} ${theme.text} rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:scale-[1.01] transition-all`}>
                              <div className="space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs shrink-0">
                                      {index + 1}
                                    </div>
                                    <h5 className="font-extrabold text-sm tracking-tight leading-snug line-clamp-2">{exam.title}</h5>
                                  </div>
                                  
                                  {status === "submitted" ? (
                                    <span className="bg-amber-600 border border-amber-400 text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 shadow-sm">
                                      🔒 Terkunci
                                    </span>
                                  ) : !sched.buttonEnabled ? (
                                    <span className="bg-slate-800/40 text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0">
                                      ⏳ {sched.statusText}
                                    </span>
                                  ) : status === "started" ? (
                                    results.find(r => r.examId === exam.id && r.status === "started") ? (
                                      <DashboardTimer
                                        exam={exam}
                                        result={results.find(r => r.examId === exam.id && r.status === "started")!}
                                        onTimeout={() => handleAutoSubmitExam(exam, results.find(r => r.examId === exam.id && r.status === "started")!)}
                                      />
                                    ) : (
                                      <span className="bg-rose-600 text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider animate-pulse shrink-0">
                                        Berjalan ⏳
                                      </span>
                                    )
                                  ) : (
                                    <span className="bg-white/10 text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0">
                                      Tersedia
                                    </span>
                                  )}
                                </div>
                                
                                <p className="text-xs opacity-90 line-clamp-2 leading-relaxed">{exam.description || "Ujian evaluasi harian."}</p>
                              </div>
                              
                              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 font-medium opacity-95">
                                  <span className="flex items-center gap-1">⏱️ {exam.duration}m</span>
                                  <span>•</span>
                                  <span>{exam.questions.length} Soal</span>
                                </div>
                                
                                {status === "submitted" ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="bg-white/15 px-2 py-0.5 rounded-lg text-center font-bold text-[10px]">
                                      <span className="text-[8px] block opacity-75">Nilai</span>
                                      <span>{score !== null ? score : "-"}</span>
                                    </div>
                                    <button
                                      id={`btn-review-exam-${exam.id}`}
                                      onClick={() => {
                                        const matchedRes = results.find(r => r.examId === exam.id && r.status === "submitted");
                                        if (matchedRes) setSelectedResult(matchedRes);
                                      }}
                                      className={`py-1 px-2.5 rounded-lg text-[10px] font-extrabold tracking-wide transition-all ${theme.btn} cursor-pointer`}
                                    >
                                      Pembahasan
                                    </button>
                                  </div>
                                ) : !sched.buttonEnabled ? (
                                  <span className="text-[10px] font-bold px-2.5 py-1 bg-white/10 rounded-lg">{sched.statusText}</span>
                                ) : status === "started" ? (
                                  <button
                                    id={`btn-resume-exam-${exam.id}`}
                                    onClick={() => setActiveExam(exam)}
                                    className={`py-1 px-2.5 rounded-lg text-[10px] font-extrabold tracking-wide transition-all ${theme.btn} cursor-pointer flex items-center gap-1`}
                                  >
                                    Lanjutkan
                                  </button>
                                ) : (
                                  <button
                                    id={`btn-start-exam-${exam.id}`}
                                    onClick={() => {
                                      if (exam.questions.length === 0) {
                                        alert("Maaf, ujian ini belum memiliki soal di dalamnya.");
                                        return;
                                      }
                                      setTokenExam(exam);
                                      setTokenInput("");
                                      setTokenError("");
                                    }}
                                    className={`py-1.5 px-3 rounded-lg text-[10px] font-extrabold tracking-wide transition-all ${theme.btn} cursor-pointer`}
                                  >
                                    Mulai
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Section 2: Jadwal Ujian Mendatang (Upcoming) */}
                  {upcomingExams.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                        Jadwal Ujian Terjadwal (Akan Datang)
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {upcomingExams.map((exam, index) => {
                          return (
                            <div key={exam.id} className="bg-slate-50 text-slate-700 border border-slate-200 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xs">
                              <div className="space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-500 shrink-0">
                                      {index + 1}
                                    </div>
                                    <h5 className="font-extrabold text-sm tracking-tight leading-snug text-slate-800 line-clamp-2">{exam.title}</h5>
                                  </div>
                                  <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
                                    📅 Terjadwal
                                  </span>
                                </div>
                                
                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{exam.description || "Akan segera dimulai sesuai jadwal."}</p>
                              </div>
                              
                              <div className="pt-3 border-t border-slate-200 flex flex-col gap-2 text-xs">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 bg-slate-100/80 px-3 py-1.5 rounded-xl">
                                  <span>Tanggal: {exam.scheduledDate}</span>
                                  <span>Jam: {exam.scheduledStartTime || "00:00"} - {exam.scheduledEndTime || "23:59"}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs pt-1">
                                  <span className="text-slate-400 font-medium">⏱️ {exam.duration}m • {exam.questions.length} Soal</span>
                                  <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                                    <span>⏳ Belum Dibuka</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Academic Stats & Reports Column (Ringkasan Nilai Terbaru) */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Award className="w-5 h-5 text-[#17a2b8]" />
                Ringkasan Nilai Terbaru
              </h4>

              {/* Bento Grid Scores (Blue, Green, Red) */}
              <div className="grid grid-cols-3 gap-3">
                
                {/* Matematika */}
                <div className="bg-sky-500 text-white p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden h-24">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-95">MATEMATIKA</span>
                  <div className="font-black text-xl tracking-tight mt-1">
                    {submittedResults.find(r => r.examTitle.toLowerCase().includes("matematika"))?.score ?? 92} <span className="text-xs">⭐</span>
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-white/10 w-8 h-8 rounded-full"></div>
                </div>

                {/* Sejarah */}
                <div className="bg-emerald-500 text-white p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden h-24">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-95">SEJARAH</span>
                  <div className="font-black text-xl tracking-tight mt-1">
                    {submittedResults.find(r => r.examTitle.toLowerCase().includes("sejarah"))?.score ?? 88}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-white/10 w-8 h-8 rounded-full"></div>
                </div>

                {/* Kimia */}
                <div className="bg-rose-500 text-white p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden h-24">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-95">KIMIA</span>
                  <div className="font-black text-xl tracking-tight mt-1">
                    {submittedResults.find(r => r.examTitle.toLowerCase().includes("kimia"))?.score ?? 75}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-white/10 w-8 h-8 rounded-full"></div>
                </div>

              </div>

              {/* Historic List of Submissions */}
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                  <span className="font-extrabold text-slate-700">Daftar Riwayat Ujian</span>
                  <span className="bg-sky-50 text-sky-600 px-2.5 py-0.5 rounded-full font-bold text-[10px]">{totalSubmitted} Selesai</span>
                </div>

                {totalSubmitted === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 leading-relaxed">
                    Belum ada riwayat ujian yang terkumpul.<br/>Mulai ujian aktif di sebelah kiri!
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {submittedResults.map((res) => (
                      <div 
                        key={res.id} 
                        onClick={() => setSelectedResult(res)}
                        className="bg-slate-50 hover:bg-sky-50/50 p-3 rounded-2xl border border-slate-100 hover:border-sky-200 text-xs flex items-center justify-between cursor-pointer transition-all group"
                      >
                        <div className="space-y-0.5 flex-1 pr-2">
                          <div className="font-extrabold text-slate-800 group-hover:text-sky-600 transition-colors line-clamp-1">{res.examTitle}</div>
                          <div className="text-[10px] text-slate-400">Benar: {res.correctCount}/{res.totalQuestions} • {new Date(res.submittedAt).toLocaleDateString("id-ID")}</div>
                          <div className="text-[10px] text-sky-600 font-bold hover:underline mt-1 inline-block">Buka Pembahasan →</div>
                        </div>

                        <div className="bg-white border border-slate-100 px-2.5 py-1 rounded-xl text-center shrink-0 shadow-xs">
                          <span className={`text-sm font-black ${res.score >= 70 ? "text-emerald-600" : "text-rose-500"}`}>
                            {res.score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          /* Tab 2: Detailed History Tab with Statistics and Lists */
          <div className="space-y-6">
            {/* Quick Stats Overview Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center justify-center text-center space-y-1">
                <BarChart2 className="w-5 h-5 text-indigo-600" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ujian Diikuti</span>
                <span className="text-2xl font-extrabold text-slate-800">{totalSubmitted}</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center justify-center text-center space-y-1">
                <Award className="w-5 h-5 text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rata-Rata Nilai</span>
                <span className="text-2xl font-extrabold text-slate-800">{averageScore}</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center justify-center text-center space-y-1">
                <CheckCircle className="w-5 h-5 text-amber-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nilai Tertinggi</span>
                <span className="text-2xl font-extrabold text-slate-800">{highestScore}</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center justify-center text-center space-y-1">
                <History className="w-5 h-5 text-violet-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tingkat Kelulusan</span>
                <span className="text-2xl font-extrabold text-slate-800">{passRate}%</span>
              </div>
            </div>

            {/* List of Detailed Attempts */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  Rincian Riwayat Percobaan
                </h4>
                <span className="text-xs text-slate-500 font-medium">Klik salah satu baris untuk melihat jawaban Anda</span>
              </div>

              {totalSubmitted === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Anda belum pernah mengumpulkan lembar pengerjaan ujian.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {submittedResults.map((res) => {
                    const isPassed = res.score >= 70;
                    return (
                      <div 
                        key={res.id}
                        onClick={() => setSelectedResult(res)}
                        className="bg-slate-50 hover:bg-slate-100/50 p-4 rounded-xl border border-slate-100 hover:border-indigo-150 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
                      >
                        <div className="space-y-1 flex-1">
                          <h5 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors text-sm">{res.examTitle}</h5>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>Benar: <strong className="text-slate-700">{res.correctCount}/{res.totalQuestions}</strong></span>
                            <span>•</span>
                            <span>Durasi: <strong className="text-slate-700">{formatDurationSpent(res.durationSpent)}</strong></span>
                            <span>•</span>
                            <span>{new Date(res.submittedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                          {/* Pass/Fail Pill */}
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            isPassed 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-150" 
                              : "bg-rose-50 text-rose-700 border border-rose-150"
                          }`}>
                            {isPassed ? "Tuntas" : "Belum Tuntas"}
                          </span>

                          {/* Score Badge and Detail Button */}
                          <div className="flex items-center gap-3">
                            <div className="bg-white border border-slate-150 w-12 h-12 rounded-xl flex flex-col justify-center items-center text-center shadow-xs shrink-0">
                              <span className="text-[9px] text-slate-400 font-bold uppercase leading-none">Skor</span>
                              <span className={`text-base font-black ${isPassed ? "text-emerald-600" : "text-rose-500"}`}>
                                {res.score}
                              </span>
                            </div>
                            
                            <button
                              id={`btn-open-detail-${res.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedResult(res);
                              }}
                              className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                            >
                              Pembahasan
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Render Detail Modal dynamically */}
      {selectedResult && (
        <AttemptDetailModal 
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}

      {/* Proctor Token Modal */}
      {tokenExam && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-scaleUp">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <PlayCircle className="text-indigo-600 w-5 h-5" />
                  Konfirmasi Token Ujian
                </h4>
                <button
                  onClick={() => setTokenExam(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="font-bold text-slate-800 text-sm">{tokenExam.title}</div>
                <p className="text-xs text-slate-500 leading-relaxed">{tokenExam.description}</p>
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 pt-1">
                  <span>Durasi: {tokenExam.duration} Menit</span>
                  <span>•</span>
                  <span>{tokenExam.questions.length} Soal</span>
                </div>
              </div>

              <form onSubmit={handleVerifyTokenAndStart} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Token Proktor (Pengawas)
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={12}
                    placeholder="Masukkan 6 digit token pengawas"
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value);
                      if (tokenError) setTokenError("");
                    }}
                    className="w-full px-4 py-3 text-center font-mono font-black text-xl tracking-widest uppercase bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {tokenError && (
                    <p className="text-xs text-rose-500 font-semibold flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {tokenError}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Ujian ini memerlukan otorisasi berupa Token Proktor dari guru pengawas ruang Anda untuk dapat dimulai.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setTokenExam(null)}
                    className="flex-1 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl font-semibold text-xs transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-100 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Mulai Ujian
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
