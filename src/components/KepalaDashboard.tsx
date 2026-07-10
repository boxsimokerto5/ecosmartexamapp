import React, { useState, useEffect } from "react";
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  doc, 
  query, 
  where,
  deleteDoc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { SchoolClass, Teacher, Student, School } from "../types";
import { useUserQuota } from "../hooks/useUserQuota";
import { 
  LogOut, 
  School as SchoolIcon, 
  Plus, 
  Search, 
  Users, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Award,
  BookOpen,
  UserCheck,
  ChevronRight,
  TrendingUp,
  Key,
  Clock,
  MessageSquare,
  Calendar,
  Sparkles,
  ShieldAlert,
  UserPlus
} from "lucide-react";

interface KepalaDashboardProps {
  user: {
    role: "kepala_sekolah";
    id: string;
    name: string;
    schoolId?: string;
    schoolName?: string;
  };
  onLogout: () => void;
}

export function KepalaQuotaAlert({ school, teachersCount, studentsCount }: { school: School | null; teachersCount: number; studentsCount: number }) {
  const quota = useUserQuota(school, teachersCount, studentsCount);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!quota.addonExpiresAt || quota.isAddonExpired) {
      setTimeLeft("");
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const expiry = new Date(quota.addonExpiresAt!).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const parts: string[] = [];
        if (days > 0) parts.push(`${days} Hari`);
        if (hours > 0 || days > 0) parts.push(`${hours} Jam`);
        parts.push(`${minutes} Menit`);
        parts.push(`${seconds} Detik`);
        setTimeLeft(parts.join(" "));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [quota.addonExpiresAt, quota.isAddonExpired]);

  const schoolNameEncoded = encodeURIComponent(school?.name || "Sekolah Kami");
  const schoolIdEncoded = encodeURIComponent(school?.id || "ID-SEKOLAH");
  const waUrl = `https://wa.me/6285755735676?text=Halo%20SmartUjian,%20saya%20Kepala%20Sekolah%20*${schoolNameEncoded}*%20(ID:%20*${schoolIdEncoded}*)%20ingin%20membeli/memperpanjang%20add-on%20kapasitas%20user.`;

  // Case 1: Limit fully reached or exceeded
  if (quota.isLimitReached) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn">
        <div className="flex items-start gap-3">
          <div className="bg-rose-100 p-2.5 rounded-xl text-rose-600 mt-0.5 shrink-0">
            <ShieldAlert className="w-5 h-5 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-rose-800 text-sm">BATAS KUOTA PENGGUNA TERCAPAI ({quota.totalUsers}/{quota.totalCapacity})</h4>
            <p className="text-xs text-rose-700 leading-relaxed">
              Sekolah Anda telah mencapai atau melebihi kapasitas maksimal pengguna ({quota.totalCapacity} user). {quota.isAddonExpired ? "Paket Addon Anda telah kedaluwarsa." : ""} Pengguna baru (Siswa/Guru ke-201+) akan dinonaktifkan sementara dan tidak dapat login ke portal. Silakan tambah atau perpanjang paket addon kapasitas.
            </p>
          </div>
        </div>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-200 shrink-0 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 fill-white/10" />
          <span>Beli Addon (+150 User / Rp15rb)</span>
        </a>
      </div>
    );
  }

  // Case 2: Nearing limit warning (>= 90% full)
  if (quota.isNearingLimit) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn">
        <div className="flex items-start gap-3">
          <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600 mt-0.5 shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-amber-800 text-sm">PERINGATAN: KUOTA PENGGUNA HAMPIR PENUH ({quota.totalUsers}/{quota.totalCapacity})</h4>
            <p className="text-xs text-amber-700 leading-relaxed">
              Kapasitas pengguna sekolah Anda telah terisi <span className="font-extrabold underline">{quota.quotaPercentage}%</span> ({quota.totalUsers} dari {quota.totalCapacity} kapasitas user). Silakan persiapkan pembelian addon tambahan demi kelancaran akses seluruh siswa.
            </p>
          </div>
        </div>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-200 shrink-0 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 fill-white/10" />
          <span>Beli Addon (+150 User)</span>
        </a>
      </div>
    );
  }

  // Case 3: Active Addon with live Countdown Timer
  if (quota.hasAddon && !quota.isAddonExpired && timeLeft) {
    return (
      <div className="bg-indigo-50 border border-indigo-250 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-indigo-800 animate-fadeIn">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-extrabold block uppercase tracking-wider">
              Paket Addon Aktif (+{quota.addonCapacity} Kapasitas User)
            </span>
            <span className="text-[11px] text-indigo-600 font-medium block">
              Kapasitas Total: {quota.totalCapacity} User (Sisa Waktu Addon: <span className="font-black text-indigo-800">{timeLeft}</span>)
            </span>
          </div>
        </div>
        <div className="text-[10px] text-indigo-600 font-bold bg-indigo-100/50 px-2.5 py-1 rounded-lg border border-indigo-200/30 self-start sm:self-center font-mono">
          EXPIRES: {new Date(quota.addonExpiresAt!).toLocaleString("id-ID")}
        </div>
      </div>
    );
  }

  return null;
}

