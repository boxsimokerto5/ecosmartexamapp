import React, { useState } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { checkUserLimit } from "../lib/userLimit";
import { Student, Teacher, Principal } from "../types";
import { LogIn, GraduationCap, School, AlertCircle, ShieldCheck, Award, MessageCircle } from "lucide-react";

interface LoginProps {
  onLoginSuccess: (user: { 
    role: "super_admin" | "kepala_sekolah" | "guru" | "siswa"; 
    id: string; 
    name: string; 
    class?: string;
    schoolId?: string;
    schoolName?: string;
  }) => void;
}

type RoleType = "siswa" | "guru" | "kepala_sekolah" | "super_admin";

export default function Login({ onLoginSuccess }: LoginProps) {
  const [role, setRole] = useState<RoleType>("siswa");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Silakan isi semua bidang.");
      return;
    }

    setLoading(true);
    setError(null);

    const cleanUsername = username.toLowerCase().trim().replace(/\s+/g, "");

    try {
      // Super Admin validation can be triggered from ANY tab if matching credentials are typed
      if (cleanUsername === "superadmin" && password === "Woyowoyo12@") {
        onLoginSuccess({
          role: "super_admin",
          id: "super-admin-master",
          name: "Super Admin (Pusat)"
        });
        return;
      }

      if (role === "kepala_sekolah") {
        // Dynamic query from "principals" collection with direct document fallback
        let principalData: Principal | null = null;
        let found = false;

        try {
          const q = query(
            collection(db, "principals"),
            where("username", "==", cleanUsername)
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            querySnapshot.forEach((docSnap) => {
              const data = docSnap.data() as Principal;
              if (data.password === password) {
                found = true;
                principalData = data;
              }
            });
          }
        } catch (queryErr: any) {
          console.log("Query fetch warning:", queryErr?.message || queryErr);
        }

        // Fallback to direct document get if query was not successful or empty
        if (!found) {
          try {
            const docRef = doc(db, "principals", cleanUsername);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data() as Principal;
              if (data.password === password) {
                found = true;
                principalData = data;
              }
            }
          } catch (docErr: any) {
            console.log("Direct document fallback warning:", docErr?.message || docErr);
          }
        }

        if (found && principalData) {
          const sId = principalData.schoolId;
          if (sId) {
            const schoolSnap = await getDoc(doc(db, "schools", sId));
            if (schoolSnap.exists() && schoolSnap.data().suspended === true) {
              setError("Maaf, akses portal sekolah Anda ditangguhkan (SUSPENDED) oleh Super Admin. Silakan hubungi administrator.");
              setLoading(false);
              return;
            }
          }
          onLoginSuccess({
            role: "kepala_sekolah",
            id: principalData.id,
            name: principalData.name,
            schoolId: principalData.schoolId,
            schoolName: principalData.schoolName
          });
        } else {
          if (principalData) {
            setError("Password Kepala Sekolah salah.");
          } else {
            setError("Username Kepala Sekolah tidak ditemukan.");
          }
        }
      } else if (role === "guru") {
        // Dynamic query from "teachers" collection with direct document fallback
        let teacherData: Teacher | null = null;
        let found = false;

        try {
          const q = query(
            collection(db, "teachers"),
            where("username", "==", cleanUsername)
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            querySnapshot.forEach((docSnap) => {
              const data = docSnap.data() as Teacher;
              if (data.password === password) {
                found = true;
                teacherData = data;
              }
            });
          }
        } catch (queryErr: any) {
          console.log("Query fetch warning:", queryErr?.message || queryErr);
        }

        // Fallback to direct document get if query was not successful or empty
        if (!found) {
          try {
            const docRef = doc(db, "teachers", cleanUsername);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data() as Teacher;
              if (data.password === password) {
                found = true;
                teacherData = data;
              }
            }
          } catch (docErr: any) {
            console.log("Direct document fallback warning:", docErr?.message || docErr);
          }
        }

        if (found && teacherData) {
          const sId = teacherData.schoolId;
          if (sId) {
            const schoolSnap = await getDoc(doc(db, "schools", sId));
            if (schoolSnap.exists() && schoolSnap.data().suspended === true) {
              setError("Maaf, akses portal sekolah Anda ditangguhkan (SUSPENDED) oleh Super Admin. Silakan hubungi administrator.");
              setLoading(false);
              return;
            }
            
            // Check user limit capacity
            const limitCheck = await checkUserLimit(sId, teacherData.id);
            if (limitCheck.isBlocked) {
              setError(limitCheck.message || "Batas kuota pengguna terlampaui.");
              setLoading(false);
              return;
            }
          }
          onLoginSuccess({
            role: "guru",
            id: teacherData.id,
            name: teacherData.name,
            schoolId: teacherData.schoolId,
            schoolName: teacherData.schoolName
          });
        } else {
          if (teacherData) {
            setError("Password Guru salah.");
          } else {
            setError("Username Guru tidak ditemukan.");
          }
        }
      } else {
        // Student dynamic query from Firestore with direct document fallback
        let studentData: Student | null = null;
        let found = false;

        try {
          const q = query(
            collection(db, "students"),
            where("username", "==", cleanUsername)
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            querySnapshot.forEach((docSnap) => {
              const data = docSnap.data() as Student;
              if (data.password === password) {
                found = true;
                studentData = data;
              }
            });
          }
        } catch (queryErr: any) {
          console.log("Query fetch warning:", queryErr?.message || queryErr);
        }

        // Fallback to direct document get if query was not successful or empty
        if (!found) {
          try {
            const docRef = doc(db, "students", cleanUsername);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data() as Student;
              if (data.password === password) {
                found = true;
                studentData = data;
              }
            }
          } catch (docErr: any) {
            console.log("Direct document fallback warning:", docErr?.message || docErr);
          }
        }

        if (found && studentData) {
          const sId = studentData.schoolId;
          if (sId) {
            const schoolSnap = await getDoc(doc(db, "schools", sId));
            if (schoolSnap.exists() && schoolSnap.data().suspended === true) {
              setError("Maaf, akses portal sekolah Anda ditangguhkan (SUSPENDED) oleh Super Admin. Silakan hubungi administrator.");
              setLoading(false);
              return;
            }

            // Check user limit capacity
            const limitCheck = await checkUserLimit(sId, studentData.id);
            if (limitCheck.isBlocked) {
              setError(limitCheck.message || "Batas kuota pengguna terlampaui.");
              setLoading(false);
              return;
            }
          }
          onLoginSuccess({
            role: "siswa",
            id: studentData.id,
            name: studentData.name,
            class: studentData.class,
            schoolId: studentData.schoolId,
            schoolName: studentData.schoolName
          });
        } else {
          if (studentData) {
            setError("Password siswa salah.");
          } else {
            setError("Username siswa tidak ditemukan.");
          }
        }
      }
    } catch (err: any) {
      console.log("Login action connection details:", err?.message || err);
      setError("Terjadi kesalahan koneksi database.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transition-all duration-300 animate-fadeIn">
        {/* Header Visual */}
        <div className="bg-gradient-to-tr from-emerald-600 via-emerald-700 to-indigo-800 p-8 text-white text-center relative">
          <div className="absolute top-4 right-4 bg-white/15 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-sm">
            v1.2 Smart &amp; Eco
          </div>
          <div className="inline-flex p-2 bg-white rounded-2xl shadow-md mb-3">
            <img 
              src="/logo.png" 
              alt="Eco Smart Exam Logo" 
              className="w-12 h-12 object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight uppercase">Eco Smart Exam</h1>
          <p className="text-emerald-50 text-xs mt-1 font-medium">Sistem Evaluasi &amp; Ujian Online Bebas Kertas Ramah Lingkungan</p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-3 border-b border-slate-100 bg-slate-50/50 p-1 gap-1">
          <button
            id="tab-siswa"
            type="button"
            className={`py-3 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
              role === "siswa"
                ? "bg-white text-emerald-600 shadow-sm border border-slate-150"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }`}
            onClick={() => {
              setRole("siswa");
              setError(null);
            }}
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
            <span>Siswa</span>
          </button>
          
          <button
            id="tab-guru"
            type="button"
            className={`py-3 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
              role === "guru"
                ? "bg-white text-indigo-600 shadow-sm border border-slate-150"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }`}
            onClick={() => {
              setRole("guru");
              setError(null);
            }}
          >
            <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
            <span>Guru</span>
          </button>

          <button
            id="tab-kepala"
            type="button"
            className={`py-3 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
              role === "kepala_sekolah"
                ? "bg-white text-amber-600 shadow-sm border border-slate-150"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }`}
            onClick={() => {
              setRole("kepala_sekolah");
              setError(null);
            }}
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Kepala Sekolah</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {role === "kepala_sekolah" 
                  ? "Username Kepala Sekolah" 
                  : role === "guru" 
                    ? "Username Guru" 
                    : "Username / ID Siswa"}
              </label>
              <input
                id="input-username"
                type="text"
                placeholder={
                  role === "kepala_sekolah"
                    ? "Masukkan username kepala sekolah (e.g. kepala)"
                    : role === "guru" 
                      ? "Masukkan username guru (e.g. guru)" 
                      : "Masukkan username siswa (e.g. budi)"
                }
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                id="input-password"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition-all"
                required
              />
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-indigo-700 hover:from-emerald-700 hover:via-emerald-800 hover:to-indigo-800 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-emerald-100 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {loading ? "Menghubungkan..." : "Masuk Sistem"}
            </button>
          </form>

          {/* WhatsApp Registration Section */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center text-center gap-3">
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Belum memiliki akun guru atau sekolah Anda belum terdaftar?
            </p>
            <a
              href="https://wa.me/6285755735676?text=Halo%20SmartUjian,%20saya%20tertarik%20ingin%20mendaftar%20akun%20guru%20dan%20layanan%20ujian%20online"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 font-bold text-xs rounded-xl transition-all border border-emerald-200/50 cursor-pointer shadow-xs"
            >
              <MessageCircle className="w-4 h-4 text-emerald-500" />
              <span>Hubungi via WhatsApp</span>
            </a>
          </div>

          <div className="mt-6 text-center">
            <p className="text-[10px] text-slate-400 font-medium">
              Sistem Ujian Ramah Lingkungan &bull; Tanpa Kertas &bull; Hemat Energi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
