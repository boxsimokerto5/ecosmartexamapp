import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface SplashScreenProps {
  isSeeding: boolean;
  onFinished: () => void;
}

export default function SplashScreen({ isSeeding, onFinished }: SplashScreenProps) {
  const [statusText, setStatusText] = useState("Menghubungkan ke server...");
  const [progress, setProgress] = useState(10);
  const [showSplash, setShowSplash] = useState(true);

  // Status message rotation & progress simulation
  useEffect(() => {
    const statuses = [
      "Menghubungkan ke server...",
      "Membaca konfigurasi instansi...",
      "Sinkronisasi bank soal ramah lingkungan...",
      "Mengoptimalkan performa enkripsi...",
      "Sistem siap digunakan!"
    ];

    let currentStatusIndex = 0;
    const interval = setInterval(() => {
      if (currentStatusIndex < statuses.length - 1) {
        currentStatusIndex++;
        setStatusText(statuses[currentStatusIndex]);
        setProgress((prev) => Math.min(prev + 20, 90));
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Minimum display duration of 2.5 seconds before allowing transition
  useEffect(() => {
    if (!isSeeding) {
      setProgress(100);
      setStatusText("Sistem siap digunakan!");
      const timeout = setTimeout(() => {
        setShowSplash(false);
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [isSeeding]);

  return (
    <AnimatePresence onExitComplete={onFinished}>
      {showSplash && (
        <motion.div
          id="splash-container"
          className="fixed inset-0 bg-linear-to-b from-emerald-50 via-white to-indigo-50/30 flex flex-col items-center justify-between py-12 px-6 z-50 overflow-hidden font-sans select-none"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            scale: 1.05,
            transition: { duration: 0.5, ease: "easeInOut" }
          }}
        >
          {/* Subtle Ambient Decorative Circles */}
          <div className="absolute top-[-10%] left-[-10%] w-72 h-72 rounded-full bg-emerald-100/30 blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />

          {/* Top Header Label */}
          <motion.div 
            className="flex flex-col items-center gap-1 mt-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="bg-emerald-100/60 text-emerald-800 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-200/50 flex items-center gap-1 shadow-xs">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              <span>Mobile Android Edition</span>
            </div>
          </motion.div>

          {/* Main Logo and Branding Container */}
          <div className="flex flex-col items-center gap-6 max-w-sm text-center">
             {/* Logo Wrapper with elegant pop and float animation */}
             <motion.div
               id="splash-logo-wrapper"
               className="w-40 h-40 md:w-44 md:h-44 bg-white rounded-3xl p-0 overflow-hidden shadow-xl border border-slate-100 flex items-center justify-center relative"
               initial={{ scale: 0.3, opacity: 0, rotate: -15 }}
               animate={{ 
                 scale: [1, 1.02, 1],
                 opacity: 1,
                 rotate: 0,
                 y: [0, -6, 0]
               }}
               transition={{
                 scale: { duration: 0.6, ease: "easeOut" },
                 opacity: { duration: 0.5 },
                 y: { repeat: Infinity, duration: 4, ease: "easeInOut" }
               }}
             >
               <img 
                 src="/logo.svg" 
                 alt="Eco Smart Exam Logo" 
                 className="w-full h-full object-contain p-2"
                 referrerPolicy="no-referrer"
               />
              
              {/* Soft decorative shadow circle underneath */}
              <div className="absolute -bottom-4 w-32 h-2.5 bg-slate-400/15 rounded-full blur-xs animate-pulse" />
            </motion.div>

            {/* Title & Tagline with staggered entry */}
            <div className="space-y-2 mt-4">
              <motion.h1
                id="splash-title"
                className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-wider font-sans uppercase"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                Eco <span className="text-emerald-600">Smart</span> Exam
              </motion.h1>
              <motion.p
                className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed px-4"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                Sistem Evaluasi &amp; Ujian Online Ramah Lingkungan Bebas Kertas
              </motion.p>
            </div>
          </div>

          {/* Dynamic Progress Loader & Footnotes */}
          <div className="w-full max-w-xs flex flex-col items-center gap-4 mb-6">
            {/* Minimalist Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40 relative">
              <motion.div 
                className="h-full bg-linear-to-r from-emerald-500 to-indigo-600 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeInOut", duration: 0.4 }}
              />
            </div>

            {/* Current Loading State Label */}
            <motion.div
              key={statusText}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="text-[11px] font-bold text-emerald-700/90 tracking-wide flex items-center gap-1.5"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{statusText}</span>
            </motion.div>

            {/* Copyright/Footer Text */}
            <motion.div 
              className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest text-center mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              Eco Smart Exam &copy; {new Date().getFullYear()}
              <br />
              <span className="text-[8px] tracking-normal font-sans text-slate-400 font-medium">Smart &amp; Paperless Evaluation System</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