export function KepalaSubscriptionAlert({ school }: { school: School | null }) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [daysLeft, setDaysLeft] = useState<number>(999);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!school) return;
    if (!school.subscriptionActive || !school.subscriptionExpiresAt) {
      setIsExpired(true);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(school.subscriptionExpiresAt!).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("Masa Aktif Berakhir");
        setDaysLeft(0);
        setIsExpired(true);
      } else {
        setIsExpired(false);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setDaysLeft(days);

        const parts: string[] = [];
        if (days > 0) parts.push(`${days} Hari`);
        if (hours > 0 || days > 0) parts.push(`${hours} Jam`);
        parts.push(`${minutes} Menit`);
        parts.push(`${seconds} Detik`);

        setTimeLeft(parts.join(" "));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [school]);

  if (!school) return null;

  const schoolNameEncoded = encodeURIComponent(school.name || "Sekolah Kami");
  const schoolIdEncoded = encodeURIComponent(school.id || "ID-SEKOLAH");
  const waUrl = `https://wa.me/6285755735676?text=Halo%20SmartUjian,%20saya%20Kepala%20Sekolah%20*${schoolNameEncoded}*%20(ID:%20*${schoolIdEncoded}*)%20ingin%20memperpanjang%20atau%20mengaktifkan%20langganan%20sekolah%20kami.`;

  if (!school.subscriptionActive || !school.subscriptionExpiresAt || isExpired) {
    return (
      <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
        <div className="flex items-start gap-3">
          <div className="bg-rose-100 p-2 rounded-xl text-rose-600 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-rose-800 text-sm">LAYANAN MANDIRI NON-AKTIF / EXPIRED</h4>
            <p className="text-xs text-rose-700 leading-relaxed mt-0.5">
              Masa aktif langganan portal ujian sekolah Anda telah berakhir atau belum aktif. Harap lakukan pembayaran perpanjangan paket agar layanan ujian online tetap lancar dan dapat diakses.
            </p>
          </div>
        </div>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-200 shrink-0"
        >
          <MessageSquare className="w-4 h-4 fill-white/10" />
          <span>Hubungi Admin Pusat (Perbarui)</span>
        </a>
      </div>
    );
  }

  if (daysLeft < 7) {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="bg-amber-100 p-2 rounded-xl text-amber-600 mt-0.5">
            <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div>
            <h4 className="font-extrabold text-amber-800 text-sm">PERINGATAN: MASA LANGGANAN SEGERA HABIS!</h4>
            <p className="text-xs text-amber-700 leading-relaxed mt-0.5">
              Masa aktif paket <span className="font-bold underline capitalize">{school.subscriptionPackage?.replace("_", " ")}</span> tersisa <span className="font-black bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-900">{timeLeft}</span> lagi. Segera perbarui sebelum layanan terputus secara otomatis.
            </p>
          </div>
        </div>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-200 shrink-0"
        >
          <MessageSquare className="w-4 h-4 fill-white/10" />
          <span>Hubungi Admin via WA</span>
        </a>
      </div>
    );
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200/60 p-3.5 rounded-xl flex items-center justify-between gap-3 text-emerald-800">
      <div className="flex items-center gap-2.5">
        <div className="bg-emerald-100 p-1.5 rounded-lg text-emerald-600 shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <span className="text-xs font-semibold">
          Status Langganan Sekolah: <span className="font-extrabold capitalize">{school.subscriptionPackage?.replace("_", " ")}</span> (Aktif — Sisa {timeLeft})
        </span>
      </div>
      <div className="text-[10px] text-emerald-600 font-bold hidden sm:block bg-emerald-100/50 px-2 py-0.5 rounded border border-emerald-200/30">
        EXPIRES: {new Date(school.subscriptionExpiresAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
    </div>
  );
}

