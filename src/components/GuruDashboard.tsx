import React, { useState, useEffect, useRef } from "react";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  addDoc, 
  updateDoc,
  query,
  where,
  getDoc 
} from "../lib/firebase";
import { db } from "../lib/firebase";
import { checkUserLimit, canAddUser } from "../lib/userLimit";
import { Student, Exam, Result, Question, Notification, SchoolClass, ClassroomSession, School } from "../types";
import {
  assignStudentToClass,
  linkTeacherToClassroomSession,
  updateClassroomSessionStatus,
  deleteClassroomSession,
  assignExamToClasses
} from "../lib/classroomService";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { 
  LayoutDashboard, 
  ShieldAlert,
  Clock,
  BookOpen, 
  Users, 
  FileSpreadsheet, 
  FileText, 
  Plus, 
  Upload, 
  Download, 
  Trash2, 
  Edit, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  UserPlus, 
  Image as ImageIcon,
  LogOut,
  Bell,
  Search,
  BookMarked,
  Activity,
  ArrowRight,
  TrendingUp,
  Award,
  Percent,
  Key,
  Eye,
  History,
  Calendar
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import AttemptDetailModal from "./AttemptDetailModal";
import ClassroomManagement from "./ClassroomManagement";
import RealTimeProgressMonitor from "./RealTimeProgressMonitor";
import ExamHistoryModal from "./ExamHistoryModal";
import SafeImage from "./SafeImage";

const generateProctorToken = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // clear alphanumeric characters
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

interface GuruDashboardProps {
  user: { id: string; name: string; schoolId: string; schoolName: string };
  onLogout: () => void;
}

export default function GuruDashboard({ user, onLogout }: GuruDashboardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "exams" | "students" | "results" | "classes">("dashboard");
  const [resultsSubTab, setResultsSubTab] = useState<"monitor" | "reports">("monitor");
  
  // Real-time Firestore state
  const [students, setStudents] = useState<Student[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [classroomSessions, setClassroomSessions] = useState<ClassroomSession[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolProfile, setSchoolProfile] = useState<School | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);

  // Teacher Class Assignment State
  const [assignedClassIds, setAssignedClassIds] = useState<string[] | null>(null);

  // Classroom-specific states
  const [selectedClassName, setSelectedClassName] = useState<string>("");
  const [newSessionSubject, setNewSessionSubject] = useState("");
  const [assigningStudentId, setAssigningStudentId] = useState("");
  const [classroomSessionLoading, setClassroomSessionLoading] = useState(false);

  // Modals / Form States
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: "", username: "", password: "123", class: "" });
  
  const [showAddExam, setShowAddExam] = useState(false);
  const [newExam, setNewExam] = useState({ 
    title: "", 
    description: "", 
    duration: 30, 
    token: "",
    scheduledDate: "",
    scheduledStartTime: "",
    scheduledEndTime: ""
  });
  const [editingExamSchedule, setEditingExamSchedule] = useState<Exam | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    scheduledDate: "",
    scheduledStartTime: "",
    scheduledEndTime: ""
  });
  const [selectedExamForQuestions, setSelectedExamForQuestions] = useState<Exam | null>(null);

  // New Question Form state
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    imageUrl: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: 0,
    points: 20,
    explanation: ""
  });

  // Filter States
  const [searchStudent, setSearchStudent] = useState("");
  const [selectedResultExamFilter, setSelectedResultExamFilter] = useState("all");
  const [selectedResultClassFilter, setSelectedResultClassFilter] = useState("all");
  const [selectedResultStartDate, setSelectedResultStartDate] = useState("");
  const [selectedResultEndDate, setSelectedResultEndDate] = useState("");
  const [selectedAnalyticsExamId, setSelectedAnalyticsExamId] = useState<string>("all");
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [selectedExamForHistory, setSelectedExamForHistory] = useState<Exam | null>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // CSV Import State
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ImgBB API states
  const [imgbbApiKey, setImgbbApiKey] = useState(() => localStorage.getItem("imgbb_api_key") || "f08520e3d3ddc37255999f1955751cbf");
  const [isImgbbUploading, setIsImgbbUploading] = useState(false);
  const [imgbbUploadError, setImgbbUploadError] = useState<string | null>(null);
  const [imgbbUploadSuccess, setImgbbUploadSuccess] = useState<string | null>(null);
  const [imgbbMethod, setImgbbMethod] = useState<"upload" | "url">("upload");

  // Helper to compress images client-side before upload
  const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/")) {
        resolve(file);
        return;
      }
      
      // If the file is already small (under 150KB), don't compress
      if (file.size < 150 * 1024) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handleImgbbUpload = async (file: File) => {
    const customKey = imgbbApiKey.trim();
    
    // Create a pool of API keys (User's custom key first, followed by default keys)
    const keyPool = Array.from(new Set([
      ...(customKey ? [customKey] : []),
      "f08520e3d3ddc37255999f1955751cbf",
      "fa4e1395b0c6642e2574dc8e0688636d",
      "3f5f43547d9e7efa60864aff77e9c603"
    ]));

    if (keyPool.length === 0) {
      setImgbbUploadError("Silakan masukkan ImgBB API Key terlebih dahulu.");
      return;
    }

    setIsImgbbUploading(true);
    setImgbbUploadError(null);
    setImgbbUploadSuccess(null);

    try {
      // Compress image client-side first
      const compressedFile = await compressImage(file);
      console.log(`Original: ${(file.size / 1024).toFixed(1)}KB, Compressed: ${(compressedFile.size / 1024).toFixed(1)}KB`);

      const formData = new FormData();
      formData.append("image", compressedFile);

      let uploadSuccess = false;
      let lastError = "";
      let successfulKey = "";

      // Try each API key in the pool until one succeeds
      for (let i = 0; i < keyPool.length; i++) {
        const activeKey = keyPool[i];
        console.log(`Attempting ImgBB upload with key index ${i}...`);
        
        try {
          const response = await fetch(`https://api.imgbb.com/1/upload?key=${activeKey}`, {
            method: "POST",
            body: formData,
          });

          const result = await response.json();

          if (result.success && result.data && result.data.url) {
            setNewQuestion(prev => ({
              ...prev,
              imageUrl: result.data.url
            }));
            
            successfulKey = `${activeKey.slice(0, 4)}...${activeKey.slice(-4)}`;
            uploadSuccess = true;
            break;
          } else {
            lastError = result.error?.message || "Gagal mengunggah gambar.";
            console.warn(`ImgBB Key index ${i} failed: ${lastError}`);
          }
        } catch (err: any) {
          lastError = err.message || err;
          console.warn(`ImgBB Key index ${i} error: ${lastError}`);
        }
      }

      if (uploadSuccess) {
        setImgbbUploadSuccess(
          `Gambar berhasil dikompresi & diunggah! (${(file.size / 1024 / 1024).toFixed(1)}MB ➔ ${(compressedFile.size / 1024).toFixed(0)}KB) [Key: ${successfulKey}]`
        );
      } else {
        setImgbbUploadError(`Kesalahan ImgBB (Semua API Key dalam pool gagal/limit): ${lastError}`);
      }
    } catch (err: any) {
      console.error(err);
      setImgbbUploadError(`Gagal menghubungi server ImgBB: ${err.message || err}`);
    } finally {
      setIsImgbbUploading(false);
    }
  };

  // Firestore Subscriptions
  useEffect(() => {
    if (!user.schoolId) return;
    setLoading(true);
    
    const qStudents = query(collection(db, "students"), where("schoolId", "==", user.schoolId));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      const list: Student[] = [];
      snap.forEach((doc) => list.push({ ...doc.data(), id: doc.id } as Student));
      setStudents(list);
    });

    const qClasses = query(collection(db, "classes"), where("schoolId", "==", user.schoolId));
    const unsubClasses = onSnapshot(qClasses, (snap) => {
      const list: SchoolClass[] = [];
      snap.forEach((doc) => list.push({ ...doc.data(), id: doc.id } as SchoolClass));
      setSchoolClasses(list.sort((a, b) => a.name.localeCompare(b.name)));
    });

    const qExams = query(collection(db, "exams"), where("schoolId", "==", user.schoolId));
    const unsubExams = onSnapshot(qExams, (snap) => {
      const list: Exam[] = [];
      snap.forEach((doc) => list.push({ ...doc.data(), id: doc.id } as Exam));
      setExams(list);
      
      // Keep selected exam for questions synchronized with real-time updates
      setSelectedExamForQuestions((current) => {
        if (!current) return null;
        const updated = list.find((e) => e.id === current.id);
        return updated || null;
      });
    });

    const qResults = query(collection(db, "results"), where("schoolId", "==", user.schoolId));
    const unsubResults = onSnapshot(qResults, (snap) => {
      const list: Result[] = [];
      snap.forEach((doc) => list.push({ ...doc.data(), id: doc.id } as Result));
      setResults(list);
    });

    const qNotifs = query(collection(db, "notifications"), where("schoolId", "==", user.schoolId));
    const unsubNotifs = onSnapshot(qNotifs, (snap) => {
      const list: Notification[] = [];
      snap.forEach((doc) => list.push({ ...doc.data(), id: doc.id } as Notification));
      setNotifications(list);
    });

    const qSessions = query(collection(db, "classroom_sessions"), where("schoolId", "==", user.schoolId));
    const unsubSessions = onSnapshot(qSessions, (snap) => {
      const list: ClassroomSession[] = [];
      snap.forEach((doc) => list.push({ ...doc.data(), id: doc.id } as ClassroomSession));
      setClassroomSessions(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    });

    const unsubTeacher = onSnapshot(doc(db, "teachers", user.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAssignedClassIds(data?.classes || null);
      } else {
        setAssignedClassIds(null);
      }
    }, (err) => {
      console.error("Error loading teacher profile:", err);
    });

    const unsubSchoolProfile = onSnapshot(doc(db, "schools", user.schoolId), (docSnap) => {
      if (docSnap.exists()) {
        setSchoolProfile(docSnap.data() as School);
      }
    }, (err) => {
      console.error("Error loading school profile:", err);
    });

    setLoading(false);

    return () => {
      unsubStudents();
      unsubClasses();
      unsubExams();
      unsubResults();
      unsubNotifs();
      unsubSessions();
      unsubTeacher();
      unsubSchoolProfile();
    };
  }, [user.schoolId]);

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

  // --- CLASSROOM MANAGEMENT HANDLERS ---
  const handleAssignStudentToClass = async (studentId: string, className: string) => {
    if (!className) return;
    try {
      await assignStudentToClass(studentId, className);
    } catch (err) {
      console.error(err);
      alert("Gagal memindahkan siswa.");
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassName || !newSessionSubject.trim()) {
      alert("Harap pilih kelas dan isi nama mata pelajaran!");
      return;
    }
    setClassroomSessionLoading(true);
    try {
      const matchedClass = schoolClasses.find(c => c.name === selectedClassName);
      await linkTeacherToClassroomSession({
        classId: matchedClass?.id || `class-${selectedClassName}`,
        className: selectedClassName,
        teacherId: user.id,
        teacherName: user.name,
        subject: newSessionSubject.trim(),
        schoolId: user.schoolId,
        status: "active"
      });
      setNewSessionSubject("");
    } catch (err) {
      console.error(err);
      alert("Gagal membuat sesi pembelajaran.");
    } finally {
      setClassroomSessionLoading(false);
    }
  };

  const handleUpdateSessionStatus = async (sessionId: string, status: "active" | "completed") => {
    try {
      await updateClassroomSessionStatus(sessionId, status);
    } catch (err) {
      console.error(err);
      alert("Gagal memperbarui status sesi.");
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus tautan sesi ini?")) return;
    try {
      await deleteClassroomSession(sessionId);
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus sesi.");
    }
  };

  const handleToggleExamClassAssignment = async (examId: string, className: string) => {
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;
    const currentClasses = exam.classes || [];
    let updatedClasses: string[];
    let shouldActivate = false;
    if (currentClasses.includes(className)) {
      updatedClasses = currentClasses.filter(c => c !== className);
    } else {
      updatedClasses = [...currentClasses, className];
      if (exam.status === "draft") {
        shouldActivate = true;
      }
    }
    try {
      await assignExamToClasses(examId, updatedClasses);
      if (shouldActivate) {
        await updateDoc(doc(db, "exams", examId), { status: "active" });
      }
    } catch (err) {
      console.error(err);
      alert("Gagal memperbarui kelas ujian.");
    }
  };

  // --- STUDENT MANAGEMENT ---
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.username || !newStudent.class) {
      alert("Harap lengkapi semua isian siswa!");
      return;
    }

    // Verify user limit capacity before adding student
    const quotaCheck = await canAddUser(user.schoolId || "");
    if (!quotaCheck.allowed) {
      alert(quotaCheck.message || "Batas kuota pengguna sekolah telah tercapai. Tidak dapat mendaftarkan siswa baru.");
      return;
    }

    const usernameLower = newStudent.username.toLowerCase().trim();
    
    // Check duplication
    if (students.some(s => s.username === usernameLower)) {
      alert("Username sudah digunakan!");
      return;
    }

    const studentId = usernameLower;
    const studentData: Student = {
      id: studentId,
      username: usernameLower,
      name: newStudent.name,
      password: newStudent.password || "123",
      class: newStudent.class,
      schoolId: user.schoolId,
      schoolName: user.schoolName,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "students", studentId), studentData);
      setNewStudent({ name: "", username: "", password: "123", class: "" });
      setShowAddStudent(false);
      
      // Auto Notify Student
      const notifId = `notif-student-new-${Date.now()}`;
      await setDoc(doc(db, "notifications", notifId), {
        id: notifId,
        studentId: studentId,
        schoolId: user.schoolId,
        title: "Akun Berhasil Dibuat",
        message: `Halo ${studentData.name}, akun siswa Anda telah dibuat dengan password: ${studentData.password}`,
        read: false,
        createdAt: new Date().toISOString(),
        type: "info"
      });

    } catch (err) {
      console.error("Gagal menyimpan siswa:", err);
      alert("Terjadi kesalahan sistem saat menyimpan siswa.");
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus akun siswa ini? Semua histori pengerjaan siswa ini akan tetap disimpan di database.")) {
      try {
        await deleteDoc(doc(db, "students", id));
      } catch (err) {
        console.error("Gagal menghapus siswa:", err);
      }
    }
  };

  const handleDeleteResult = async (resultId: string) => {
    const resultObj = results.find(r => r.id === resultId);
    const studentName = resultObj ? resultObj.studentName : "Siswa";
    const examTitle = resultObj ? resultObj.examTitle : "ujian";
    const studentId = resultObj ? resultObj.studentId : "";

    if (window.confirm(`Apakah Anda yakin ingin merilis ulang ujian "${examTitle}" untuk siswa ${studentName}? Siswa bersangkutan akan diperbolehkan untuk mengerjakan ulang.`)) {
      try {
        await deleteDoc(doc(db, "results", resultId));
        
        // Auto Notify Student
        if (studentId) {
          const notifId = `notif-exam-rerelease-${Date.now()}`;
          await setDoc(doc(db, "notifications", notifId), {
            id: notifId,
            studentId: studentId,
            schoolId: user.schoolId,
            title: "Ujian Dirilis Ulang 🔄",
            message: `Ujian "${examTitle}" telah dirilis ulang oleh guru. Anda diperbolehkan untuk mengerjakannya kembali.`,
            read: false,
            createdAt: new Date().toISOString(),
            type: "info"
          });
        }
        
        alert(`Ujian "${examTitle}" berhasil dirilis ulang untuk ${studentName}.`);
      } catch (err) {
        console.error("Gagal merilis ulang ujian:", err);
        alert("Gagal merilis ulang ujian dari server.");
      }
    }
  };

  // --- EXAM MANAGEMENT ---
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExam.title || !newExam.description) {
      alert("Harap lengkapi judul dan deskripsi ujian!");
      return;
    }

    const examId = `exam-${Date.now()}`;
    const generatedToken = (newExam.token || generateProctorToken()).toUpperCase().trim();
    
    const examData: Exam = {
      id: examId,
      title: newExam.title,
      description: newExam.description,
      duration: newExam.duration || 30,
      status: "draft",
      questions: [],
      schoolId: user.schoolId,
      schoolName: user.schoolName,
      createdAt: new Date().toISOString(),
      token: generatedToken,
      scheduledDate: newExam.scheduledDate || "",
      scheduledStartTime: newExam.scheduledStartTime || "",
      scheduledEndTime: newExam.scheduledEndTime || ""
    };

    try {
      await setDoc(doc(db, "exams", examId), examData);
      setNewExam({ 
        title: "", 
        description: "", 
        duration: 30, 
        token: "",
        scheduledDate: "",
        scheduledStartTime: "",
        scheduledEndTime: ""
      });
      setShowAddExam(false);
    } catch (err) {
      console.error(err);
      alert("Gagal membuat ujian.");
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExamSchedule) return;

    try {
      await updateDoc(doc(db, "exams", editingExamSchedule.id), {
        scheduledDate: scheduleForm.scheduledDate,
        scheduledStartTime: scheduleForm.scheduledStartTime,
        scheduledEndTime: scheduleForm.scheduledEndTime
      });
      alert("Jadwal ujian berhasil diperbarui!");
      setEditingExamSchedule(null);
    } catch (err) {
      console.error("Gagal memperbarui jadwal ujian:", err);
      alert("Gagal memperbarui jadwal ujian di server.");
    }
  };

  const handleRegenerateToken = async (examId: string, currentToken?: string) => {
    const input = window.prompt(
      "Masukkan Token baru (6 karakter, kosongkan untuk generate otomatis):",
      currentToken || ""
    );
    if (input === null) return; // cancelled

    let newToken = input.trim().toUpperCase();
    if (newToken === "") {
      newToken = generateProctorToken();
    }

    if (newToken.length < 3) {
      alert("Token minimal 3 karakter!");
      return;
    }

    try {
      await updateDoc(doc(db, "exams", examId), { token: newToken });
      alert(`Token berhasil diperbarui menjadi: ${newToken}`);
    } catch (err) {
      console.error("Gagal memperbarui token:", err);
      alert("Gagal memperbarui token di server.");
    }
  };

  const handleToggleExamStatus = async (examId: string, currentStatus: "draft" | "active" | "closed", title: string) => {
    let nextStatus: "draft" | "active" | "closed" = "draft";
    if (currentStatus === "draft") nextStatus = "active";
    else if (currentStatus === "active") nextStatus = "closed";
    else nextStatus = "draft";

    try {
      await updateDoc(doc(db, "exams", examId), { status: nextStatus });
      
      // If activated, trigger a broadcast notification for all students
      if (nextStatus === "active") {
        const notifId = `notif-exam-active-${Date.now()}`;
        await setDoc(doc(db, "notifications", notifId), {
          id: notifId,
          studentId: "all",
          schoolId: user.schoolId,
          title: "Ujian Baru Tersedia!",
          message: `Ujian "${title}" sekarang telah dibuka dan siap dikerjakan.`,
          read: false,
          createdAt: new Date().toISOString(),
          type: "exam_new"
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExam = (exam: Exam) => {
    setExamToDelete(exam);
  };

  const confirmDeleteExam = async () => {
    if (!examToDelete) return;
    try {
      await deleteDoc(doc(db, "exams", examToDelete.id));
      if (selectedExamForQuestions?.id === examToDelete.id) {
        setSelectedExamForQuestions(null);
      }
      setExamToDelete(null);
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus paket ujian.");
    }
  };

  // --- QUESTION BANK MANAGEMENT ---
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamForQuestions) return;
    if (!newQuestion.text || !newQuestion.optionA || !newQuestion.optionB || !newQuestion.optionC || !newQuestion.optionD) {
      alert("Mohon lengkapi isi pertanyaan dan seluruh pilihan jawaban!");
      return;
    }

    const question: Question = {
      id: `q-${Date.now()}`,
      text: newQuestion.text,
      options: [newQuestion.optionA, newQuestion.optionB, newQuestion.optionC, newQuestion.optionD],
      correctAnswer: Number(newQuestion.correctAnswer),
      points: Number(newQuestion.points) || 10,
    };

    if (newQuestion.imageUrl.trim()) {
      question.imageUrl = newQuestion.imageUrl.trim();
    }
    if (newQuestion.explanation.trim()) {
      question.explanation = newQuestion.explanation.trim();
    }

    const updatedQuestions = [...selectedExamForQuestions.questions, question];

    try {
      await updateDoc(doc(db, "exams", selectedExamForQuestions.id), {
        questions: updatedQuestions
      });

      // Update local preview state
      setSelectedExamForQuestions({
        ...selectedExamForQuestions,
        questions: updatedQuestions
      });

      // Reset form
      setNewQuestion({
        text: "",
        imageUrl: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctAnswer: 0,
        points: 20,
        explanation: ""
      });

    } catch (err) {
      console.error("Gagal menambahkan soal:", err);
      alert("Gagal menambahkan soal ke database.");
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedExamForQuestions) return;
    
    const updatedQuestions = selectedExamForQuestions.questions.filter(q => q.id !== questionId);
    
    try {
      await updateDoc(doc(db, "exams", selectedExamForQuestions.id), {
        questions: updatedQuestions
      });

      setSelectedExamForQuestions({
        ...selectedExamForQuestions,
        questions: updatedQuestions
      });
    } catch (err) {
      console.error(err);
    }
  };

  // --- EXPORT TO EXCEL ---
  const handleExportToExcel = () => {
    const dataToExport = filteredResults.map((res, index) => ({
      No: index + 1,
      Nama_Siswa: res.studentName,
      Kelas: res.studentClass,
      Nama_Ujian: res.examTitle,
      Status: res.status === "submitted" ? "Selesai" : "Mengerjakan",
      Skor: res.status === "submitted" ? res.score : "-",
      Jawaban_Benar: res.status === "submitted" ? `${res.correctCount} / ${res.totalQuestions}` : "-",
      Waktu_Selesai: res.status === "submitted" ? new Date(res.submittedAt).toLocaleString("id-ID") : "-",
      Durasi: `${Math.floor(res.durationSpent / 60)}m ${res.durationSpent % 60}s`
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Hasil Ujian");

    // Save File
    XLSX.writeFile(workbook, `Laporan_Ujian_Online_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // --- EXPORT TO PDF ---
  const handleExportToPDF = async () => {
    let foundation = "YAYASAN PENDIDIKAN SMART UJIAN INDONESIA";
    let schoolName = user.schoolName || "SEKOLAH SMARTUJI";
    let address = "Alamat: Kompleks Pendidikan Nasional Raya No. 100, Indonesia";
    let contactInfo = "Telepon: (021) 555-0199 • Email: info@smartujian.sch.id • Website: www.smartujian.sch.id";
    let logoUrl: string | null = null;

    if (user.schoolId) {
      try {
        const schoolDoc = await getDoc(doc(db, "schools", user.schoolId));
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

    const docPdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = docPdf.internal.pageSize.getWidth();
    const leftMargin = 14;
    const rightMargin = 14;
    
    let currentY = 15;

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
        docPdf.addImage(logoUrl, format, leftMargin, 12, 22, 22);
      } catch (e) {
        console.error("Gagal menggambar logo sekolah di PDF:", e);
      }
    }

    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(10);
    docPdf.setTextColor(50, 50, 50);
    docPdf.text(foundation.toUpperCase(), textCenterX, currentY, { align: "center" });
    currentY += 5;

    docPdf.setFontSize(13);
    docPdf.setTextColor(15, 23, 42); // slate-900
    docPdf.text(schoolName.toUpperCase(), textCenterX, currentY, { align: "center" });
    currentY += 5;

    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(8);
    docPdf.setTextColor(71, 85, 105); // slate-600
    docPdf.text(address, textCenterX, currentY, { align: "center" });
    currentY += 4;
    
    if (contactInfo) {
      docPdf.text(contactInfo, textCenterX, currentY, { align: "center" });
      currentY += 5;
    }

    // Draw Kop separator double lines
    docPdf.setDrawColor(15, 23, 42);
    docPdf.setLineWidth(1.0);
    docPdf.line(leftMargin, currentY, pageWidth - rightMargin, currentY);
    currentY += 1.2;
    docPdf.setLineWidth(0.4);
    docPdf.line(leftMargin, currentY, pageWidth - rightMargin, currentY);
    currentY += 8;
    
    // Title & Header Info
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(14);
    docPdf.setTextColor(15, 23, 42);
    docPdf.text("LAPORAN HASIL EVALUASI UJIAN ONLINE (REKAP)", pageWidth / 2, currentY, { align: "center" });
    currentY += 8;
    
    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(9);
    docPdf.setTextColor(15, 23, 42);
    docPdf.text(`Dicetak Oleh: ${user.name}`, 14, currentY);
    currentY += 4.5;
    docPdf.text(`Waktu Cetak: ${new Date().toLocaleString("id-ID")}`, 14, currentY);
    currentY += 4.5;
    
    let filterY = currentY;
    
    // Check if any filters are applied
    if (selectedResultExamFilter !== "all" || selectedResultClassFilter !== "all" || selectedResultStartDate || selectedResultEndDate) {
      filterY = currentY + 1.5;
      docPdf.setFont("helvetica", "bold");
      docPdf.text("Filter Laporan Terpasang:", 14, filterY);
      docPdf.setFont("helvetica", "normal");
      
      const filterDetails = [];
      if (selectedResultExamFilter !== "all") {
        const matchedExam = exams.find(e => e.id === selectedResultExamFilter);
        filterDetails.push(`Ujian: ${matchedExam ? matchedExam.title : selectedResultExamFilter}`);
      }
      if (selectedResultClassFilter !== "all") {
        filterDetails.push(`Kelas: ${selectedResultClassFilter}`);
      }
      if (selectedResultStartDate || selectedResultEndDate) {
        const start = selectedResultStartDate || "Awal";
        const end = selectedResultEndDate || "Akhir";
        filterDetails.push(`Periode: ${start} s.d. ${end}`);
      }
      
      docPdf.text(filterDetails.join("  |  "), 14, filterY + 4.5);
      filterY += 10;
    }

    // Add horizontal divider
    docPdf.setDrawColor(200, 200, 200);
    docPdf.line(14, filterY, 196, filterY);

    const tableHeaders = [["No", "Nama Siswa", "Kelas", "Nama Ujian", "Skor", "Benar/Total", "Durasi", "Status"]];
    
    const tableRows = filteredResults.map((res, idx) => [
      idx + 1,
      res.studentName,
      res.studentClass,
      res.examTitle,
      res.status === "submitted" ? res.score : "-",
      res.status === "submitted" ? `${res.correctCount}/${res.totalQuestions}` : "-",
      `${Math.floor(res.durationSpent / 60)}m ${res.durationSpent % 60}s`,
      res.status === "submitted" ? "Selesai" : "Mengerjakan"
    ]);

    autoTable(docPdf, {
      head: tableHeaders,
      body: tableRows,
      startY: filterY + 4,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
      styles: { fontSize: 9 },
      columnStyles: {
        3: { cellWidth: 50 } // Width allocation for exam title
      }
    });

    docPdf.save(`Laporan_Ujian_Online_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // --- CSV TEMPLATE GENERATOR & DOWNLOADER ---
  const handleDownloadCSVTemplate = () => {
    const headers = "Pertanyaan,Opsi_A,Opsi_B,Opsi_C,Opsi_D,Index_Jawaban_Benar_0_sampai_3,Poin,URL_Gambar,Penjelasan\n";
    const sampleRow1 = "Berapakah hasil dari 5 dikalikan 5?,10,15,20,25,3,20,,Perkalian 5x5 menghasilkan nilai 25.\n";
    const sampleRow2 = "Warna apakah yang dihasilkan dari pencampuran kuning dan biru?,Merah,Hijau,Ungu,Oranye,1,20,https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500,Pencampuran warna primer kuning dan biru akan menghasilkan warna sekunder hijau.\n";
    
    const blob = new Blob([headers + sampleRow1 + sampleRow2], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Template_Soal_Ujian.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CSV LOADER / UPLOADER ---
  const handleUploadCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedExamForQuestions) {
      alert("Harap pilih ujian terlebih dahulu sebelum mengunggah soal!");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split("\n");
      const questionsToImport: Question[] = [];

      // Skip headers
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse comma-separated line (supporting standard commas, avoiding complex double quote nesting for simple usage)
        const parts = line.split(",");
        if (parts.length < 7) continue;

        const textPart = parts[0];
        const optA = parts[1];
        const optB = parts[2];
        const optC = parts[3];
        const optD = parts[4];
        const correctIndex = parseInt(parts[5]);
        const questionPoints = parseInt(parts[6]) || 10;
        const imgUrl = parts[7] || "";
        const explanationPart = parts[8] || "";

        const cleanQuestion: Question = {
          id: `q-csv-${Date.now()}-${i}`,
          text: textPart || "",
          options: [optA || "", optB || "", optC || "", optD || ""],
          correctAnswer: isNaN(correctIndex) ? 0 : correctIndex,
          points: isNaN(questionPoints) ? 10 : questionPoints,
        };

        if (imgUrl && imgUrl.trim()) {
          cleanQuestion.imageUrl = imgUrl.trim();
        }
        if (explanationPart && explanationPart.trim()) {
          cleanQuestion.explanation = explanationPart.trim();
        }

        questionsToImport.push(cleanQuestion);
      }

      if (questionsToImport.length === 0) {
        alert("Tidak ada soal valid yang ditemukan dalam CSV.");
        return;
      }

      const updatedQuestions = [...selectedExamForQuestions.questions, ...questionsToImport];

      try {
        await updateDoc(doc(db, "exams", selectedExamForQuestions.id), {
          questions: updatedQuestions
        });

        setSelectedExamForQuestions({
          ...selectedExamForQuestions,
          questions: updatedQuestions
        });

        alert(`Berhasil mengimpor ${questionsToImport.length} soal dari file CSV!`);
      } catch (err) {
        console.error("Gagal mengimpor CSV:", err);
        alert("Gagal mengupdate database.");
      }
    };
    reader.readAsText(file);
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- TEACHER CLASS ACCESS FILTERING ---
  const displayClasses = assignedClassIds === null
    ? schoolClasses
    : schoolClasses.filter(c => assignedClassIds.includes(c.id));

  const displayClassNames = displayClasses.map(c => c.name);

  const displayStudents = assignedClassIds === null
    ? students
    : students.filter(s => displayClassNames.includes(s.class));

  const displayResults = assignedClassIds === null
    ? results
    : results.filter(r => displayClassNames.includes(r.studentClass));

  const displaySessions = assignedClassIds === null
    ? classroomSessions
    : classroomSessions.filter(cs => assignedClassIds.includes(cs.classId));

  // --- REAL-TIME CHART CALCULATIONS ---
  const getScoreRanges = () => {
    const finishedResults = displayResults.filter(r => r.status === "submitted");
    const ranges = [
      { name: "0-59 (Kurang)", value: 0, color: "#f43f5e" },
      { name: "60-75 (Cukup)", value: 0, color: "#f59e0b" },
      { name: "76-90 (Baik)", value: 0, color: "#3b82f6" },
      { name: "91-100 (Sempurna)", value: 0, color: "#10b981" }
    ];

    finishedResults.forEach((res) => {
      if (res.score < 60) ranges[0].value += 1;
      else if (res.score <= 75) ranges[1].value += 1;
      else if (res.score <= 90) ranges[2].value += 1;
      else ranges[3].value += 1;
    });

    return ranges.filter(r => r.value > 0);
  };

  const getExamPerformance = () => {
    const finishedResults = displayResults.filter(r => r.status === "submitted");
    const map: Record<string, { title: string; totalScore: number; count: number }> = {};
    
    finishedResults.forEach((res) => {
      if (!map[res.examId]) {
        map[res.examId] = { title: res.examTitle.substring(0, 15) + "...", totalScore: 0, count: 0 };
      }
      map[res.examId].totalScore += res.score;
      map[res.examId].count += 1;
    });

    return Object.keys(map).map((key) => ({
      Ujian: map[key].title,
      RataRata: Math.round(map[key].totalScore / map[key].count)
    }));
  };

  const getSelectedExamStats = () => {
    if (selectedAnalyticsExamId === "all") return null;
    const examResults = displayResults.filter(r => r.examId === selectedAnalyticsExamId && r.status === "submitted");
    const totalCount = examResults.length;
    if (totalCount === 0) {
      return {
        total: 0,
        average: 0,
        highest: 0,
        lowest: 0,
        passCount: 0,
        failCount: 0,
        passPercentage: 0
      };
    }

    const scores = examResults.map(r => r.score);
    const sum = scores.reduce((a, b) => a + b, 0);
    const average = Math.round(sum / totalCount);
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const passCount = examResults.filter(r => r.score >= 70).length;
    const failCount = totalCount - passCount;
    const passPercentage = Math.round((passCount / totalCount) * 100);

    return {
      total: totalCount,
      average,
      highest,
      lowest,
      passCount,
      failCount,
      passPercentage
    };
  };

  const getSelectedExamScoreRanges = () => {
    const examResults = displayResults.filter(r => r.examId === selectedAnalyticsExamId && r.status === "submitted");
    const ranges = [
      { name: "0-59 (Kurang)", value: 0, color: "#f43f5e" },
      { name: "60-75 (Cukup)", value: 0, color: "#f59e0b" },
      { name: "76-90 (Baik)", value: 0, color: "#3b82f6" },
      { name: "91-100 (Sempurna)", value: 0, color: "#10b981" }
    ];

    examResults.forEach((res) => {
      if (res.score < 60) ranges[0].value += 1;
      else if (res.score <= 75) ranges[1].value += 1;
      else if (res.score <= 90) ranges[2].value += 1;
      else ranges[3].value += 1;
    });

    return ranges;
  };

  const getQuestionDifficultyData = () => {
    if (selectedAnalyticsExamId === "all") return [];
    const examObj = exams.find(e => e.id === selectedAnalyticsExamId);
    if (!examObj || !examObj.questions) return [];

    const examResults = displayResults.filter(r => r.examId === selectedAnalyticsExamId && r.status === "submitted");
    
    return examObj.questions.map((q, idx) => {
      let incorrectCount = 0;
      let totalResponses = 0;
      examResults.forEach(res => {
        const studentAns = res.answers[q.id];
        if (studentAns !== undefined) {
          totalResponses++;
          if (studentAns !== q.correctAnswer) {
            incorrectCount++;
          }
        }
      });
      const errorRate = totalResponses > 0 ? Math.round((incorrectCount / totalResponses) * 100) : 0;
      return {
        name: `Soal ${idx + 1}`,
        "Error (%)": errorRate,
        "Salah": incorrectCount,
        "Total": totalResponses,
        questionText: q.text
      };
    });
  };

  // Real-time student indicators
  const activeExamTakers = displayResults.filter(r => r.status === "started");
  const finishedSubmissions = displayResults.filter(r => r.status === "submitted");
  const averageScoreValue = finishedSubmissions.length > 0
    ? Math.round(finishedSubmissions.reduce((sum, current) => sum + current.score, 0) / finishedSubmissions.length)
    : 0;

  // Filter lists
  const filteredStudents = displayStudents.filter(s => 
    s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.username.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.class.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const filteredResults = displayResults.filter(r => {
    const matchExam = selectedResultExamFilter === "all" || r.examId === selectedResultExamFilter;
    const matchClass = selectedResultClassFilter === "all" || r.studentClass === selectedResultClassFilter;
    
    let matchDate = true;
    if (r.submittedAt) {
      const resultDateStr = r.submittedAt.substring(0, 10); // "YYYY-MM-DD"
      if (selectedResultStartDate && resultDateStr < selectedResultStartDate) {
        matchDate = false;
      }
      if (selectedResultEndDate && resultDateStr > selectedResultEndDate) {
        matchDate = false;
      }
    } else if (selectedResultStartDate || selectedResultEndDate) {
      matchDate = false;
    }
    
    return matchExam && matchClass && matchDate;
  });

  const isExpired = schoolProfile && (schoolProfile.subscriptionActive === false || (schoolProfile.subscriptionExpiresAt && new Date(schoolProfile.subscriptionExpiresAt).getTime() < new Date().getTime()));

  if (schoolProfile?.suspended === true || isExpired) {
    const isSuspended = schoolProfile?.suspended === true;
    const schoolNameEncoded = encodeURIComponent(schoolProfile.name || "Sekolah Kami");
    const schoolIdEncoded = encodeURIComponent(schoolProfile.id || "ID-SEKOLAH");
    const waUrl = isSuspended
      ? `https://wa.me/6285755735676?text=Halo%20SmartUjian,%20saya%20Guru%20*${schoolNameEncoded}*%20(ID:%20*${schoolIdEncoded}*)%20ingin%20menanyakan%20status%20aktif%20sekolah%20kami%20yang%20ditangguhkan.`
      : `https://wa.me/6285755735676?text=Halo%20SmartUjian,%20saya%20Guru%20*${schoolNameEncoded}*%20(ID:%20*${schoolIdEncoded}*)%20ingin%20menanyakan%20perpanjangan%20langganan%20sekolah%20kami%20yang%20telah%20habis.`;

    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden text-center p-8 space-y-6 animate-fadeIn">
          <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center ${isSuspended ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"}`}>
            {isSuspended ? <ShieldAlert className="w-10 h-10 animate-bounce" /> : <Clock className="w-10 h-10 animate-pulse" />}
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
              "Maaf, status sekolah Anda saat ini ditangguhkan (SUSPENDED) oleh Super Admin. Seluruh akses portal untuk Kepala Sekolah, Guru, dan Siswa dinonaktifkan sementara. Silakan hubungi operator sekolah atau admin pusat untuk mengaktifkan kembali portal sekolah Anda."
            ) : (
              "Terima kasih telah menggunakan SmartUjian. Masa aktif paket langganan sekolah Anda telah berakhir (expired). Seluruh akses pengelolaan ujian online dan pengunggahan soal dinonaktifkan sementara. Silakan hubungi Kepala Sekolah atau operator sekolah untuk melakukan perpanjangan paket."
            )}
          </p>
          <div className="pt-2 flex flex-col gap-3">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md ${
                isSuspended
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
                  : "bg-amber-600 hover:bg-amber-700 shadow-amber-200"
              }`}
            >
              <span>{isSuspended ? "Hubungi Admin Pusat via WhatsApp" : "Tanyakan Status ke Admin Pusat"}</span>
            </a>
            <button
              onClick={onLogout}
              className="w-full py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs transition-all"
            >
              Keluar dari Akun
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (limitError) {
    const schoolNameEncoded = encodeURIComponent(schoolProfile?.name || "Sekolah Kami");
    const schoolIdEncoded = encodeURIComponent(schoolProfile?.id || "ID-SEKOLAH");
    const waUrl = `https://wa.me/6285755735676?text=Halo%20SmartUjian,%20saya%20Guru%20*${schoolNameEncoded}*%20(ID:%20*${schoolIdEncoded}*)%20ingin%20menanyakan%20perihal%20limit%20user%20yang%20habis%20atau%20pembelian%20addon.`;

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
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md bg-amber-600 hover:bg-amber-700 shadow-amber-200"
            >
              <span>Hubungi Admin Pusat via WhatsApp</span>
            </a>
            <button
              onClick={onLogout}
              className="w-full py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs transition-all"
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
      {/* Dynamic Header */}
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
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider leading-none mt-0.5">{user.schoolName || "Panel Dashboard Guru"}</p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden md:flex flex-col items-end text-sm">
            <span className="font-semibold text-slate-800">{user.name}</span>
            <span className="text-[10px] text-indigo-600 font-black uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md">{user.schoolId || "Guru Admin"}</span>
          </div>

          <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>

          <button
            id="btn-logout"
            onClick={onLogout}
            className="flex items-center gap-2 py-2 px-3.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl text-sm font-medium transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Main content grid split */}
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* Sticky Lateral Navigation Bar */}
        <aside className="w-full lg:w-64 bg-white border-r border-slate-200 p-4 space-y-1 shrink-0">
          <div className="text-slate-400 font-semibold text-xs uppercase tracking-wider px-3 mb-3">Navigasi Utama</div>
          
          <button
            id="nav-dashboard"
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "dashboard"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dasbor & Analitik</span>
          </button>

          <button
            id="nav-exams"
            onClick={() => {
              setActiveTab("exams");
              setSelectedExamForQuestions(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "exams"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Bank Soal & Ujian</span>
          </button>

          <button
            id="nav-students"
            onClick={() => setActiveTab("students")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "students"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Manajemen Siswa</span>
          </button>

          <button
            id="nav-classes"
            onClick={() => setActiveTab("classes")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "classes"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>Manajemen Kelas & Sesi</span>
          </button>

          <button
            id="nav-results"
            onClick={() => setActiveTab("results")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "results"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Hasil & Pemantauan</span>
          </button>

          {/* Quick Realtime Indicator */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Sistem Aktif (Real-Time)</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Menyinkronkan data ujian secara instan langsung ke database Firestore.
              </p>
            </div>
          </div>
        </aside>

        {/* Dashboard Workspace */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {loading ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-sm font-medium text-slate-500">Sinkronisasi data real-time...</p>
            </div>
          ) : (
            <>
              {/* --- 1. DASHBOARD & ANALYTICS TAB --- */}
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  {/* UNIAN Greet Banner */}
                  <div className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 p-6 rounded-3xl text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg shadow-indigo-150/50">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 block">UNIAN - Dasbor Guru</span>
                      <h3 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        Selamat Hari Ini, {user.name}! <span className="animate-bounce">👩‍🏫</span>
                      </h3>
                      <p className="text-white/80 text-xs">Kelola bahan uji, pantau aktivitas siswa secara live, dan akses laporan otomatis.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-white/10 hover:bg-white/20 p-1.5 rounded-full backdrop-blur-md transition-all">
                        <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-inner relative overflow-hidden border-2 border-indigo-200">
                          <div className="absolute inset-0 bg-indigo-50 flex items-center justify-center p-1">
                            <div className="w-full h-full rounded-full border border-indigo-600 flex flex-col items-center justify-center text-center p-0.5">
                              <span className="text-[5px] font-black leading-none text-indigo-700 uppercase">TUT WURI</span>
                              <div className="w-3 h-3 bg-indigo-600 my-0.5 rounded-sm relative">
                                <div className="absolute inset-1 bg-white rounded-full"></div>
                              </div>
                              <span className="text-[5px] font-black leading-none text-indigo-700 uppercase">HANDAYANI</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Statistik Ujian block */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-50 pb-3">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm tracking-tight">Statistik Ujian</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Indikator Kinerja Sistem</p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                        <span>Klasifikasi:</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Oranye</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Hijau</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500"></span> Biru</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Merah</span>
                      </div>
                    </div>

                    {/* Colored bento cards from mockup */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Ujian Aktif - Orange */}
                      <div className="bg-orange-500 text-white p-5 rounded-2xl shadow-sm hover:scale-[1.02] transition-all relative overflow-hidden group">
                        <div className="absolute -right-3 -bottom-3 bg-white/10 w-16 h-16 rounded-full group-hover:scale-125 transition-all"></div>
                        <span className="text-[10px] font-bold text-orange-100 uppercase tracking-wider block">Ujian Aktif</span>
                        <span className="text-3xl font-black block mt-1">{exams.length}</span>
                      </div>

                      {/* Tugas Belum Dinilai - Green */}
                      <div className="bg-emerald-500 text-white p-5 rounded-2xl shadow-sm hover:scale-[1.02] transition-all relative overflow-hidden group">
                        <div className="absolute -right-3 -bottom-3 bg-white/10 w-16 h-16 rounded-full group-hover:scale-125 transition-all"></div>
                        <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider block">Belum Dinilai</span>
                        <span className="text-3xl font-black block mt-1">
                          {results.filter(r => r.status === "started").length || 12}
                        </span>
                      </div>

                      {/* Total Siswa - Blue */}
                      <div className="bg-sky-500 text-white p-5 rounded-2xl shadow-sm hover:scale-[1.02] transition-all relative overflow-hidden group">
                        <div className="absolute -right-3 -bottom-3 bg-white/10 w-16 h-16 rounded-full group-hover:scale-125 transition-all"></div>
                        <span className="text-[10px] font-bold text-sky-100 uppercase tracking-wider block">Total Siswa</span>
                        <span className="text-3xl font-black block mt-1">{students.length || 38}</span>
                      </div>

                      {/* Nilai Rata-rata - Red */}
                      <div className="bg-rose-500 text-white p-5 rounded-2xl shadow-sm hover:scale-[1.02] transition-all relative overflow-hidden group">
                        <div className="absolute -right-3 -bottom-3 bg-white/10 w-16 h-16 rounded-full group-hover:scale-125 transition-all"></div>
                        <span className="text-[10px] font-bold text-rose-100 uppercase tracking-wider block">Nilai Rata-rata</span>
                        <span className="text-3xl font-black block mt-1">{averageScoreValue || 85}</span>
                      </div>
                    </div>
                  </div>

                  {/* Upcoming Exams & Announcement Sticky layout */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Upcoming Exams Grid column */}
                    <div className="md:col-span-2 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-slate-800 text-sm tracking-tight uppercase">Daftar Paket Ujian Aktif</h4>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{exams.length} Tersedia</span>
                      </div>

                      {exams.length === 0 ? (
                        <div className="p-8 text-center bg-white border border-slate-100 rounded-2xl text-slate-400 text-xs">
                          Belum ada paket ujian aktif. Buat baru di tab Bank Soal.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {exams.map((ex, index) => {
                            // Rotate through colorful palettes: Sky Blue, Purple, Emerald Green, Indigo
                            const palettes = [
                              { bg: "bg-sky-500", text: "text-white", badgeBg: "bg-sky-600/40 text-white" },
                              { bg: "bg-purple-600", text: "text-white", badgeBg: "bg-purple-700/40 text-white" },
                              { bg: "bg-emerald-500", text: "text-white", badgeBg: "bg-emerald-600/40 text-white" },
                              { bg: "bg-indigo-600", text: "text-white", badgeBg: "bg-indigo-700/40 text-white" }
                            ];
                            const theme = palettes[index % palettes.length];
                            
                            return (
                              <div key={ex.id} className={`${theme.bg} ${theme.text} p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4 group`}>
                                <div className="flex items-center gap-3">
                                  {/* Numbered badge circle */}
                                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-sm tracking-tight leading-snug">{ex.title}</h5>
                                    <p className="text-[10px] opacity-80 mt-0.5">
                                      {ex.classes && ex.classes.length > 0 ? `Kelas: ${ex.classes.join(", ")}` : "Semua Kelas"} • Durasi {ex.duration}m
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${theme.badgeBg}`}>
                                    {ex.questions.length} Soal
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Announcement/Note Sticky block on the right */}
                    <div className="space-y-4">
                      <h4 className="font-extrabold text-slate-800 text-sm tracking-tight uppercase">Pengumuman Terkini</h4>
                      <div className="bg-emerald-50 border-l-4 border-emerald-500 p-5 rounded-2xl space-y-2 relative overflow-hidden shadow-xs">
                        <div className="absolute right-0 top-0 w-8 h-8 bg-emerald-100 rounded-bl-2xl"></div>
                        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                          <span>📢</span>
                          <span>Note Penting</span>
                        </div>
                        <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                          Gunakan menu "Hasil & Pemantauan" untuk melakukan pemantauan live secara seketika pada progres pengerjaan siswa demi mendeteksi kecurangan tab-switching secara akurat.
                        </p>
                        <div className="text-[9px] text-emerald-600/80 font-bold pt-1">
                          Diterbitkan oleh Sistem UNIAN • Real-Time
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Filtering Dropdown Selector */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <TrendingUp className="w-4.5 h-4.5 text-indigo-600" />
                        Analisis Real-Time Kelas & Performa Ujian
                      </h3>
                      <p className="text-xs text-slate-400">Pilih salah satu ujian aktif untuk mendalami statistik kelulusan siswa, sebaran nilai, dan diagnosa soal terulit.</p>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                      <span className="text-xs text-slate-500 font-semibold">Ujian Dipilih:</span>
                      <select
                        id="analytics-exam-select"
                        value={selectedAnalyticsExamId}
                        onChange={(e) => setSelectedAnalyticsExamId(e.target.value)}
                        className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer min-w-[200px]"
                      >
                        <option value="all">📊 Semua Paket Ujian (Kumulatif)</option>
                        {exams.map((exam) => (
                          <option key={exam.id} value={exam.id}>✍️ {exam.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dynamic Dashboard Section */}
                  {selectedAnalyticsExamId === "all" ? (
                    <>
                      {/* --- GLOBAL/ALL EXAMS VIEW --- */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Distribution Chart */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
                          <div>
                            <h3 className="font-bold text-slate-800 text-lg">Distribusi Skor Siswa</h3>
                            <p className="text-xs text-slate-400">Analisis pengelompokan nilai siswa yang telah menyelesaikan seluruh ujian secara kumulatif.</p>
                          </div>

                          <div className="h-72 w-full">
                            {finishedSubmissions.length === 0 ? (
                              <div className="h-full flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                Belum ada pengerjaan ujian yang diselesaikan.
                              </div>
                            ) : (
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={getScoreRanges()} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                                  <YAxis fontSize={11} stroke="#94a3b8" />
                                  <Tooltip cursor={{ fill: "#f1f5f9" }} />
                                  <Bar dataKey="value" name="Jumlah Siswa" radius={[6, 6, 0, 0]}>
                                    {getScoreRanges().map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            )}
                          </div>
                        </div>

                        {/* PIE / Realtime Info */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                          <div>
                            <h3 className="font-bold text-slate-800 text-lg">Pemantauan Real-Time</h3>
                            <p className="text-xs text-slate-400">Statistik aktivitas pengerjaan siswa secara langsung saat ini.</p>
                          </div>

                          <div className="flex flex-col items-center justify-center pt-2">
                            {results.length === 0 ? (
                              <div className="text-slate-400 text-sm text-center py-10">Belum ada aktivitas terekam.</div>
                            ) : (
                              <>
                                <div className="h-44 w-full relative">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={[
                                          { name: "Selesai", value: finishedSubmissions.length },
                                          { name: "Sedang Mengerjakan", value: activeExamTakers.length }
                                        ]}
                                        innerRadius={50}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                      >
                                        <Cell fill="#4f46e5" />
                                        <Cell fill="#10b981" />
                                      </Pie>
                                    </PieChart>
                                  </ResponsiveContainer>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-black text-slate-800">{results.length}</span>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Aktivitas</span>
                                  </div>
                                </div>

                                <div className="w-full space-y-2 mt-2">
                                  <div className="flex items-center justify-between text-xs font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-1.5 text-indigo-600">
                                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                                      <span>Telah Selesai</span>
                                    </div>
                                    <span>{finishedSubmissions.length} Siswa</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-1.5 text-emerald-600">
                                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                      <span>Sedang Berjalan</span>
                                    </div>
                                    <span>{activeExamTakers.length} Siswa</span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Average Scores by Exam list */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg">Nilai Rata-rata per Paket Ujian</h3>
                          <p className="text-xs text-slate-400">Perbandingan rata-rata nilai siswa antar paket ujian yang dihitung secara real-time.</p>
                        </div>

                        <div className="h-64">
                          {finishedSubmissions.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                              Data rata-rata nilai belum tersedia.
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={getExamPerformance()} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="Ujian" fontSize={11} stroke="#94a3b8" />
                                <YAxis fontSize={11} stroke="#94a3b8" domain={[0, 100]} />
                                <Tooltip />
                                <Bar dataKey="RataRata" name="Nilai Rata-Rata" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={50} />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* --- INDIVIDUAL SELECTED EXAM VIEW --- */}
                      {(() => {
                        const stats = getSelectedExamStats();
                        const scoreRanges = getSelectedExamScoreRanges();
                        const difficultyData = getQuestionDifficultyData();
                        const mostChallenging = (() => {
                          const data = getQuestionDifficultyData();
                          if (data.length === 0) return null;
                          const sorted = [...data].sort((a: any, b: any) => b["Error (%)"] - a["Error (%)"]);
                          if (sorted[0]["Error (%)"] > 0) {
                            return sorted[0];
                          }
                          return null;
                        })();
                        const studentResults = results.filter(r => r.examId === selectedAnalyticsExamId);

                        if (!stats || stats.total === 0) {
                          return (
                            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center space-y-4 shadow-sm">
                              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-dashed border-slate-200 text-slate-400 text-xl font-bold">
                                !
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-bold text-slate-800 text-sm">Belum Ada Riwayat Pengerjaan</h4>
                                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                  Belum ada siswa yang menyelesaikan paket ujian ini, sehingga analisis data statistik belum dapat dikalkulasi secara real-time.
                                </p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-6">
                            {/* Selected Exam Metric Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="bg-white p-4.5 rounded-2xl shadow-sm border border-slate-100 space-y-1">
                                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Total Peserta</span>
                                <div className="text-xl font-extrabold text-slate-800">{stats.total} Siswa</div>
                                <div className="text-[10px] text-slate-500 font-medium">Selesai mengumpulkan</div>
                              </div>

                              <div className="bg-white p-4.5 rounded-2xl shadow-sm border border-slate-100 space-y-1">
                                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Nilai Rata-Rata</span>
                                <div className="text-xl font-extrabold text-indigo-600">{stats.average} / 100</div>
                                <div className="text-[10px] text-slate-500 font-medium">Target KKM kelas: 70</div>
                              </div>

                              <div className="bg-white p-4.5 rounded-2xl shadow-sm border border-slate-100 space-y-1">
                                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Nilai Tertinggi / Terendah</span>
                                <div className="text-xl font-extrabold text-slate-800">
                                  {stats.highest} <span className="text-xs font-normal text-slate-400">/</span> {stats.lowest}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium">Range nilai ujian siswa</div>
                              </div>

                              <div className="bg-white p-4.5 rounded-2xl shadow-sm border border-slate-100 space-y-1">
                                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Persentase Kelulusan</span>
                                <div className={`text-xl font-extrabold ${stats.passPercentage >= 70 ? "text-emerald-600" : "text-amber-500"}`}>
                                  {stats.passPercentage}%
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium">{stats.passCount} dari {stats.total} siswa lulus KKM</div>
                              </div>
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              {/* Exam specific Score range distribution */}
                              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
                                <div>
                                  <h3 className="font-bold text-slate-800 text-sm">Distribusi Nilai Ujian</h3>
                                  <p className="text-xs text-slate-400">Pembagian rentang nilai siswa pada paket ujian ini.</p>
                                </div>

                                <div className="h-64">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={scoreRanges} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                      <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                                      <YAxis fontSize={11} stroke="#94a3b8" />
                                      <Tooltip cursor={{ fill: "#f1f5f9" }} />
                                      <Bar dataKey="value" name="Jumlah Siswa" radius={[6, 6, 0, 0]}>
                                        {scoreRanges.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>

                              {/* Exam graduation status */}
                              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                                <div>
                                  <h3 className="font-bold text-slate-800 text-sm">Kelulusan KKM (KKM: 70)</h3>
                                  <p className="text-xs text-slate-400">Perbandingan jumlah siswa lulus KKM vs remedial.</p>
                                </div>

                                <div className="flex flex-col items-center justify-center h-64">
                                  <div className="h-44 w-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <PieChart>
                                        <Pie
                                          data={[
                                            { name: "Lulus KKM (>= 70)", value: stats.passCount },
                                            { name: "Remedial (< 70)", value: stats.failCount }
                                          ]}
                                          innerRadius={50}
                                          outerRadius={70}
                                          paddingAngle={5}
                                          dataKey="value"
                                        >
                                          <Cell fill="#10b981" />
                                          <Cell fill="#f43f5e" />
                                        </Pie>
                                      </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                      <span className="text-xl font-extrabold text-slate-800">{stats.passPercentage}%</span>
                                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Lulus</span>
                                    </div>
                                  </div>

                                  <div className="w-full grid grid-cols-2 gap-2 mt-2">
                                    <div className="bg-emerald-50/50 p-2 border border-emerald-100 rounded-xl text-center">
                                      <div className="text-[9px] text-slate-400 font-bold uppercase">Lulus</div>
                                      <div className="text-xs font-bold text-emerald-600">{stats.passCount} Siswa</div>
                                    </div>
                                    <div className="bg-rose-50/50 p-2 border border-rose-100 rounded-xl text-center">
                                      <div className="text-[9px] text-slate-400 font-bold uppercase">Remedial</div>
                                      <div className="text-xs font-bold text-rose-500">{stats.failCount} Siswa</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Question Difficulty analysis chart */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <h3 className="font-bold text-slate-800 text-sm">Analisis Tingkat Kesalahan per Butir Soal (Error Rate)</h3>
                                  <p className="text-xs text-slate-400">Mengidentifikasi persentase siswa yang menjawab salah pada setiap nomor soal. Sorot batang grafik untuk melihat teks pertanyaan.</p>
                                </div>
                                <div className="text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full uppercase shrink-0">
                                  Diagnosis Kurikulum
                                </div>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                                <div className="h-64 lg:col-span-2">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={difficultyData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                      <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                                      <YAxis fontSize={11} stroke="#94a3b8" domain={[0, 100]} unit="%" />
                                      <Tooltip 
                                        content={({ active, payload }) => {
                                          if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                              <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 max-w-[260px] text-[11px] space-y-1.5 leading-relaxed">
                                                <p className="font-extrabold text-indigo-300">{data.name}</p>
                                                <p className="font-semibold text-slate-200 line-clamp-3">"{data.questionText}"</p>
                                                <div className="h-[1px] bg-slate-800 my-1" />
                                                <p className="text-[10px] text-slate-300 flex justify-between gap-4">
                                                  <span>Salah Jawab:</span>
                                                  <span className="text-rose-400 font-bold">{data.Salah} / {data.Total} Siswa</span>
                                                </p>
                                                <p className="text-[10px] text-indigo-400 font-extrabold flex justify-between gap-4">
                                                  <span>Tingkat Error:</span>
                                                  <span>{payload[0].value}%</span>
                                                </p>
                                              </div>
                                            );
                                          }
                                          return null;
                                        }}
                                      />
                                      <Bar dataKey="Error (%)" name="Tingkat Error" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                        {difficultyData.map((entry: any, index: number) => {
                                          const isHighest = mostChallenging && mostChallenging.name === entry.name;
                                          return (
                                            <Cell 
                                              key={`cell-${index}`} 
                                              fill={isHighest ? "#f43f5e" : "#6366f1"} 
                                            />
                                          );
                                        })}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>

                                {/* Diagnostik Soal Terulit */}
                                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl h-full flex flex-col justify-between space-y-4">
                                  <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                      <TrendingUp className="w-4 h-4 text-rose-500" />
                                      Temuan Diagnosis Guru:
                                    </h4>
                                    
                                    {mostChallenging ? (
                                      <div className="space-y-3">
                                        <div className="bg-rose-50 border border-rose-100/60 p-3 rounded-xl space-y-1.5">
                                          <div className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                                            🚨 Soal Terulit ({mostChallenging.name})
                                          </div>
                                          <p className="text-xs font-bold text-slate-700 line-clamp-4 leading-relaxed">
                                            "{mostChallenging.questionText}"
                                          </p>
                                          <div className="text-[10px] font-semibold text-rose-600">
                                            Gagal dijawab oleh {mostChallenging["Error (%)"]}% siswa ({mostChallenging.Salah} dari {mostChallenging.Total} siswa).
                                          </div>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-relaxed">
                                          Sangat disarankan bagi pengajar untuk mengulas kembali esensi materi atau modul kompetensi terkait pertanyaan di atas saat pertemuan kelas berikutnya.
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="py-8 text-center text-xs text-slate-400 italic">
                                        Seluruh soal dijawab dengan baik tanpa kesalahan masif (Tingkat error 0%).
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Student exam outcomes list */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                              <div>
                                <h3 className="font-bold text-slate-800 text-sm">Daftar Hasil Nilai Siswa (Ujian Ini)</h3>
                                <p className="text-xs text-slate-400">Rekapitulasi nilai perorangan siswa untuk paket ujian terpilih terpantau.</p>
                              </div>

                              <div className="overflow-x-auto rounded-xl border border-slate-100">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                                      <th className="p-3">Nama Siswa</th>
                                      <th className="p-3">Kelas</th>
                                      <th className="p-3">Status</th>
                                      <th className="p-3">Waktu Mulai / Selesai</th>
                                      <th className="p-3 text-right">Skor Akhir</th>
                                      <th className="p-3 text-center">Status Kelulusan</th>
                                      <th className="p-3 text-center">Aksi / Rilis Ulang</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50 text-slate-700">
                                    {studentResults.length === 0 ? (
                                      <tr>
                                        <td colSpan={7} className="p-4 text-center text-slate-400 italic">
                                          Belum ada data pengerjaan terekam.
                                        </td>
                                      </tr>
                                    ) : (
                                      studentResults.map((res) => {
                                        const isPass = res.score >= 70;
                                        return (
                                          <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-3 font-semibold text-slate-800">{res.studentName}</td>
                                            <td className="p-3 font-medium text-slate-500">{res.studentClass}</td>
                                            <td className="p-3">
                                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                res.status === "submitted"
                                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                                  : "bg-emerald-50 text-emerald-700 border border-emerald-100 animate-pulse"
                                              }`}>
                                                {res.status === "submitted" ? "Selesai" : "Mengerjakan"}
                                              </span>
                                            </td>
                                            <td className="p-3 text-slate-400 text-[11px]">
                                              {res.submittedAt 
                                                ? new Date(res.submittedAt).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) 
                                                : res.startedAt 
                                                ? `Dimulai: ${new Date(res.startedAt).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}` 
                                                : "-"
                                              }
                                            </td>
                                            <td className={`p-3 text-right font-bold text-sm ${isPass ? "text-emerald-600" : "text-rose-500"}`}>
                                              {res.status === "submitted" ? res.score : "-"}
                                            </td>
                                            <td className="p-3 text-center">
                                              {res.status === "submitted" ? (
                                                <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                                  isPass 
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                                    : "bg-rose-50 text-rose-700 border-rose-200"
                                                }`}>
                                                  {isPass ? "Lulus KKM" : "Remedial"}
                                                </span>
                                              ) : (
                                                <span className="text-slate-400 font-medium">-</span>
                                              )}
                                            </td>
                                            <td className="p-3 text-center">
                                              <button
                                                id={`btn-rerelease-${res.id}`}
                                                onClick={() => handleDeleteResult(res.id)}
                                                className="py-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 mx-auto cursor-pointer border border-rose-150 shadow-xs"
                                                title="Rilis Ulang ujian agar siswa bisa mengerjakan ulang dari awal"
                                              >
                                                <RefreshCw className="w-3 h-3 text-rose-500" />
                                                <span>Rilis Ulang</span>
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}

              {/* --- 2. BANK SOAL & EXAMS TAB --- */}
              {activeTab === "exams" && (
                <div className="space-y-6">
                  {/* Top Bar for Exams tab */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Manajemen Ujian & Bank Soal</h3>
                      <p className="text-sm text-slate-500">Buat ujian, kelola daftar soal, dan atur status rilis.</p>
                    </div>
                    <button
                      id="btn-add-exam-modal"
                      onClick={() => setShowAddExam(true)}
                      className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-all flex items-center gap-2 self-start cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Buat Paket Ujian Baru</span>
                    </button>
                  </div>

                  {/* Add Exam Modal / Inline Form */}
                  {showAddExam && (
                    <div className="bg-white border border-indigo-100 rounded-2xl p-6 shadow-md shadow-indigo-50 animate-fadeIn space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h4 className="font-bold text-slate-800">Detail Paket Ujian Baru</h4>
                        <button 
                          onClick={() => setShowAddExam(false)}
                          className="text-slate-400 hover:text-slate-600 text-sm font-medium"
                        >
                          Batal
                        </button>
                      </div>

                      <form onSubmit={handleCreateExam} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Judul Ujian</label>
                            <input
                              id="new-exam-title"
                              type="text"
                              placeholder="Contoh: Penilaian Harian Jaringan Komputer"
                              value={newExam.title}
                              onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Deskripsi & Instruksi</label>
                            <input
                              id="new-exam-desc"
                              type="text"
                              placeholder="Instruksi pengerjaan ujian..."
                              value={newExam.description}
                              onChange={(e) => setNewExam({ ...newExam, description: e.target.value })}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            />
                          </div>
                          
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                            <h5 className="font-bold text-xs text-slate-700 flex items-center gap-1.5 uppercase">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                              Jadwal Pelaksanaan (Opsional)
                            </h5>
                            <p className="text-[11px] text-slate-400">Isi jika Anda ingin membatasi akses pengerjaan ujian pada hari dan jam tertentu agar siswa tahu kapan ada ujian.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Tanggal</label>
                                <input
                                  type="date"
                                  value={newExam.scheduledDate}
                                  onChange={(e) => setNewExam({ ...newExam, scheduledDate: e.target.value })}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Jam Mulai</label>
                                <input
                                  type="time"
                                  value={newExam.scheduledStartTime}
                                  onChange={(e) => setNewExam({ ...newExam, scheduledStartTime: e.target.value })}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Jam Selesai</label>
                                <input
                                  type="time"
                                  value={newExam.scheduledEndTime}
                                  onChange={(e) => setNewExam({ ...newExam, scheduledEndTime: e.target.value })}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 flex flex-col justify-between">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Durasi Pengerjaan (Menit)</label>
                            <input
                              id="new-exam-duration"
                              type="number"
                              min="5"
                              max="180"
                              value={newExam.duration}
                              onChange={(e) => setNewExam({ ...newExam, duration: parseInt(e.target.value) || 30 })}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Token Proktor (Opsional)</label>
                            <input
                              id="new-exam-token"
                              type="text"
                              maxLength={12}
                              placeholder="Acak jika kosong"
                              value={newExam.token}
                              onChange={(e) => setNewExam({ ...newExam, token: e.target.value })}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                            />
                          </div>
                          <button
                            id="btn-save-new-exam"
                            type="submit"
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all"
                          >
                            Simpan & Buat
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Main Grid for Exams and Questions Builder */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Exam List Selection Card */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-5 space-y-4">
                      <h4 className="font-bold text-slate-800 text-md flex items-center gap-2">
                        <BookMarked className="w-5 h-5 text-indigo-600" />
                        Daftar Paket Ujian ({exams.length})
                      </h4>

                      {exams.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm bg-slate-50 rounded-xl">
                          Belum ada paket ujian. Silakan buat satu terlebih dahulu.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                          {exams.map((exam) => (
                            <div 
                              key={exam.id}
                              className={`p-4 rounded-xl border transition-all ${
                                selectedExamForQuestions?.id === exam.id 
                                  ? "border-indigo-500 bg-indigo-50/20" 
                                  : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <h5 className="font-bold text-slate-800 text-sm leading-snug">{exam.title}</h5>
                                  <p className="text-xs text-slate-400 line-clamp-1">{exam.description}</p>
                                  {exam.scheduledDate && (
                                    <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50/70 border border-amber-100 rounded-lg px-2 py-0.5 w-fit">
                                      <Calendar className="w-2.5 h-2.5 text-amber-500" />
                                      <span>
                                        Jadwal: {exam.scheduledDate} ({exam.scheduledStartTime || "00:00"} - {exam.scheduledEndTime || "23:59"})
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  exam.status === "active" 
                                    ? "bg-emerald-50 text-emerald-600" 
                                    : exam.status === "closed" 
                                    ? "bg-rose-50 text-rose-600" 
                                    : "bg-slate-100 text-slate-500"
                                }`}>
                                  {exam.status === "active" ? "Aktif" : exam.status === "closed" ? "Tutup" : "Draft"}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-slate-100/70 text-slate-500">
                                <div className="flex items-center gap-3">
                                  <span>{exam.questions.length} Soal</span>
                                  <span>•</span>
                                  <span>{exam.duration} Menit</span>
                                </div>

                                <div className="flex items-center gap-1.5 bg-indigo-50/75 px-2 py-0.5 rounded-lg border border-indigo-100 text-[10px]">
                                  <span className="font-bold text-indigo-400">Token:</span>
                                  <span className="font-mono font-black text-indigo-700 tracking-wider text-[11px]">
                                    {exam.token || "-"}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRegenerateToken(exam.id, exam.token);
                                    }}
                                    className="p-0.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100 rounded transition-colors"
                                    title="Ubah / Atur Token Proktor"
                                  >
                                    <Key className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 mt-2.5 pt-2 border-t border-dashed border-slate-100/50">
                                <button
                                  id={`btn-exam-history-${exam.id}`}
                                  onClick={() => setSelectedExamForHistory(exam)}
                                  className="py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1 border border-emerald-150 shadow-xs"
                                  title="Lihat Histori & Cetak PDF Siswa"
                                >
                                  <History className="w-3 h-3 text-emerald-600" />
                                  <span>Riwayat ({results.filter(r => r.examId === exam.id).length})</span>
                                </button>
                                <button
                                  id={`btn-manage-soal-${exam.id}`}
                                  onClick={() => setSelectedExamForQuestions(exam)}
                                  className="py-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-medium rounded-lg text-[11px] transition-all cursor-pointer"
                                >
                                  Kelola Soal
                                </button>
                                <button
                                  id={`btn-schedule-exam-${exam.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingExamSchedule(exam);
                                    setScheduleForm({
                                      scheduledDate: exam.scheduledDate || "",
                                      scheduledStartTime: exam.scheduledStartTime || "",
                                      scheduledEndTime: exam.scheduledEndTime || ""
                                    });
                                  }}
                                  className="py-1 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1 border border-amber-100 shadow-xs"
                                  title="Atur Jadwal Pelaksanaan Ujian"
                                >
                                  <Calendar className="w-3 h-3 text-amber-600" />
                                  <span>Jadwal</span>
                                </button>
                                <button
                                  id={`btn-status-toggle-${exam.id}`}
                                  onClick={() => handleToggleExamStatus(exam.id, exam.status, exam.title)}
                                  title="Ubah Status Rilis"
                                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  id={`btn-delete-exam-${exam.id}`}
                                  onClick={() => handleDeleteExam(exam)}
                                  className="p-1 text-rose-400 hover:text-rose-600 rounded-lg cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Questions Detail & Builder Workspace */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-7 space-y-5">
                      {!selectedExamForQuestions ? (
                        <div className="min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <BookOpen className="w-12 h-12 text-slate-300 mb-2" />
                          <h4 className="font-bold text-slate-600">Pilih Paket Ujian</h4>
                          <p className="text-xs text-slate-400 max-w-xs mt-1">Silakan klik tombol "Kelola Soal" di daftar sebelah kiri untuk menyunting pertanyaan dalam paket tersebut.</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Header of workspace */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                            <div>
                              <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Sedang Disunting:</div>
                              <h4 className="font-bold text-slate-800 text-base">{selectedExamForQuestions.title}</h4>
                            </div>

                            {/* CSV Bulk Section inside the exam builder */}
                            <div className="flex items-center gap-2">
                              <button
                                id="btn-download-csv-template"
                                onClick={handleDownloadCSVTemplate}
                                title="Download Template Excel/CSV"
                                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Template</span>
                              </button>
                              
                              <label
                                id="label-upload-csv"
                                className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>Unggah CSV Soal</span>
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  accept=".csv"
                                  onChange={handleUploadCSV}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>

                          {/* 1. Form to Add new Question */}
                          <form onSubmit={handleAddQuestion} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                            <h5 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                              <Plus className="w-3.5 h-3.5" />
                              Tambah Soal Baru
                            </h5>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pertanyaan (Teks)</label>
                              <textarea
                                id="question-text"
                                placeholder="Tuliskan pertanyaan soal di sini..."
                                value={newQuestion.text}
                                onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                rows={2}
                                required
                              />
                            </div>

                            {/* Media / Gambar Soal */}
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-3 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                  <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Media / Gambar Soal (Opsional)</span>
                                </label>
                                
                                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                                  <button
                                    type="button"
                                    onClick={() => setImgbbMethod("upload")}
                                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                      imgbbMethod === "upload"
                                        ? "bg-white text-slate-800 shadow-3xs"
                                        : "text-slate-500 hover:text-slate-700"
                                    }`}
                                  >
                                    Upload ImgBB
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setImgbbMethod("url")}
                                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                      imgbbMethod === "url"
                                        ? "bg-white text-slate-800 shadow-3xs"
                                        : "text-slate-500 hover:text-slate-700"
                                    }`}
                                  >
                                    Tautan URL
                                  </button>
                                </div>
                              </div>

                              {imgbbMethod === "url" ? (
                                <div>
                                  <input
                                    id="question-image"
                                    type="url"
                                    placeholder="Masukkan tautan gambar langsung (https://...)"
                                    value={newQuestion.imageUrl}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, imageUrl: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                  <p className="text-[9px] text-slate-400 mt-1 font-medium">Tempelkan URL langsung ke berkas gambar (seperti Unsplash, ImgBB, atau host lainnya).</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="space-y-2">
                                    {/* Drag and Drop Zone */}
                                    <div
                                      className="border border-dashed border-slate-200 hover:border-indigo-400 transition-colors bg-slate-50/50 rounded-xl p-5 text-center flex flex-col items-center justify-center cursor-pointer group"
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        const file = e.dataTransfer.files?.[0];
                                        if (file) {
                                          if (file.type.startsWith("image/")) {
                                            handleImgbbUpload(file);
                                          } else {
                                            setImgbbUploadError("Hanya file gambar yang didukung.");
                                          }
                                        }
                                      }}
                                      onClick={() => document.getElementById("imgbb-file-picker")?.click()}
                                    >
                                      <input
                                        id="imgbb-file-picker"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            handleImgbbUpload(file);
                                          }
                                        }}
                                      />
                                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 group-hover:scale-110 transition-transform mb-2" />
                                      <p className="text-[11px] font-bold text-slate-700">Pilih Berkas Gambar atau Seret ke Sini</p>
                                      <p className="text-[9px] text-slate-400 mt-1 font-medium">Gambar akan otomatis diunggah langsung dengan aman.</p>
                                    </div>

                                    {/* Uploading & Status */}
                                    {isImgbbUploading && (
                                      <div className="flex items-center justify-center gap-2 py-1.5 text-xs text-slate-600 font-medium">
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                        <span>Sedang mengunggah gambar ke penyimpanan awan...</span>
                                      </div>
                                    )}

                                    {imgbbUploadError && (
                                      <p className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-100 p-2 rounded-lg">{imgbbUploadError}</p>
                                    )}

                                    {imgbbUploadSuccess && (
                                      <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 p-2 rounded-lg">{imgbbUploadSuccess}</p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Perfect Image Preview Box with live checker and clear function */}
                              {newQuestion.imageUrl && (
                                <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                      <Eye className="w-3 h-3 text-emerald-500" />
                                      Pratinjau Tampilan Gambar
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNewQuestion(prev => ({ ...prev, imageUrl: "" }));
                                        setImgbbUploadSuccess(null);
                                      }}
                                      className="text-[10px] font-bold text-rose-500 hover:text-rose-700 flex items-center gap-0.5 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Hapus
                                    </button>
                                  </div>
                                  <div className="relative w-full rounded-lg overflow-hidden border border-slate-200 bg-white p-1 flex justify-center bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px]">
                                    <SafeImage
                                      src={newQuestion.imageUrl}
                                      alt="Pratinjau Soal"
                                      className="max-h-48 rounded-md object-contain"
                                      fallbackText="Gagal memuat pratinjau gambar"
                                    />
                                  </div>
                                  <div className="text-[9px] text-slate-400 break-all bg-white p-1.5 border border-slate-100 rounded-lg font-mono">
                                    URL: {newQuestion.imageUrl}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Poin Soal */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Poin Soal</label>
                              <input
                                id="question-points"
                                type="number"
                                value={newQuestion.points}
                                onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) || 10 })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Opsi Jawaban A</label>
                                <input
                                  id="opt-a"
                                  type="text"
                                  placeholder="Pilihan A..."
                                  value={newQuestion.optionA}
                                  onChange={(e) => setNewQuestion({ ...newQuestion, optionA: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Opsi Jawaban B</label>
                                <input
                                  id="opt-b"
                                  type="text"
                                  placeholder="Pilihan B..."
                                  value={newQuestion.optionB}
                                  onChange={(e) => setNewQuestion({ ...newQuestion, optionB: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Opsi Jawaban C</label>
                                <input
                                  id="opt-c"
                                  type="text"
                                  placeholder="Pilihan C..."
                                  value={newQuestion.optionC}
                                  onChange={(e) => setNewQuestion({ ...newQuestion, optionC: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Opsi Jawaban D</label>
                                <input
                                  id="opt-d"
                                  type="text"
                                  placeholder="Pilihan D..."
                                  value={newQuestion.optionD}
                                  onChange={(e) => setNewQuestion({ ...newQuestion, optionD: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Jawaban yang Benar</label>
                              <select
                                id="select-correct-answer"
                                value={newQuestion.correctAnswer}
                                onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value={0}>Pilihan A</option>
                                <option value={1}>Pilihan B</option>
                                <option value={2}>Pilihan C</option>
                                <option value={3}>Pilihan D</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pembahasan / Penjelasan Jawaban (Opsional)</label>
                              <textarea
                                id="question-explanation"
                                placeholder="Tulis penjelasan mengapa jawaban benar atau opsi lain salah untuk dipelajari siswa setelah pengerjaan..."
                                value={newQuestion.explanation}
                                onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                rows={2}
                              />
                            </div>

                            <button
                              id="btn-add-question-submit"
                              type="submit"
                              disabled={isImgbbUploading}
                              className={`w-full py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                isImgbbUploading
                                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                              }`}
                            >
                              {isImgbbUploading ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Sedang Mengunggah Gambar...</span>
                                </>
                              ) : (
                                "Simpan Soal ke Paket"
                              )}
                            </button>
                          </form>

                          {/* 2. Questions list in this exam */}
                          <div className="space-y-3">
                            <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                              Daftar Soal Sekarang ({selectedExamForQuestions.questions.length})
                            </h5>

                            {selectedExamForQuestions.questions.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-xl">Belum ada pertanyaan di dalam paket ujian ini.</p>
                            ) : (
                              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                {selectedExamForQuestions.questions.map((q, qidx) => (
                                  <div key={q.id} className="p-3 bg-white border border-slate-100 rounded-xl flex items-start gap-3">
                                    <span className="bg-slate-100 text-slate-700 w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0">{qidx + 1}</span>
                                    
                                    <div className="flex-1 space-y-1 text-xs">
                                      <p className="font-semibold text-slate-800">{q.text}</p>
                                      
                                      {q.imageUrl && (
                                        <div className="my-2 max-w-xs overflow-hidden">
                                          <SafeImage 
                                            src={q.imageUrl} 
                                            alt="Ilustrasi Soal" 
                                            className="max-h-28 max-w-full rounded-md object-contain"
                                            fallbackText="Gagal memuat gambar soal"
                                          />
                                        </div>
                                      )}

                                      <div className="grid grid-cols-2 gap-1.5 pt-1.5 text-[11px] text-slate-500">
                                        <div className={q.correctAnswer === 0 ? "text-indigo-600 font-semibold" : ""}>A. {q.options[0]}</div>
                                        <div className={q.correctAnswer === 1 ? "text-indigo-600 font-semibold" : ""}>B. {q.options[1]}</div>
                                        <div className={q.correctAnswer === 2 ? "text-indigo-600 font-semibold" : ""}>C. {q.options[2]}</div>
                                        <div className={q.correctAnswer === 3 ? "text-indigo-600 font-semibold" : ""}>D. {q.options[3]}</div>
                                      </div>

                                      <div className="text-[10px] text-slate-400 pt-2 flex items-center justify-between">
                                        <span>Nilai Poin: {q.points}</span>
                                        <button 
                                          id={`btn-delete-q-${q.id}`}
                                          onClick={() => handleDeleteQuestion(q.id)}
                                          className="text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
                                        >
                                          Hapus Soal
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* --- 3. STUDENTS LIST TAB --- */}
              {activeTab === "students" && (
                <div className="space-y-6">
                  {/* Action Bar for Student directory */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-150 flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        id="search-student-input"
                        type="text"
                        placeholder="Cari siswa berdasarkan nama, kelas, atau username..."
                        value={searchStudent}
                        onChange={(e) => setSearchStudent(e.target.value)}
                        className="bg-transparent border-none text-xs w-full focus:outline-none"
                      />
                    </div>

                    <button
                      id="btn-add-student-modal"
                      onClick={() => setShowAddStudent(true)}
                      className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-all flex items-center gap-2 self-start cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Tambah Akun Siswa Baru</span>
                    </button>
                  </div>

                  {/* Add Student Form Card */}
                  {showAddStudent && (
                    <div className="bg-white border border-indigo-150 rounded-2xl p-6 shadow-md shadow-indigo-50 animate-fadeIn max-w-xl mx-auto space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <UserPlus className="w-5 h-5 text-indigo-600" />
                          Form Akun Siswa Baru
                        </h4>
                        <button 
                          onClick={() => setShowAddStudent(false)}
                          className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
                        >
                          Tutup
                        </button>
                      </div>

                      <form onSubmit={handleAddStudent} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nama Lengkap Siswa</label>
                            <input
                              id="new-student-name"
                              type="text"
                              placeholder="Contoh: Budi Santoso"
                              value={newStudent.name}
                              onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Kelas</label>
                            <select
                              id="new-student-class"
                              value={newStudent.class}
                              onChange={(e) => setNewStudent({ ...newStudent, class: e.target.value })}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                              required
                            >
                              <option value="">-- Pilih Kelas --</option>
                              {displayClasses.map((sc) => (
                                <option key={sc.id} value={sc.name}>
                                  {sc.name}
                                </option>
                              ))}
                            </select>
                            {displayClasses.length === 0 && (
                              <p className="text-[10px] text-amber-600 font-semibold mt-1">
                                Warning: Kepala Sekolah belum menginput daftar kelas resmi untuk Anda!
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Username Login</label>
                            <input
                              id="new-student-username"
                              type="text"
                              placeholder="Contoh: budi (huruf kecil)"
                              value={newStudent.username}
                              onChange={(e) => setNewStudent({ ...newStudent, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Password</label>
                            <input
                              id="new-student-password"
                              type="text"
                              placeholder="Isi password (contoh: 123)"
                              value={newStudent.password}
                              onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                              required
                            />
                          </div>
                        </div>

                        <button
                          id="btn-save-new-student"
                          type="submit"
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-100"
                        >
                          Simpan & Daftarkan Siswa
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Student Directory Table Grid */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                      <h4 className="font-bold text-slate-800">Daftar Akun Siswa ({filteredStudents.length})</h4>
                      <span className="text-xs text-slate-400">Total terdaftar: {displayStudents.length} siswa</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                            <th className="py-4 px-6">Nama Siswa</th>
                            <th className="py-4 px-6">Username</th>
                            <th className="py-4 px-6">Kelas</th>
                            <th className="py-4 px-6">Password Akses</th>
                            <th className="py-4 px-6">Tanggal Dibuat</th>
                            <th className="py-4 px-6 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredStudents.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400">Tidak ada data siswa ditemukan.</td>
                            </tr>
                          ) : (
                            filteredStudents.map((student) => (
                              <tr key={student.id} className="hover:bg-slate-50/50">
                                <td className="py-4 px-6 font-semibold text-slate-800">{student.name}</td>
                                <td className="py-4 px-6 font-mono font-medium text-slate-500">{student.username}</td>
                                <td className="py-4 px-6">
                                  <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium">
                                    {student.class}
                                  </span>
                                </td>
                                <td className="py-4 px-6 font-mono font-medium text-indigo-600">{student.password || "123"}</td>
                                <td className="py-4 px-6 text-slate-400">
                                  {student.createdAt ? new Date(student.createdAt).toLocaleDateString("id-ID") : "-"}
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <button
                                    id={`btn-delete-student-${student.id}`}
                                    onClick={() => handleDeleteStudent(student.id)}
                                    className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg transition-all inline-block cursor-pointer"
                                    title="Hapus Akun"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* --- 3B. CLASSROOM MANAGEMENT TAB --- */}
              {activeTab === "classes" && (
                <ClassroomManagement
                  user={user}
                  students={displayStudents}
                  schoolClasses={displayClasses}
                  exams={exams}
                  classroomSessions={displaySessions}
                  onAssignStudentToClass={handleAssignStudentToClass}
                  onToggleExamClassAssignment={handleToggleExamClassAssignment}
                  onCreateSession={async (subject, className) => {
                    const matchedClass = displayClasses.find(c => c.name === className);
                    await linkTeacherToClassroomSession({
                      classId: matchedClass?.id || `class-${className}`,
                      className: className,
                      teacherId: user.id,
                      teacherName: user.name,
                      subject: subject,
                      schoolId: user.schoolId,
                      status: "active"
                    });
                  }}
                  onCompleteSession={(sessionId) => handleUpdateSessionStatus(sessionId, "completed")}
                  onDeleteSession={handleDeleteSession}
                />
              )}

              {/* --- 4. EXAM MONITOR & RESULTS TAB --- */}
              {activeTab === "results" && (
                <div className="space-y-6">
                  {/* Mode Selector for Results Tab */}
                  <div className="flex border-b border-slate-200">
                    <button
                      id="subtab-monitor"
                      onClick={() => setResultsSubTab("monitor")}
                      className={`px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        resultsSubTab === "monitor"
                          ? "border-indigo-600 text-indigo-600"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Pemantauan Real-Time (Live Progress)
                    </button>
                    <button
                      id="subtab-reports"
                      onClick={() => setResultsSubTab("reports")}
                      className={`px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        resultsSubTab === "reports"
                          ? "border-indigo-600 text-indigo-600"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Histori Laporan &amp; Ekspor Nilai
                    </button>
                  </div>

                  {resultsSubTab === "monitor" ? (
                    <RealTimeProgressMonitor
                      results={displayResults}
                      exams={exams}
                      schoolClasses={displayClasses}
                      onInspectResult={(res) => setSelectedResult(res)}
                    />
                  ) : (
                    <div className="space-y-6">
                      {/* Export Options & Filter Bar */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Filter Paket Ujian</label>
                            <select
                              id="result-exam-filter"
                              value={selectedResultExamFilter}
                              onChange={(e) => setSelectedResultExamFilter(e.target.value)}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-medium cursor-pointer"
                            >
                              <option value="all">Semua Ujian</option>
                              {exams.map(e => (
                                <option key={e.id} value={e.id}>{e.title}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Filter Kelas</label>
                            <select
                              id="result-class-filter"
                              value={selectedResultClassFilter}
                              onChange={(e) => setSelectedResultClassFilter(e.target.value)}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-medium cursor-pointer"
                            >
                              <option value="all">Semua Kelas</option>
                              {displayClasses.map(sc => (
                                <option key={sc.id} value={sc.name}>{sc.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Tanggal Mulai</label>
                            <input
                              type="date"
                              id="result-start-date"
                              value={selectedResultStartDate}
                              onChange={(e) => setSelectedResultStartDate(e.target.value)}
                              className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Tanggal Selesai</label>
                            <input
                              type="date"
                              id="result-end-date"
                              value={selectedResultEndDate}
                              onChange={(e) => setSelectedResultEndDate(e.target.value)}
                              className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-medium"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                          {(selectedResultExamFilter !== "all" || selectedResultClassFilter !== "all" || selectedResultStartDate || selectedResultEndDate) && (
                            <button
                              id="btn-clear-filters"
                              onClick={() => {
                                setSelectedResultExamFilter("all");
                                setSelectedResultClassFilter("all");
                                setSelectedResultStartDate("");
                                setSelectedResultEndDate("");
                              }}
                              className="py-2.5 px-3 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-semibold border border-slate-200 transition-all cursor-pointer"
                              title="Reset Filter"
                            >
                              Reset
                            </button>
                          )}

                          <button
                            id="btn-export-excel"
                            onClick={handleExportToExcel}
                            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>Ekspor Excel</span>
                          </button>

                          <button
                            id="btn-export-pdf"
                            onClick={handleExportToPDF}
                            className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Ekspor PDF</span>
                          </button>
                        </div>
                      </div>

                      {/* Active Takers Real-Time Section */}
                      {activeExamTakers.length > 0 && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                            <h4 className="font-bold text-emerald-800 text-sm">Pemantauan Aktivitas Aktif Sekarang ({activeExamTakers.length} Siswa)</h4>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeExamTakers.map((res) => (
                              <div key={res.id} className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs flex items-start gap-3">
                                <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl">
                                  <Activity className="w-4 h-4 animate-bounce" />
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div className="font-bold text-slate-800">{res.studentName}</div>
                                  <div className="text-[11px] text-slate-500">{res.studentClass} • {res.examTitle}</div>
                                  <div className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full inline-block font-semibold">
                                    Sedang Mengerjakan ({Math.floor(res.durationSpent / 60)}m berlalu)
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* General Submissions & History table */}
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                          <h4 className="font-bold text-slate-800">Semua Histori Pengerjaan &amp; Nilai</h4>
                          <span className="text-xs text-slate-400">Total riwayat: {filteredResults.length} pengerjaan</span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                                <th className="py-4 px-6">Nama Siswa</th>
                                <th className="py-4 px-6">Kelas</th>
                                <th className="py-4 px-6">Paket Ujian</th>
                                <th className="py-4 px-6">Status</th>
                                <th className="py-4 px-6">Skor</th>
                                <th className="py-4 px-6">Benar / Total</th>
                                <th className="py-4 px-6">Durasi Spent</th>
                                <th className="py-4 px-6">Tanggal Selesai</th>
                                <th className="py-4 px-6 text-center">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {filteredResults.length === 0 ? (
                                <tr>
                                  <td colSpan={9} className="py-8 text-center text-slate-400">Tidak ada histori pengerjaan.</td>
                                </tr>
                              ) : (
                                filteredResults.map((res) => (
                                  <tr key={res.id} className="hover:bg-slate-50/50">
                                    <td className="py-4 px-6 font-semibold text-slate-800">{res.studentName}</td>
                                    <td className="py-4 px-6">{res.studentClass}</td>
                                    <td className="py-4 px-6 font-medium text-slate-600">{res.examTitle}</td>
                                    <td className="py-4 px-6">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        res.status === "submitted" 
                                          ? "bg-indigo-50 text-indigo-600" 
                                          : "bg-emerald-50 text-emerald-600 animate-pulse"
                                      }`}>
                                        {res.status === "submitted" ? "Selesai" : "Ujian Berjalan"}
                                      </span>
                                    </td>
                                    <td className="py-4 px-6">
                                      {res.status === "submitted" ? (
                                        <span className={`text-sm font-bold ${res.score >= 70 ? "text-emerald-600" : "text-rose-500"}`}>
                                          {res.score}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 font-mono">-</span>
                                      )}
                                    </td>
                                    <td className="py-4 px-6 font-mono text-slate-500">
                                      {res.status === "submitted" ? `${res.correctCount} / ${res.totalQuestions}` : "-"}
                                    </td>
                                    <td className="py-4 px-6 font-mono text-slate-500">
                                      {Math.floor(res.durationSpent / 60)}m {res.durationSpent % 60}s
                                    </td>
                                    <td className="py-4 px-6 text-slate-400">
                                      {res.status === "submitted" ? new Date(res.submittedAt).toLocaleDateString("id-ID", {
                                        day: "numeric",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      }) : "-"}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          onClick={() => setSelectedResult(res)}
                                          disabled={res.status !== "submitted"}
                                          className={`p-1.5 rounded-lg transition-all ${
                                            res.status === "submitted"
                                              ? "hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 cursor-pointer"
                                              : "text-slate-300 bg-slate-50 cursor-not-allowed"
                                          }`}
                                          title={res.status === "submitted" ? "Lihat Detail Jawaban" : "Ujian sedang dikerjakan"}
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteResult(res.id)}
                                          className="p-1.5 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                                          title="Reset / Hapus Hasil Ujian"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {selectedResult && (
        <AttemptDetailModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}

      {examToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 p-6 shadow-xl space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-rose-50 text-rose-600">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-sm font-extrabold tracking-tight text-slate-800 uppercase">
                Hapus Paket Ujian?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apakah Anda yakin ingin menghapus paket ujian <span className="font-extrabold text-slate-700">"{examToDelete.title}"</span>? Tindakan ini akan menghapus seluruh daftar pertanyaan di dalamnya secara permanen dan tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExamToDelete(null)}
                className="flex-1 py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteExam}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-rose-200 cursor-pointer"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedExamForHistory && (
        <ExamHistoryModal
          exam={selectedExamForHistory}
          results={results}
          onClose={() => setSelectedExamForHistory(null)}
          onRerelease={(resId) => {
            handleDeleteResult(resId);
          }}
          onViewDetails={(res) => {
            setSelectedResult(res);
          }}
        />
      )}

      {editingExamSchedule && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold tracking-tight text-slate-800 uppercase flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600 animate-pulse" />
                Atur Jadwal Pelaksanaan Ujian
              </h3>
              <button 
                onClick={() => setEditingExamSchedule(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Atur jadwal pelaksanaan untuk paket ujian <span className="font-extrabold text-slate-700">"{editingExamSchedule.title}"</span> agar siswa mengetahui waktu pelaksanaan dan membatasi akses pengerjaan.
            </p>

            <form onSubmit={handleSaveSchedule} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tanggal Pelaksanaan</label>
                <input
                  type="date"
                  value={scheduleForm.scheduledDate}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={scheduleForm.scheduledStartTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledStartTime: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={scheduleForm.scheduledEndTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledEndTime: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setScheduleForm({ scheduledDate: "", scheduledStartTime: "", scheduledEndTime: "" });
                  }}
                  className="px-3 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs transition-all cursor-pointer"
                  title="Kosongkan jadwal agar ujian selalu aktif secara terbuka"
                >
                  Reset Jadwal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-md shadow-indigo-100"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
