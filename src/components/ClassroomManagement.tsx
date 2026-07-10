import React, { useState } from "react";
import { 
  Student, 
  SchoolClass, 
  Exam, 
  ClassroomSession 
} from "../types";
import { 
  Users, 
  Plus, 
  BookOpen, 
  Activity, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  UserPlus, 
  ChevronRight, 
  TrendingUp, 
  ShieldCheck, 
  FileText 
} from "lucide-react";

interface ClassroomManagementProps {
  user: {
    id: string;
    name: string;
    schoolId: string;
    schoolName: string;
  };
  students: Student[];
  schoolClasses: SchoolClass[];
  exams: Exam[];
  classroomSessions: ClassroomSession[];
  onAssignStudentToClass: (studentId: string, className: string) => Promise<void>;
  onToggleExamClassAssignment: (examId: string, className: string) => Promise<void>;
  onCreateSession: (subject: string, className: string) => Promise<void>;
  onCompleteSession: (sessionId: string) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
}

export default function ClassroomManagement({
  user,
  students,
  schoolClasses,
  exams,
  classroomSessions,
  onAssignStudentToClass,
  onToggleExamClassAssignment,
  onCreateSession,
  onCompleteSession,
  onDeleteSession
}: ClassroomManagementProps) {
  const [selectedClass, setSelectedClass] = useState<string>("");
  
  // States for adding student by ID
  const [studentIdInput, setStudentIdInput] = useState("");
  const [addStudentError, setAddStudentError] = useState<string | null>(null);
  const [addStudentSuccess, setAddStudentSuccess] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // States for session creation
  const [sessionSubject, setSessionSubject] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // States for searches & filters
  const [classSearch, setClassSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  // Handler: Add Student to Selected Class via ID / Username
  const handleAddStudentById = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddStudentError(null);
    setAddStudentSuccess(null);

    const cleanId = studentIdInput.trim().toLowerCase();
    if (!cleanId) {
      setAddStudentError("Harap masukkan ID atau Username siswa!");
      return;
    }

    if (!selectedClass) {
      setAddStudentError("Harap pilih kelas target terlebih dahulu di sebelah kiri!");
      return;
    }

    // Find if student exists in the school list
    const foundStudent = students.find(s => s.id === cleanId || s.username === cleanId);
    if (!foundStudent) {
      setAddStudentError(`Siswa dengan ID/Username "${cleanId}" tidak ditemukan di database sekolah.`);
      return;
    }

    // Check if student is already in the selected class
    if (foundStudent.class === selectedClass) {
      setAddStudentError(`Siswa "${foundStudent.name}" sudah tergabung dalam kelas ${selectedClass}.`);
      return;
    }

    setIsAssigning(true);
    try {
      await onAssignStudentToClass(foundStudent.id, selectedClass);
      setAddStudentSuccess(`Berhasil memindahkan siswa "${foundStudent.name}" ke kelas ${selectedClass}!`);
      setStudentIdInput("");
    } catch (err) {
      console.error(err);
      setAddStudentError("Gagal menambahkan siswa ke kelas. Silakan coba lagi.");
    } finally {
      setIsAssigning(false);
    }
  };

  // Handler: Start New Classroom Session
  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !sessionSubject.trim()) {
      alert("Pilih kelas dan isi mata pelajaran!");
      return;
    }

    setIsCreatingSession(true);
    try {
      await onCreateSession(sessionSubject.trim(), selectedClass);
      setSessionSubject("");
    } catch (err) {
      console.error(err);
      alert("Gagal memulai sesi mengajar.");
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Filtered classes based on search
  const filteredClasses = schoolClasses.filter(sc => 
    sc.name.toLowerCase().includes(classSearch.toLowerCase())
  );

  // Get active selected class data
  const activeClassData = schoolClasses.find(c => c.name === selectedClass);
  const activeClassStudents = students.filter(s => s.class === selectedClass);
  
  // Filter active class students based on search
  const filteredClassStudents = activeClassStudents.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.username.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Summary statistics across all classes
  const totalAssignedStudents = students.filter(s => s.class && s.class !== "unassigned").length;
  const totalUnassignedStudents = students.filter(s => !s.class || s.class === "unassigned").length;

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. Header Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Kelas Resmi</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{schoolClasses.length}</div>
          </div>
          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Siswa Terdistribusi</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{totalAssignedStudents}</div>
          </div>
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Siswa Belum Ada Kelas</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{totalUnassignedStudents}</div>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sesi Mengajar Aktif</div>
            <div className="text-2xl font-black text-indigo-600 mt-1">
              {classroomSessions.filter(cs => cs.status === "active").length}
            </div>
          </div>
          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
        </div>
      </div>

      {/* 2. Main Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: School Classes Directory */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-4 space-y-4">
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">Daftar Kelas Resmi</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Pilih kelas di bawah untuk mengelola siswa, penugasan ujian, dan tautan sesi mengajar.</p>
          </div>

          {/* Quick Class Search */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              id="search-class-sidebar"
              type="text"
              placeholder="Cari kelas..."
              value={classSearch}
              onChange={(e) => setClassSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {schoolClasses.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-150 rounded-xl text-xs">
              Belum ada kelas resmi diinput oleh Kepala Sekolah.
            </div>
          ) : (
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {filteredClasses.map((sc) => {
                const classStudentsCount = students.filter(s => s.class === sc.name).length;
                const activeSessions = classroomSessions.filter(cs => cs.className === sc.name && cs.status === "active");
                const isSelected = selectedClass === sc.name;

                return (
                  <button
                    key={sc.id}
                    onClick={() => {
                      setSelectedClass(sc.name);
                      setAddStudentError(null);
                      setAddStudentSuccess(null);
                    }}
                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                        : "bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100/80 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs sm:text-sm">{sc.name}</div>
                      <div className={`text-[10px] mt-0.5 font-semibold ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                        {classStudentsCount} Siswa Terdaftar
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeSessions.length > 0 && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" title="Ada Sesi Aktif"></span>
                        </span>
                      )}
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isSelected ? "bg-indigo-800 text-indigo-50" : "bg-slate-200 text-slate-500"
                      }`}>
                        Kelola
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Workspace */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedClass ? (
            <div className="bg-white min-h-[400px] flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-slate-100 shadow-xs">
              <BookOpen className="w-16 h-16 text-slate-200 mb-4" />
              <h4 className="font-extrabold text-slate-700 text-base">Silakan Pilih Kelas</h4>
              <p className="text-xs text-slate-400 max-w-sm mt-1">Pilih salah satu kelas resmi di sebelah kiri untuk menginput siswa via ID, mendistribusikan ujian, dan menautkan sesi mengajar Anda.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Workspace Title Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider leading-none">Manajemen Kelas Aktif</div>
                  <h3 className="text-xl font-black text-slate-800 mt-1">{selectedClass}</h3>
                </div>
                <span className="text-xs bg-indigo-50 text-indigo-600 px-3.5 py-1.5 rounded-xl font-bold">
                  {activeClassStudents.length} Siswa Terdaftar
                </span>
              </div>

              {/* 3. ADD STUDENT VIA ID / USERNAME */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-indigo-600" />
                    Tambah / Pindahkan Siswa via ID (Username)
                  </h4>
                  <p className="text-xs text-slate-400">Masukkan ID/Username siswa untuk segera menempatkannya ke dalam kelas {selectedClass}.</p>
                </div>

                {addStudentError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{addStudentError}</span>
                  </div>
                )}

                {addStudentSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex items-center gap-2 font-semibold">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{addStudentSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleAddStudentById} className="flex flex-col sm:flex-row gap-3">
                  <input
                    id="input-add-student-by-id"
                    type="text"
                    placeholder="Masukkan ID / Username Siswa (contoh: budi_prasetyo)"
                    value={studentIdInput}
                    onChange={(e) => setStudentIdInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono"
                    required
                  />
                  <button
                    id="btn-add-student-by-id-submit"
                    type="submit"
                    disabled={isAssigning}
                    className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {isAssigning ? "Menyimpan..." : "Tambahkan ke Kelas"}
                  </button>
                </form>
                
                {/* Suggestions or Unassigned Quick List */}
                {totalUnassignedStudents > 0 && (
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100/70 text-[11px] text-slate-600">
                    <span className="font-bold text-amber-800">Petunjuk:</span> Ada {totalUnassignedStudents} siswa yang belum memiliki kelas. Anda bisa mengetik ID/Username mereka atau menyalin dari menu Siswa untuk dipindahkan ke kelas ini.
                  </div>
                )}
              </div>

              {/* 4. ASSIGN EXAMS TO THIS CLASS */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Rilis / Bagikan Paket Soal Ujian
                  </h4>
                  <p className="text-xs text-slate-400">Centang paket ujian yang ingin Anda tampilkan dan aktifkan khusus untuk siswa di kelas {selectedClass}.</p>
                </div>

                {exams.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">Belum ada paket ujian yang dibuat di Bank Soal.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {exams.map((exam) => {
                      const isAssigned = (exam.classes || []).includes(selectedClass);
                      const isDraft = exam.status === "draft";

                      return (
                        <div
                          key={exam.id}
                          className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                            isAssigned
                              ? "bg-indigo-50/60 border-indigo-200"
                              : "bg-slate-50 border-slate-150 hover:bg-slate-100/50"
                          }`}
                        >
                          <input
                            id={`assign-exam-class-${exam.id}`}
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => onToggleExamClassAssignment(exam.id, selectedClass)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate" title={exam.title}>
                              {exam.title}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                              Durasi: {exam.duration} menit | {exam.questions.length} soal
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                exam.status === "active"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isDraft
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}>
                                {exam.status === "active" ? "Aktif" : isDraft ? "Draf" : "Ditutup"}
                              </span>
                              {isAssigned && (
                                <span className="text-[8px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                                  Dirilis Ke Kelas
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 5. ACTIVE CLASSROOM SESSIONS */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    Sesi Pembelajaran Aktif (Classroom Session)
                  </h4>
                  <p className="text-xs text-slate-400">Mulailah sesi mengajar interaktif Anda agar siswa mengetahui mata pelajaran dan bimbingan yang sedang berlangsung.</p>
                </div>

                {/* Create Session Form */}
                <form onSubmit={handleStartSession} className="flex gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                  <input
                    id="new-classroom-session-subject"
                    type="text"
                    placeholder="Masukkan Mata Pelajaran yang diampu (misal: Bahasa Indonesia)..."
                    value={sessionSubject}
                    onChange={(e) => setSessionSubject(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                  <button
                    id="btn-classroom-session-submit"
                    type="submit"
                    disabled={isCreatingSession}
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isCreatingSession ? "Menautkan..." : "Mulai Sesi Mengajar"}
                  </button>
                </form>

                {/* Historical sessions listing */}
                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Histori Sesi di Kelas Ini</h5>
                  {classroomSessions.filter(cs => cs.className === selectedClass).length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">Belum ada sesi mengajar Anda yang ditautkan di kelas ini.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {classroomSessions
                        .filter(cs => cs.className === selectedClass)
                        .map((session) => {
                          const isActive = session.status === "active";

                          return (
                            <div
                              key={session.id}
                              className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                                isActive
                                  ? "bg-emerald-50/50 border-emerald-200"
                                  : "bg-slate-50 border-slate-150"
                              }`}
                            >
                              <div>
                                <div className="font-bold text-slate-800">{session.subject}</div>
                                <div className="text-[10px] text-slate-400 font-medium">
                                  Oleh: {session.teacherName} | Mulai: {new Date(session.createdAt).toLocaleTimeString("id-ID")} WIB
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                    isActive ? "bg-emerald-100 text-emerald-800 animate-pulse" : "bg-slate-200 text-slate-600"
                                  }`}>
                                    {isActive ? "Sesi Aktif" : "Selesai"}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {isActive && session.teacherId === user.id && (
                                  <button
                                    id={`btn-complete-session-man-${session.id}`}
                                    onClick={() => onCompleteSession(session.id)}
                                    className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                                  >
                                    Selesaikan
                                  </button>
                                )}
                                <button
                                  id={`btn-delete-session-man-${session.id}`}
                                  onClick={() => onDeleteSession(session.id)}
                                  className="p-1 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded transition-all cursor-pointer"
                                  title="Hapus Sesi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

              {/* 6. STUDENTS DIRECTORY AND QUICK MOVE */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      Anggota Kelas Resmi
                    </h4>
                    <p className="text-xs text-slate-400">Daftar siswa yang saat ini terdaftar di kelas {selectedClass}.</p>
                  </div>

                  {/* Filter for students inside this class */}
                  <div className="relative w-full sm:w-48">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Search className="w-3 h-3" />
                    </span>
                    <input
                      id="search-active-class-students"
                      type="text"
                      placeholder="Cari siswa..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-[9px] font-bold tracking-wider">
                        <th className="py-3 px-4">Nama Lengkap</th>
                        <th className="py-3 px-4">ID / Username</th>
                        <th className="py-3 px-4">Pindahkan Kelas</th>
                        <th className="py-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredClassStudents.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                            Belum ada siswa di kelas ini yang cocok dengan pencarian Anda.
                          </td>
                        </tr>
                      ) : (
                        filteredClassStudents.map((student) => (
                          <tr key={student.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-800">{student.name}</td>
                            <td className="py-3 px-4 font-mono text-slate-500">{student.username}</td>
                            <td className="py-3 px-4">
                              <select
                                id={`move-student-${student.id}`}
                                defaultValue={selectedClass}
                                onChange={(e) => onAssignStudentToClass(student.id, e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-700 cursor-pointer focus:ring-1 focus:ring-indigo-500"
                              >
                                {schoolClasses.map(sc => (
                                  <option key={sc.id} value={sc.name}>{sc.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                id={`btn-remove-student-${student.id}`}
                                onClick={() => onAssignStudentToClass(student.id, "unassigned")}
                                className="text-[10px] font-bold text-rose-500 hover:text-rose-700 transition-all cursor-pointer"
                                title="Keluarkan dari kelas (Set unassigned)"
                              >
                                Keluarkan
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
        </div>

      </div>

    </div>
  );
}