export default function KepalaDashboard({ user, onLogout }: KepalaDashboardProps) {
  const currentSchoolId = user.schoolId || "SMK-MERDEKA";
  const currentSchoolName = user.schoolName || "SMK Merdeka Jakarta";

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"kelas" | "guru" | "siswa" | "sekolah">("kelas");

  // School Profile States
  const [schoolProfile, setSchoolProfile] = useState<School | null>(null);
  const [editSchoolName, setEditSchoolName] = useState(currentSchoolName);
  const [editSchoolAddress, setEditSchoolAddress] = useState("");
  const [editSchoolPhone, setEditSchoolPhone] = useState("");
  const [editSchoolEmail, setEditSchoolEmail] = useState("");
  const [editSchoolWebsite, setEditSchoolWebsite] = useState("");
  const [editSchoolFoundation, setEditSchoolFoundation] = useState("");
  const [editSchoolLogoUrl, setEditSchoolLogoUrl] = useState("");
  const [schoolSuccess, setSchoolSuccess] = useState<string | null>(null);
  const [schoolError, setSchoolError] = useState<string | null>(null);

  // Form States - Class
  const [classNameInput, setClassNameInput] = useState("");
  const [classError, setClassError] = useState<string | null>(null);
  const [classSuccess, setClassSuccess] = useState<string | null>(null);

  // Form States - Teacher
  const [teacherName, setTeacherName] = useState("");
  const [teacherUsername, setTeacherUsername] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("123");
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [teacherSuccess, setTeacherSuccess] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Teacher Class Assignment States
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [selectedClassesForEdit, setSelectedClassesForEdit] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    let classesLoaded = false;
    let teachersLoaded = false;
    let studentsLoaded = false;

    const checkLoadingFinish = () => {
      if (classesLoaded && teachersLoaded && studentsLoaded) {
        setLoading(false);
      }
    };

    // Sub to classes for this school
    const qClasses = query(collection(db, "classes"), where("schoolId", "==", currentSchoolId));
    const unsubClasses = onSnapshot(qClasses, (snap) => {
      const list: SchoolClass[] = [];
      snap.forEach((doc) => {
        list.push({ ...doc.data(), id: doc.id } as SchoolClass);
      });
      setClasses(list.sort((a, b) => a.name.localeCompare(b.name)));
      classesLoaded = true;
      checkLoadingFinish();
    }, (err) => {
      console.error(err);
      classesLoaded = true;
      checkLoadingFinish();
    });

    // Sub to teachers for this school
    const qTeachers = query(collection(db, "teachers"), where("schoolId", "==", currentSchoolId));
    const unsubTeachers = onSnapshot(qTeachers, (snap) => {
      const list: Teacher[] = [];
      snap.forEach((doc) => {
        list.push({ ...doc.data(), id: doc.id } as Teacher);
      });
      setTeachers(list);
      teachersLoaded = true;
      checkLoadingFinish();
    }, (err) => {
      console.error(err);
      teachersLoaded = true;
      checkLoadingFinish();
    });

    // Sub to students for this school
    const qStudents = query(collection(db, "students"), where("schoolId", "==", currentSchoolId));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      const list: Student[] = [];
      snap.forEach((doc) => {
        list.push({ ...doc.data(), id: doc.id } as Student);
      });
      setStudents(list);
      studentsLoaded = true;
      checkLoadingFinish();
    }, (err) => {
      console.error(err);
      studentsLoaded = true;
      checkLoadingFinish();
    });

    // Sub to school profile
    const unsubSchool = onSnapshot(doc(db, "schools", currentSchoolId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as School;
        setSchoolProfile(data);
        setEditSchoolName(data.name || currentSchoolName);
        setEditSchoolAddress(data.address || "");
        setEditSchoolPhone(data.phone || "");
        setEditSchoolEmail(data.email || "");
        setEditSchoolWebsite(data.website || "");
        setEditSchoolFoundation(data.foundation || "");
        setEditSchoolLogoUrl(data.logoUrl || "");
      } else {
        // Initialize default school config if it doesn't exist
        const initialSchool: School = {
          id: currentSchoolId,
          name: currentSchoolName,
          address: "Kompleks Pendidikan Nasional Raya No. 100, Indonesia",
          phone: "(021) 555-0199",
          email: "info@smartujian.sch.id",
          website: "www.smartujian.sch.id",
          foundation: "YAYASAN PENDIDIKAN SMART UJIAN INDONESIA",
          createdAt: new Date().toISOString()
        };
        setDoc(doc(db, "schools", currentSchoolId), initialSchool).catch(console.error);
      }
    });

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => {
      unsubClasses();
      unsubTeachers();
      unsubStudents();
      unsubSchool();
      clearTimeout(timeout);
    };
  }, [currentSchoolId]);

  // Handler: Create Class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setClassError(null);
    setClassSuccess(null);

    const cleanClassName = classNameInput.trim().toUpperCase();
    if (!cleanClassName) {
      setClassError("Nama kelas tidak boleh kosong.");
      return;
    }

    // Check if class already exists in this school
    if (classes.some((c) => c.name.toUpperCase() === cleanClassName)) {
      setClassError(`Kelas "${cleanClassName}" sudah ada di sekolah ini.`);
      return;
    }

    const classId = `${currentSchoolId}-${cleanClassName.replace(/\s+/g, "-")}`;
    const newClass: SchoolClass = {
      id: classId,
      name: cleanClassName,
      schoolId: currentSchoolId,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "classes", classId), newClass);
      setClassSuccess(`Kelas "${cleanClassName}" berhasil ditambahkan!`);
      setClassNameInput("");
    } catch (err: any) {
      console.error(err);
      setClassError("Gagal menyimpan kelas ke database.");
    }
  };

  // Handler: Create Teacher
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError(null);
    setTeacherSuccess(null);

    const totalUsers = teachers.length + students.length;
    const addonCount = schoolProfile?.addonCount || 0;
    const isAddonExpired = addonCount > 0 && schoolProfile?.addonExpiresAt && new Date(schoolProfile.addonExpiresAt).getTime() < Date.now();
    const capacity = (addonCount > 0 && !isAddonExpired) ? (200 + addonCount * 150) : 200;

    if (totalUsers >= capacity) {
      setTeacherError(`Batas kuota pengguna sekolah (${capacity} user) telah tercapai. Tidak dapat mendaftarkan Guru baru. Harap beli atau perpanjang addon kapasitas.`);
      return;
    }

    const cleanName = teacherName.trim();
    const cleanUsername = teacherUsername.toLowerCase().trim().replace(/\s+/g, "");

    if (!cleanName || !cleanUsername) {
      setTeacherError("Nama lengkap dan username tidak boleh kosong.");
      return;
    }

    // Check if username is already taken globally or locally
    if (teachers.some((t) => t.username === cleanUsername)) {
      setTeacherError(`Username "${cleanUsername}" sudah digunakan oleh guru lain di sekolah ini.`);
      return;
    }

    const newTeacher: Teacher = {
      id: cleanUsername,
      username: cleanUsername,
      name: cleanName,
      password: teacherPassword || "123",
      schoolId: currentSchoolId,
      schoolName: currentSchoolName,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "teachers", cleanUsername), newTeacher);
      setTeacherSuccess(`Guru "${cleanName}" berhasil didaftarkan!`);
      setTeacherName("");
      setTeacherUsername("");
      setTeacherPassword("123");
    } catch (err: any) {
      console.error(err);
      setTeacherError("Gagal mendaftarkan Guru ke database.");
    }
  };

  // Handler: Delete Class
  const handleDeleteClass = async (classId: string, className: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus kelas "${className}"?`)) {
      try {
        await deleteDoc(doc(db, "classes", classId));
        alert(`Kelas "${className}" berhasil dihapus.`);
      } catch (err) {
        console.error(err);
        alert("Gagal menghapus kelas.");
      }
    }
  };

  // Handler: Delete Teacher
  const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus akun guru "${teacherName}"?`)) {
      try {
        await deleteDoc(doc(db, "teachers", teacherId));
        alert(`Akun guru "${teacherName}" berhasil dihapus.`);
      } catch (err) {
        console.error(err);
        alert("Gagal menghapus guru.");
      }
    }
  };

  // Handler: Save Teacher Class Assignment
  const handleSaveTeacherClasses = async (teacherId: string) => {
    try {
      await setDoc(doc(db, "teachers", teacherId), {
        classes: selectedClassesForEdit
      }, { merge: true });
      setEditingTeacherId(null);
    } catch (err) {
      console.error(err);
      alert("Gagal memperbarui penugasan kelas.");
    }
  };

  // Handler: Update School Profile
  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchoolError(null);
    setSchoolSuccess(null);

    const cleanName = editSchoolName.trim();
    if (!cleanName) {
      setSchoolError("Nama sekolah tidak boleh kosong.");
      return;
    }

    const updatedSchool: School = {
      id: currentSchoolId,
      name: cleanName,
      address: editSchoolAddress.trim(),
      phone: editSchoolPhone.trim(),
      email: editSchoolEmail.trim(),
      website: editSchoolWebsite.trim(),
      foundation: editSchoolFoundation.trim(),
      logoUrl: editSchoolLogoUrl,
      createdAt: schoolProfile?.createdAt || new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "schools", currentSchoolId), updatedSchool);
      setSchoolSuccess("Profil & Kop Sekolah berhasil diperbarui!");
      setTimeout(() => setSchoolSuccess(null), 5000);
    } catch (err: any) {
      console.error(err);
      setSchoolError("Gagal memperbarui profil sekolah.");
    }
  };

  // Filtered lists
  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeachers = teachers.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.class && s.class.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isExpired = schoolProfile && (schoolProfile.subscriptionActive === false || (schoolProfile.subscriptionExpiresAt && new Date(schoolProfile.subscriptionExpiresAt).getTime() < new Date().getTime()));

  if (schoolProfile?.suspended === true || isExpired) {
    const isSuspended = schoolProfile?.suspended === true;
    const schoolNameEncoded = encodeURIComponent(schoolProfile.name || "Sekolah Kami");
    const schoolIdEncoded = encodeURIComponent(schoolProfile.id || "ID-SEKOLAH");
    const waUrl = isSuspended
      ? `https://wa.me/6285755735676?text=Halo%20SmartUjian,%20saya%20Kepala%20Sekolah%20*${schoolNameEncoded}*%20(ID:%20*${schoolIdEncoded}*)%20ingin%20mengaktifkan%20kembali%20sekolah%20kami%20yang%20ditangguhkan.`
      : `https://wa.me/6285755735676?text=Halo%20SmartUjian,%20saya%20Kepala%20Sekolah%20*${schoolNameEncoded}*%20(ID:%20*${schoolIdEncoded}*)%20ingin%20memperpanjang%20paket%20langganan%20kami%20yang%20telah%20habis.`;

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
              "Maaf, status sekolah Anda saat ini ditangguhkan (SUSPENDED) oleh Super Admin. Seluruh akses portal untuk Kepala Sekolah, Guru, dan Siswa dinonaktifkan sementara. Silakan hubungi pusat administrator untuk informasi lebih lanjut dan mengaktifkan kembali portal sekolah Anda."
            ) : (
              "Terima kasih telah menggunakan SmartUjian. Masa aktif paket langganan sekolah Anda telah berakhir (expired). Untuk melanjutkan seluruh kegiatan ujian online, mengelola siswa, dan melihat hasil ujian secara lancar, silakan hubungi kami untuk melakukan perpanjangan paket."
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
              <MessageSquare className="w-4 h-4 fill-white/10" />
              <span>{isSuspended ? "Hubungi Admin Pusat via WhatsApp" : "Perpanjang Paket Langganan Sekarang"}</span>
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
              <h1 className="text-sm sm:text-base font-black text-slate-800 tracking-tight uppercase leading-none">
                Eco Smart Exam
              </h1>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider leading-none mt-1">
                {schoolProfile?.name || currentSchoolName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <div className="text-xs font-bold text-slate-800">{user.name}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Administrator Sekolah</div>
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
        {/* Subscription Alert */}
        <KepalaSubscriptionAlert school={schoolProfile} />

        {/* Quota Alert */}
        <KepalaQuotaAlert school={schoolProfile} teachersCount={teachers.length} studentsCount={students.length} />

        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-amber-950 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Selamat Datang, Bapak/Ibu {user.name}</h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Di panel Kepala Sekolah, Anda bertugas menginput query Kelas resmi untuk sekolah ini serta mendaftarkan akun Guru Pengajar. Guru akan menambahkan siswa dengan memilih dropdown kelas yang telah Anda tentukan.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <div className="bg-white/10 px-4 py-3 rounded-xl border border-white/10 text-center min-w-[90px]">
              <div className="text-xl sm:text-2xl font-black text-amber-300">{classes.length}</div>
              <div className="text-[9px] uppercase tracking-wider text-slate-300 font-bold">Total Kelas</div>
            </div>
            <div className="bg-white/10 px-4 py-3 rounded-xl border border-white/10 text-center min-w-[90px]">
              <div className="text-xl sm:text-2xl font-black text-amber-300">{teachers.length}</div>
              <div className="text-[9px] uppercase tracking-wider text-slate-300 font-bold">Total Guru</div>
            </div>
            <div className="bg-white/10 px-4 py-3 rounded-xl border border-white/10 text-center min-w-[90px]">
              <div className="text-xl sm:text-2xl font-black text-amber-300">{students.length}</div>
              <div className="text-[9px] uppercase tracking-wider text-slate-300 font-bold">Total Siswa</div>
            </div>
          </div>
        </div>

        {/* Action Forms and Subscriptions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form Left Side: Form Addition */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Form: Add Class */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="bg-amber-50 p-2 rounded-xl text-amber-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">Input Query Kelas Resmi</h3>
              </div>

              {classError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{classError}</span>
                </div>
              )}

              {classSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{classSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateClass} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nama / Label Kelas
                  </label>
                  <input
                    id="input-class-name"
                    type="text"
                    placeholder="Contoh: XII-RPL-1, X-IPA-3, XI-IPS-2"
                    value={classNameInput}
                    onChange={(e) => setClassNameInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Format disarankan menggunakan huruf kapital dan tanda hubung untuk keseragaman.
                  </p>
                </div>

                <button
                  id="btn-submit-class"
                  type="submit"
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambahkan Kelas
                </button>
              </form>
            </div>

            {/* Form: Add Teacher */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">Registrasi Guru Baru</h3>
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
                    Nama Lengkap Guru (Beserta Gelar)
                  </label>
                  <input
                    id="input-teacher-name"
                    type="text"
                    placeholder="Contoh: Sri Wahyuni, S.Pd."
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
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
                      id="input-teacher-username"
                      type="text"
                      placeholder="e.g. sriwahyuni"
                      value={teacherUsername}
                      onChange={(e) => setTeacherUsername(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Password Login
                    </label>
                    <input
                      id="input-teacher-password"
                      type="text"
                      placeholder="default: 123"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <button
                  id="btn-submit-teacher"
                  type="submit"
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Daftarkan Akun Guru
                </button>
              </form>
            </div>

          </div>

          {/* List Right Side: Tabs View */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Search and Tabs Header */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                
                {/* Tabs selection */}
                <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-auto overflow-x-auto">
                  <button
                    id="tab-view-kelas"
                    onClick={() => { setActiveTab("kelas"); setSearchQuery(""); }}
                    className={`flex-1 sm:flex-initial px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      activeTab === "kelas" 
                        ? "bg-white text-amber-700 shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Daftar Kelas ({classes.length})
                  </button>
                  <button
                    id="tab-view-guru"
                    onClick={() => { setActiveTab("guru"); setSearchQuery(""); }}
                    className={`flex-1 sm:flex-initial px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      activeTab === "guru" 
                        ? "bg-white text-indigo-700 shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Daftar Guru ({teachers.length})
                  </button>
                  <button
                    id="tab-view-siswa"
                    onClick={() => { setActiveTab("siswa"); setSearchQuery(""); }}
                    className={`flex-1 sm:flex-initial px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      activeTab === "siswa" 
                        ? "bg-white text-emerald-700 shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Siswa Aktif ({students.length})
                  </button>
                  <button
                    id="tab-view-sekolah"
                    onClick={() => { setActiveTab("sekolah"); setSearchQuery(""); }}
                    className={`flex-1 sm:flex-initial px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      activeTab === "sekolah" 
                        ? "bg-white text-rose-700 shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Data Sekolah 🏢
                  </button>
                </div>

                {/* Search query field */}
                {activeTab !== "sekolah" && (
                  <div className="relative w-full sm:w-64">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Search className="w-3.5 h-3.5" />
                    </span>
                    <input
                      id="input-search-query"
                      type="text"
                      placeholder={`Cari ${activeTab === "kelas" ? "kelas..." : activeTab === "guru" ? "guru..." : "siswa..."}`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

              </div>
            </div>

            {/* List Body Rendered depending on tab */}
            {loading ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-amber-600 mb-2"></div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Memuat data real-time...</p>
              </div>
            ) : (
              <div className="space-y-3">
                
                {/* 1. Classes List */}
                {activeTab === "kelas" && (
                  filteredClasses.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 text-slate-400">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-bold">Tidak ada kelas ditemukan</p>
                      <p className="text-xs">Silakan input query kelas resmi di menu sebelah kiri.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredClasses.map((cls) => (
                        <div key={cls.id} className="bg-white p-4 rounded-xl border border-slate-100 hover:border-amber-100 transition-all flex justify-between items-center group shadow-2xs">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
                              {cls.name.substring(0, 2)}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm">{cls.name}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">ID: {cls.id}</p>
                            </div>
                          </div>
                          <button
                            id={`btn-delete-class-${cls.id}`}
                            onClick={() => handleDeleteClass(cls.id, cls.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Hapus Kelas"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* 2. Teachers List */}
                {activeTab === "guru" && (
                  filteredTeachers.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-bold">Tidak ada guru ditemukan</p>
                      <p className="text-xs">Silakan daftarkan akun guru pengajar di sebelah kiri.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredTeachers.map((tc) => {
                        const isEditing = editingTeacherId === tc.id;
                        const assignedClassesList = classes.filter(c => tc.classes?.includes(c.id));

                        return (
                          <div key={tc.id} className="bg-white p-4 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all shadow-2xs space-y-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                                  {tc.name.charAt(0)}
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">{tc.name}</h4>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                    <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                                      <UserCheck className="w-3 h-3" />
                                      @{tc.username}
                                    </span>
                                    <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                                      <Key className="w-3 h-3 text-slate-400" />
                                      Pass: {tc.password}
                                    </span>
                                  </div>
                                  
                                  {/* Assigned class badges */}
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {assignedClassesList.length === 0 ? (
                                      <span className="text-[9px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                        Semua Kelas (Akses Penuh)
                                      </span>
                                    ) : (
                                      assignedClassesList.map(c => (
                                        <span key={c.id} className="text-[9px] text-indigo-700 font-extrabold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                          {c.name}
                                        </span>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  id={`btn-manage-classes-${tc.id}`}
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingTeacherId(null);
                                    } else {
                                      setEditingTeacherId(tc.id);
                                      setSelectedClassesForEdit(tc.classes || []);
                                    }
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                    isEditing 
                                      ? "bg-amber-50 text-amber-600 border-amber-200"
                                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                                  }`}
                                  title="Atur Penugasan Kelas"
                                >
                                  <span>Atur Kelas</span>
                                </button>
                                <button
                                  id={`btn-delete-teacher-${tc.id}`}
                                  onClick={() => handleDeleteTeacher(tc.id, tc.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                  title="Hapus Akun Guru"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Inline Edit Form for Classes */}
                            {isEditing && (
                              <div className="pt-3 border-t border-slate-100 animate-fadeIn space-y-3">
                                <div>
                                  <h5 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                    Pilih Kelas Diampu Guru Ini:
                                  </h5>
                                  <p className="text-[10px] text-slate-400">
                                    Guru hanya dapat melihat murid dan merilis ujian pada kelas-kelas yang dicentang di bawah.
                                  </p>
                                </div>

                                {classes.length === 0 ? (
                                  <p className="text-xs text-slate-400 py-2">
                                    Belum ada kelas resmi. Tambahkan kelas terlebih dahulu di tab sebelah kiri.
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {classes.map((cls) => {
                                      const isChecked = selectedClassesForEdit.includes(cls.id);
                                      return (
                                        <label
                                          key={cls.id}
                                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                                            isChecked
                                              ? "bg-indigo-50 border-indigo-200 text-indigo-800 font-bold"
                                              : "bg-slate-50 border-slate-150 hover:bg-slate-100 text-slate-600"
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              if (isChecked) {
                                                setSelectedClassesForEdit(prev => prev.filter(id => id !== cls.id));
                                              } else {
                                                setSelectedClassesForEdit(prev => [...prev, cls.id]);
                                              }
                                            }}
                                            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                          />
                                          <span className="truncate">{cls.name}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}

                                <div className="flex justify-end gap-2 pt-2">
                                  <button
                                    onClick={() => setEditingTeacherId(null)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                  <button
                                    onClick={() => handleSaveTeacherClasses(tc.id)}
                                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                                  >
                                    Simpan Penugasan
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {/* 3. Students List */}
                {activeTab === "siswa" && (
                  filteredStudents.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-bold">Tidak ada siswa aktif</p>
                      <p className="text-xs">Siswa akan otomatis muncul setelah didaftarkan oleh akun Guru Pengajar.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-2xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-150">
                            <th className="p-3.5">Nama Siswa</th>
                            <th className="p-3.5">Kelas</th>
                            <th className="p-3.5">Username</th>
                            <th className="p-3.5 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredStudents.map((st) => (
                            <tr key={st.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="p-3.5 font-bold text-slate-800">{st.name}</td>
                              <td className="p-3.5">
                                <span className="inline-flex px-2 py-0.5 bg-amber-50 text-amber-700 font-extrabold text-[10px] rounded">
                                  {st.class || "Belum Ditentukan"}
                                </span>
                              </td>
                              <td className="p-3.5 font-mono text-slate-500">@{st.username}</td>
                              <td className="p-3.5 text-right">
                                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center justify-end gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  Aktif
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {/* 4. School Profile Tab */}
                {activeTab === "sekolah" && (
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-2xs space-y-5">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <div className="bg-rose-50 p-2 rounded-xl text-rose-600">
                        <SchoolIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">Profil & Kop Surat Sekolah</h3>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">ID Sekolah: {currentSchoolId}</p>
                      </div>
                    </div>

                    {schoolError && (
                      <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl flex items-center gap-2 font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{schoolError}</span>
                      </div>
                    )}

                    {schoolSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex items-center gap-2 font-semibold font-sans animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{schoolSuccess}</span>
                      </div>
                    )}

                    <form onSubmit={handleUpdateSchool} className="space-y-4">
                      {/* Logo Upload Section */}
                      <div 
                        className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-4 transition-colors hover:border-rose-300"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file) {
                            if (file.size > 500 * 1024) {
                              setSchoolError("Ukuran file logo terlalu besar. Maksimal adalah 500 KB.");
                              return;
                            }
                            if (!file.type.startsWith("image/")) {
                              setSchoolError("Hanya file gambar yang diperbolehkan.");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditSchoolLogoUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      >
                        <div className="shrink-0">
                          {editSchoolLogoUrl ? (
                            <img
                              src={editSchoolLogoUrl}
                              alt="Logo Sekolah"
                              className="w-16 h-16 rounded-xl object-contain bg-white border border-slate-200 p-1 shadow-xs"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs">
                              No Logo
                            </div>
                          )}
                        </div>
                        <div className="flex-1 w-full space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Logo Sekolah (Untuk KOP Surat)
                          </label>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="file"
                              id="input-school-logo"
                              accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 500 * 1024) {
                                    setSchoolError("Ukuran file logo terlalu besar. Maksimal adalah 500 KB.");
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setEditSchoolLogoUrl(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById("input-school-logo")?.click()}
                              className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
                            >
                              Pilih File Logo
                            </button>
                            {editSchoolLogoUrl && (
                              <button
                                type="button"
                                onClick={() => setEditSchoolLogoUrl("")}
                                className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg font-bold text-[11px] transition-all cursor-pointer"
                              >
                                Hapus Logo
                              </button>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-400 font-medium">Seret & lepas gambar di sini, atau klik tombol di atas. Maksimal 500 KB (PNG, JPG, SVG).</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Nama Yayasan / Lembaga Pembina (Kop Atas)
                        </label>
                        <input
                          id="input-school-foundation"
                          type="text"
                          placeholder="Contoh: YAYASAN PENDIDIKAN SMART UJIAN INDONESIA"
                          value={editSchoolFoundation}
                          onChange={(e) => setEditSchoolFoundation(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Nama Resmi Sekolah
                          </label>
                          <input
                            id="input-school-name"
                            type="text"
                            placeholder="Contoh: SMK Merdeka Jakarta"
                            value={editSchoolName}
                            onChange={(e) => setEditSchoolName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold text-slate-700"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Nomor Telepon Sekolah
                          </label>
                          <input
                            id="input-school-phone"
                            type="text"
                            placeholder="Contoh: (021) 555-0199"
                            value={editSchoolPhone}
                            onChange={(e) => setEditSchoolPhone(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Alamat Lengkap Sekolah
                        </label>
                        <input
                          id="input-school-address"
                          type="text"
                          placeholder="Contoh: Kompleks Pendidikan Nasional Raya No. 100, Indonesia"
                          value={editSchoolAddress}
                          onChange={(e) => setEditSchoolAddress(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Email Resmi Sekolah
                          </label>
                          <input
                            id="input-school-email"
                            type="email"
                            placeholder="Contoh: info@smartujian.sch.id"
                            value={editSchoolEmail}
                            onChange={(e) => setEditSchoolEmail(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Website Resmi Sekolah
                          </label>
                          <input
                            id="input-school-website"
                            type="text"
                            placeholder="Contoh: www.smartujian.sch.id"
                            value={editSchoolWebsite}
                            onChange={(e) => setEditSchoolWebsite(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          id="btn-update-school-profile"
                          type="submit"
                          className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          Simpan Perubahan & Perbarui Kop PDF
                        </button>
                      </div>
                    </form>

                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <span>ℹ️</span>
                        <span>Informasi KOP Surat</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                        Seluruh rincian data di atas akan otomatis digunakan sebagai data resmi Kop Sekolah (Letterhead) di lembaran hasil cetak evaluasi siswa (PDF) ketika dicetak oleh Guru Pengajar.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

        </div>
      </main>
    </div>
  );
}
