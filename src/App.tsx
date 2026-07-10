import React, { useState, useEffect } from "react";
import { seedDatabaseIfEmpty } from "./lib/seed";
import Login from "./components/Login";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import KepalaDashboard from "./components/KepalaDashboard";
import GuruDashboard from "./components/GuruDashboard";
import SiswaDashboard from "./components/SiswaDashboard";
import SplashScreen from "./components/SplashScreen";
import PromoBanner from "./components/PromoBanner";
import { RefreshCw } from "lucide-react";

interface AppUser {
  role: "super_admin" | "kepala_sekolah" | "guru" | "siswa";
  id: string;
  name: string;
  class?: string;
  schoolId?: string;
  schoolName?: string;
}

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isSeeding, setIsSeeding] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [showPromo, setShowPromo] = useState(false);

  // Auto seed on app mount
  useEffect(() => {
    async function initDb() {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 2500)
        );
        await Promise.race([seedDatabaseIfEmpty(), timeoutPromise]);
      } catch (err) {
        console.warn("Auto-seed database timed out or failed, proceeding with offline compatibility:", err);
      } finally {
        setIsSeeding(false);
      }
    }
    initDb();
  }, []);

  const handleLoginSuccess = (loggedInUser: AppUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (showSplash) {
    return (
      <SplashScreen 
        isSeeding={isSeeding} 
        onFinished={() => {
          setShowSplash(false);
          setShowPromo(true);
        }} 
      />
    );
  }

  if (showPromo) {
    return (
      <PromoBanner 
        onClose={() => setShowPromo(false)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {!user ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : user.role === "super_admin" ? (
        <SuperAdminDashboard user={user as any} onLogout={handleLogout} />
      ) : user.role === "kepala_sekolah" ? (
        <KepalaDashboard user={user as any} onLogout={handleLogout} />
      ) : user.role === "guru" ? (
        <GuruDashboard user={user as any} onLogout={handleLogout} />
      ) : (
        <SiswaDashboard user={user as any} onLogout={handleLogout} />
      )}
    </div>
  );
}
