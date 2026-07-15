import React, { useState, useEffect } from "react";
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  doc, 
  query, 
  where,
  deleteDoc
} from "../lib/firebase";
import { db } from "../lib/firebase";
import { School, Teacher, Principal } from "../types";
import { 
  LogOut, 
  School as SchoolIcon, 
  UserPlus, 
  Plus, 
  Search, 
  Building, 
  Users, 
  Lock, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Award,
  Trash2,
  Calendar,
  Clock,
  Edit,
  ShieldAlert,
  Sparkles,
  Check
} from "lucide-react";

interface SuperAdminDashboardProps {
  user: { role: "super_admin"; id: string; name: string };
  onLogout: () => void;
}

export function SubscriptionCountdown({ expiresAt, active }: { expiresAt?: string; active?: boolean }) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!active || !expiresAt) {
      setTimeLeft("Tidak Aktif");
      setIsExpired(true);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("Habis");
        setIsExpired(true);
        setIsExpiringSoon(false);
      } else {
        setIsExpired(false);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setIsExpiringSoon(days < 7);

        const parts: string[] = [];
        if (days > 0) parts.push(`${days}h`);
        if (hours > 0 || days > 0) parts.push(`${hours}j`);
        parts.push(`${minutes}m`);
        parts.push(`${seconds}d`);

        setTimeLeft(parts.join(" "));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, active]);

  if (!active || !expiresAt) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase">
        Non-Aktif
      </span>
    );
  }

  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 uppercase animate-pulse">
        ⚠️ Kedaluwarsa
      </span>
    );
  }

  if (isExpiringSoon) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase animate-pulse" title={`Berakhir pada: ${new Date(expiresAt).toLocaleString("id-ID")}`}>
        ⏳ Sisa {timeLeft}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase" title={`Berakhir pada: ${new Date(expiresAt).toLocaleString("id-ID")}`}>
      ✅ Sisa {timeLeft}
    </span>
  );
}

function formatDateToLocalInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function SuperAdminDashboard({ user, onLogout }: SuperAdminDashboardProps) {
  const [schools, setSchools] = useState<School[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"guru" | "sekolah">("guru");

  // Addon States
  const [subAddonCount, setSubAddonCount] = useState(0);
  const [subAddonExpiresAt, setSubAddonExpiresAt] = useState("");

  // School Form States
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [principalUsername, setPrincipalUsername] = useState("");
  const [principalPassword, setPrincipalPassword] = useState("123");
  const [schoolError, setSchoolError] = useState<string | null>(null);
  const [schoolSuccess, setSchoolSuccess] = useState<string | null>(null);

  // Teacher Form States
  const [teacherUsername, setTeacherUsername] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("123");
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [teacherSuccess, setTeacherSuccess] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Subscription Edit States
  const [editingSubSchool, setEditingSubSchool] = useState<School | null>(null);
  const [subPackage, setSubPackage] = useState<"1_bulan" | "3_bulan" | "1_tahun" | "free_trial" | "">("");
  const [subExpiresAt, setSubExpiresAt] = useState("");
  const [subActive, setSubActive] = useState(true);
  const [subSuspended, setSubSuspended] = useState(false);

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubSchool) return;

    try {
      const updatedSchoolDoc = {
        ...editingSubSchool,
        subscriptionPackage: subPackage || null,
        subscriptionActive: subActive,
        subscriptionExpiresAt: subPackage ? new Date(subExpiresAt).toISOString() : null,
        suspended: subSuspended,
        addonCount: Number(subAddonCount),
        addonExpiresAt: subAddonCount > 0 ? new Date(subAddonExpiresAt).toISOString() : null
      };

      await setDoc(doc(db, "schools", editingSubSchool.id), updatedSchoolDoc, { merge: true });
      alert(`Masa aktif langganan & status sekolah "${editingSubSchool.name}" berhasil diperbarui!`);
      setEditingSubSchool(null);
    } catch (err: any) {
      console.error(err);
      alert("Gagal memperbarui langganan sekolah.");
    }
  };

  const handleToggleSuspendDirect = async (school: School) => {
    const nextStatus = !school.suspended;
    const actionText = nextStatus ? "MENANGGUHKAN (SUSPEND)" : "MENGAKTIFKAN KEMBALI";
    const confirmed = window.confirm(`Apakah Anda yakin ingin ${actionText} sekolah "${school.name}"?`);
    if (!confirmed) return;

    try {
      await setDoc(doc(db, "schools", school.id), { suspended: nextStatus }, { merge: true });
      alert(`Sekolah "${school.name}" berhasil ${nextStatus ? "ditangguhkan" : "diaktifkan kembali"}!`);
    } catch (err: any) {
      console.error(err);
      alert("Gagal memperbarui status penangguhan sekolah.");
    }
  };

  const handleQuickSetSubscription = (months: number | '1m' | '5m') => {
    const now = new Date();
    if (months === '1m') {
      now.setMinutes(now.getMinutes() + 1);
    } else if (months === '5m') {
      now.setMinutes(now.getMinutes() + 5);
    } else {
      now.setMonth(now.getMonth() + (months as number));
    }
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setSubExpiresAt(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const startEditSubscription = (school: School) => {
    setEditingSubSchool(school);
    setSubPackage(school.subscriptionPackage || "1_bulan");
    setSubActive(school.subscriptionActive !== false); // default to true if undefined
    setSubSuspended(school.suspended === true);
    setSubAddonCount(school.addonCount || 0);
    
    let defaultExpiry = new Date();
    if (school.subscriptionExpiresAt) {
      defaultExpiry = new Date(school.subscriptionExpiresAt);
    } else {
      defaultExpiry.setMonth(defaultExpiry.getMonth() + 1);
    }
    setSubExpiresAt(formatDateToLocalInput(defaultExpiry));

    let defaultAddonExpiry = new Date();
    if (school.addonExpiresAt) {
      defaultAddonExpiry = new Date(school.addonExpiresAt);
    } else {
      defaultAddonExpiry.setMonth(defaultAddonExpiry.getMonth() + 1);
    }
    setSubAddonExpiresAt(formatDateToLocalInput(defaultAddonExpiry));
  };

  useEffect(() => {
    setLoading(true);
    let schoolsLoaded = false;
    let teachersLoaded = false;
    
    // Subscribe to Schools
    const unsubSchools = onSnapshot(collection(db, "schools"), (snap) => {
      const list: School[] = [];
      snap.forEach((doc) => {
        list.push({ ...doc.data(), id: doc.id } as School);
      });
      setSchools(list);
      schoolsLoaded = true;
      if (schoolsLoaded && teachersLoaded) {
        setLoading(false);
      }
    });

    // Subscribe to Teachers
    const unsubTeachers = onSnapshot(collection(db, "teachers"), (snap) => {
      const list: Teacher[] = [];
      snap.forEach((doc) => {
        list.push({ ...doc.data(), id: doc.id } as Teacher);
      });
      setTeachers(list);
      teachersLoaded = true;
      if (schoolsLoaded && teachersLoaded) {
        setLoading(false);
      }
    });

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 1200);

    return () => {
      unsubSchools();
      unsubTeachers();
      clearTimeout(timeout);
    };
  }, []);

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchoolError(null);
    setSchoolSuccess(null);

    const formattedId = schoolId.toUpperCase().trim().replace(/\s+/g, "-");
    const formattedPrincipalUsername = principalUsername.toLowerCase().trim().replace(/\s+/g, "");
    
    if (!formattedId || !schoolName.trim() || !principalName.trim() || !formattedPrincipalUsername) {
      setSchoolError("Harap isi semua bidang sekolah dan akun Kepala Sekolah.");
      return;
    }

    if (schools.some((s) => s.id === formattedId)) {
      setSchoolError(`ID Sekolah "${formattedId}" sudah digunakan.`);
      return;
    }

    const newSchool: School = {
      id: formattedId,
      name: schoolName.trim(),
      address: schoolAddress.trim(),
      createdAt: new Date().toISOString()
    };

    const newPrincipal = {
      id: formattedPrincipalUsername,
      username: formattedPrincipalUsername,
      name: principalName.trim(),
      password: principalPassword || "123",
      schoolId: formattedId,
      schoolName: schoolName.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      // Save School and Principal together
      await setDoc(doc(db, "schools", formattedId), newSchool);
      await setDoc(doc(db, "principals", formattedPrincipalUsername), newPrincipal);
      
      setSchoolSuccess(`Sekolah "${newSchool.name}" & Akun Kepala Sekolah "${newPrincipal.name}" berhasil ditambahkan!`);
      setSchoolId("");
      setSchoolName("");
      setSchoolAddress("");
      setPrincipalName("");
      setPrincipalUsername("");
      setPrincipalPassword("123");
    } catch (err: any) {
      console.error(err);
      setSchoolError("Gagal menyimpan sekolah dan akun kepala sekolah ke database.");
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError(null);
    setTeacherSuccess(null);

    const formattedUsername = teacherUsername.toLowerCase().trim().replace(/\s+/g, "");

    if (!formattedUsername || !teacherName.trim() || !selectedSchoolId) {
      setTeacherError("Harap isi semua bidang untuk pendaftaran Guru.");
      return;
    }

    if (teachers.some((t) => t.id === formattedUsername)) {
      setTeacherError(`Username Guru "${formattedUsername}" sudah terdaftar.`);
      return;
    }

    const schoolObj = schools.find((s) => s.id === selectedSchoolId);
    if (!schoolObj) {
      setTeacherError("Sekolah tidak ditemukan.");
      return;
    }

    const newTeacher: Teacher = {
      id: formattedUsername,
      username: formattedUsername,
      name: teacherName.trim(),
      password: teacherPassword || "123",
      schoolId: selectedSchoolId,
      schoolName: schoolObj.name,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "teachers", formattedUsername), newTeacher);
      setTeacherSuccess(`Guru "${newTeacher.name}" untuk sekolah "${schoolObj.name}" berhasil didaftarkan!`);
      setTeacherUsername("");
      setTeacherName("");
      setTeacherPassword("123");
    } catch (err: any) {
      console.error(err);
      setTeacherError("Gagal mendaftarkan Guru ke database.");
    }
  };

  const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus guru "${teacherName}" secara permanen?`)) {
      try {
        await deleteDoc(doc(db, "teachers", teacherId));
        alert(`Akun guru "${teacherName}" berhasil dihapus.`);
      } catch (err) {
        console.error(err);
        alert("Gagal menghapus akun guru.");
      }
    }
  };

  const handleDeleteSchool = async (schoolId: string, schoolName: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus sekolah "${schoolName}" (ID: ${schoolId}) secara permanen?`)) {
      try {
        await deleteDoc(doc(db, "schools", schoolId));
        alert(`Sekolah "${schoolName}" (ID: ${schoolId}) berhasil dihapus.`);
      } catch (err) {
        console.error(err);
        alert("Gagal menghapus sekolah.");
      }
    }
  };

  // Filtered teachers list based on search query
  const filteredTeachers = teachers.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.username.toLowerCase().includes(q) ||
      t.schoolName.toLowerCase().includes(q) ||
      t.schoolId.toLowerCase().includes(q)
    );
  });

  // Filtered schools list based on search query
  const filteredSchools = schools.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      (s.address && s.address.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-150 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
              <img 
                src="/logo.png" 
                alt="Eco Smart Exam Logo" 
                className="w-full h-full object-contain p-1"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="font-black text-slate-800 tracking-tight text-base sm:text-lg uppercase leading-none">
                Eco Smart Exam
              </h1>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider leading-none mt-1">
                Super Admin Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <div className="text-xs font-bold text-slate-800">{user.name}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Root Super Administrator</div>
            </div>
            <button
              id="btn-logout"
              onClick={onLogout}
              className="flex items-center gap-1.5 py-2 px-3.5 border border-rose-150 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
        {/* Top Info Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Selamat Datang di Panel Manajemen Pusat</h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Sebagai Super Admin, Anda berhak penuh untuk membuat identitas Sekolah baru serta mendaftarkan akun Guru (Tenant Administrator) yang akan mengelola instansi sekolah masing-masing secara independen.
            </p>
          </div>
          <div className="flex gap-4 shrink-0">
            <div className="bg-white/10 px-4 py-3 rounded-xl border border-white/10 text-center">
              <div className="text-2xl font-black">{schools.length}</div>
              <div className="text-[9px] uppercase tracking-wider text-slate-300 font-bold">Total Sekolah</div>
            </div>
            <div className="bg-white/10 px-4 py-3 rounded-xl border border-white/10 text-center">
              <div className="text-2xl font-black">{teachers.length}</div>
              <div className="text-[9px] uppercase tracking-wider text-slate-300 font-bold">Total Guru</div>
            </div>
          </div>
        </div>

        {/* Action Forms Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form 1: Create School */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">Registrasi Sekolah Baru</h3>
            </div>

            {schoolError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{schoolError}</span>
              </div>
            )}

            {schoolSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{schoolSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateSchool} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  ID / Kode Sekolah (Unique, No Spaces)
                </label>
                <input
                  id="input-school-id"
                  type="text"
                  placeholder="Contoh: SMAN1-JKT, SMK-MERDEKA"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nama Resmi Sekolah
                </label>
                <input
                  id="input-school-name"
                  type="text"
                  placeholder="Contoh: SMAN 1 Jakarta"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Alamat Sekolah
                </label>
                <textarea
                  id="input-school-address"
                  placeholder="Masukkan alamat lengkap sekolah..."
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
                />
              </div>

              {/* Akun Kepala Sekolah Section */}
              <div className="border-t border-slate-100 pt-4 mt-2 space-y-4">
                <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>Registrasi Akun Kepala Sekolah</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nama Lengkap Kepala Sekolah
                  </label>
                  <input
                    id="input-principal-name"
                    type="text"
                    placeholder="Contoh: Drs. H. Ahmad Fauzi"
                    value={principalName}
                    onChange={(e) => setPrincipalName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Username Login
                    </label>
                    <input
                      id="input-principal-username"
                      type="text"
                      placeholder="Contoh: kepala"
                      value={principalUsername}
                      onChange={(e) => setPrincipalUsername(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Password Login
                    </label>
                    <input
                      id="input-principal-password"
                      type="password"
                      placeholder="Masukkan password"
                      value={principalPassword}
                      onChange={(e) => setPrincipalPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                id="btn-submit-school"
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Simpan Sekolah Baru
              </button>
            </form>
          </div>

          {/* Form 2: Create Teacher */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                <UserPlus className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">Registrasi Akun Guru Baru</h3>
            </div>

            {teacherError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{teacherError}</span>
              </div>
            )}

            {teacherSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{teacherSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateTeacher} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Afiliasi Sekolah (Pilih Sekolah)
                </label>
                <select
                  id="select-school-for-teacher"
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Pilih Sekolah --</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nama Lengkap Guru
                  </label>
                  <input
                    id="input-teacher-name"
                    type="text"
                    placeholder="Contoh: Dra. Sri Wahyuni"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Username Login (Unique)
                  </label>
                  <input
                    id="input-teacher-username"
                    type="text"
                    placeholder="Contoh: sri.wahyuni"
                    value={teacherUsername}
                    onChange={(e) => setTeacherUsername(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Password Login
                </label>
                <div className="relative">
                  <input
                    id="input-teacher-password"
                    type="text"
                    placeholder="Default: 123"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                    required
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <button
                id="btn-submit-teacher"
                type="submit"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Daftarkan Guru Baru
              </button>
            </form>
          </div>
        </div>

        {/* Schools & Teachers List */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                id="tab-view-guru"
                type="button"
                onClick={() => {
                  setActiveTab("guru");
                  setSearchQuery("");
                }}
                className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "guru"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Daftar Guru ({teachers.length})</span>
              </button>
              <button
                id="tab-view-sekolah"
                type="button"
                onClick={() => {
                  setActiveTab("sekolah");
                  setSearchQuery("");
                }}
                className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "sekolah"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <SchoolIcon className="w-4 h-4" />
                <span>Daftar Sekolah ({schools.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-150 w-full md:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                id="search-input"
                type="text"
                placeholder={activeTab === "guru" ? "Cari guru, username, sekolah..." : "Cari nama, ID, alamat..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-xs w-full focus:outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Memuat data...</div>
          ) : activeTab === "guru" ? (
            filteredTeachers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">Belum ada akun guru terdaftar atau hasil pencarian tidak cocok.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Nama Lengkap</th>
                      <th className="py-3 px-4">Username Login</th>
                      <th className="py-3 px-4">Sekolah</th>
                      <th className="py-3 px-4">ID Sekolah</th>
                      <th className="py-3 px-4">Dibuat Pada</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredTeachers.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">{t.name}</td>
                        <td className="py-3 px-4 font-mono">{t.username}</td>
                        <td className="py-3 px-4">{t.schoolName}</td>
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">{t.schoolId}</td>
                        <td className="py-3 px-4 text-slate-400">
                          {t.createdAt ? new Date(t.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            id={`btn-delete-teacher-${t.id}`}
                            onClick={() => handleDeleteTeacher(t.id, t.name)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center"
                            title="Hapus Guru"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            filteredSchools.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">Belum ada sekolah terdaftar atau hasil pencarian tidak cocok.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">ID / Kode Sekolah</th>
                      <th className="py-3 px-4">Nama Sekolah</th>
                      <th className="py-3 px-4">Paket</th>
                      <th className="py-3 px-4">Hitung Mundur</th>
                      <th className="py-3 px-4">Dibuat Pada</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredSchools.map((s) => (
                      <tr key={s.id} className={`hover:bg-slate-50/50 transition-colors ${s.suspended ? "bg-rose-50/30" : ""}`}>
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                          {s.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${s.suspended ? "text-slate-400 line-through" : "text-slate-800"}`}>
                              {s.name}
                            </span>
                            {s.suspended && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white uppercase animate-pulse">
                                🚫 Suspended
                              </span>
                            )}
                            {s.addonCount && s.addonCount > 0 ? (
                              (() => {
                                const isAddonExpired = s.addonExpiresAt && new Date(s.addonExpiresAt).getTime() < Date.now();
                                return isAddonExpired ? (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 uppercase border border-amber-200" title={`Kedaluwarsa pada: ${new Date(s.addonExpiresAt).toLocaleString()}`}>
                                    ⚠️ Addon (+{s.addonCount * 150} User) Expired
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-800 uppercase border border-indigo-200" title={`Aktif hingga: ${new Date(s.addonExpiresAt).toLocaleString()}`}>
                                    ⚡ Addon (+{s.addonCount * 150} User) Aktif
                                  </span>
                                );
                              })()
                            ) : null}
                          </div>
                          {s.address && <div className="text-[10px] text-slate-400 max-w-xs truncate">{s.address}</div>}
                        </td>
                        <td className="py-3 px-4">
                          {s.subscriptionPackage ? (
                            <span className={`capitalize font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 ${s.suspended ? "opacity-50" : ""}`}>
                              {s.subscriptionPackage.replace("_", " ")}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium italic">Belum Set</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {s.suspended ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-600 border border-rose-200 uppercase">
                              ⚠️ Ditangguhkan
                            </span>
                          ) : (
                            <SubscriptionCountdown expiresAt={s.subscriptionExpiresAt} active={s.subscriptionActive} />
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            id={`btn-edit-sub-${s.id}`}
                            onClick={() => startEditSubscription(s)}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center mr-1.5"
                            title="Kelola Langganan"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            id={`btn-toggle-suspend-${s.id}`}
                            onClick={() => handleToggleSuspendDirect(s)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center mr-1.5 ${
                              s.suspended
                                ? "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                                : "text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                            }`}
                            title={s.suspended ? "Aktifkan Kembali" : "Tangguhkan Sekolah (Suspend)"}
                          >
                            {s.suspended ? <Check className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            id={`btn-delete-school-${s.id}`}
                            onClick={() => handleDeleteSchool(s.id, s.name)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center"
                            title="Hapus ID Sekolah"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </main>

      {/* Subscription Management Modal */}
      {editingSubSchool && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">Kelola Langganan</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{editingSubSchool.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSubSchool(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSubscription} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Paket Langganan
                </label>
                <select
                  value={subPackage}
                  onChange={(e) => setSubPackage(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Tanpa Paket / Non-Aktif --</option>
                  <option value="1_bulan">Paket Perunggu (1 Bulan)</option>
                  <option value="3_bulan">Paket Perak (3 Bulan)</option>
                  <option value="1_tahun">Paket Emas (1 Tahun)</option>
                  <option value="free_trial">Free Trial (Uji Coba)</option>
                </select>
              </div>

              {/* Suspend Toggle inside Modal */}
              <div className="flex items-center justify-between p-3.5 bg-rose-50/50 rounded-xl border border-rose-100/50">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-rose-800 font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Tangguhkan (Suspend) Sekolah?
                  </span>
                  <span className="text-[10px] text-rose-600 font-medium">Blokir login & portal seluruh siswa/guru/kepsek</span>
                </div>
                <input
                  type="checkbox"
                  checked={subSuspended}
                  onChange={(e) => setSubSuspended(e.target.checked)}
                  className="w-4 h-4 text-rose-600 border-rose-300 rounded focus:ring-rose-500 cursor-pointer"
                />
              </div>

              {subPackage && (
                <>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-150">
                    <span className="text-xs text-slate-600 font-medium">Status Langganan Aktif?</span>
                    <input
                      type="checkbox"
                      checked={subActive}
                      onChange={(e) => setSubActive(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Masa Berlaku Berakhir Pada
                    </label>
                    <input
                      type="datetime-local"
                      value={subExpiresAt}
                      onChange={(e) => setSubExpiresAt(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Setel Cepat (Mulai Sekarang):</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickSetSubscription(1)}
                        className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all"
                      >
                        +1 Bulan
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickSetSubscription(3)}
                        className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all"
                      >
                        +3 Bulan
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickSetSubscription(12)}
                        className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all"
                      >
                        +1 Tahun
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleQuickSetSubscription('1m')}
                        className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg text-[10px] font-bold transition-all"
                        title="Untuk Demo & Testing Hitung Mundur Cepat"
                      >
                        ⏱️ Demo +1 Menit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickSetSubscription('5m')}
                        className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg text-[10px] font-bold transition-all"
                        title="Untuk Demo & Testing Hitung Mundur Cepat"
                      >
                        ⏱️ Demo +5 Menit
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Fitur Addon Kuota Pengguna (+150 User) */}
              <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100/50 space-y-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-indigo-800 font-bold flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5" /> Addon Kuota Pengguna (+150 User)
                  </span>
                  <span className="text-[10px] text-indigo-600 font-medium font-mono">Rp 15.000 / paket 150 user per bulan</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Jumlah Paket Addon
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={subAddonCount}
                      onChange={(e) => setSubAddonCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Kapasitas Tambahan
                    </label>
                    <div className="px-3 py-1.5 bg-indigo-100/50 border border-indigo-100 rounded-lg text-xs font-black text-indigo-700">
                      +{subAddonCount * 150} User
                    </div>
                  </div>
                </div>

                {subAddonCount > 0 && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Masa Berlaku Addon Habis Pada
                    </label>
                    <input
                      type="datetime-local"
                      value={subAddonExpiresAt}
                      onChange={(e) => setSubAddonExpiresAt(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                    <div className="flex gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          now.setMinutes(now.getMinutes() + 1);
                          setSubAddonExpiresAt(formatDateToLocalInput(now));
                        }}
                        className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-[9px] font-bold transition-all"
                      >
                        ⏱️ Demo +1 Mnt
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          now.setMonth(now.getMonth() + 1);
                          setSubAddonExpiresAt(formatDateToLocalInput(now));
                        }}
                        className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-[9px] font-bold transition-all"
                      >
                        +1 Bulan Addon
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSubSchool(null)}
                  className="flex-1 py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
