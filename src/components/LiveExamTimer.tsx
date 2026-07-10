import React, { useState, useEffect, useRef } from "react";
import { Clock, AlertTriangle, Volume2, VolumeX, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LiveExamTimerProps {
  durationMinutes: number;
  initialDurationSpent?: number;
  isSubmitting?: boolean;
  onTick?: (timeLeft: number, durationSpent: number) => void;
  onTimeout: () => void;
}

export default function LiveExamTimer({
  durationMinutes,
  initialDurationSpent = 0,
  isSubmitting = false,
  onTick,
  onTimeout
}: LiveExamTimerProps) {
  const totalSeconds = durationMinutes * 60;
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, totalSeconds - initialDurationSpent));
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Audio Context for a safe client-side warning beep when time is critical
  const audioContextRef = useRef<AudioContext | null>(null);

  // Refs to avoid stale closures in setInterval
  const onTickRef = useRef(onTick);
  const onTimeoutRef = useRef(onTimeout);
  const isSubmittingRef = useRef(isSubmitting);
  const timeLeftRef = useRef(timeLeft);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // Handle countdown interval
  useEffect(() => {
    if (isSubmittingRef.current) return;

    const interval = setInterval(() => {
      if (isSubmittingRef.current) {
        clearInterval(interval);
        return;
      }

      const currentT = timeLeftRef.current;
      if (currentT <= 1) {
        clearInterval(interval);
        setTimeLeft(0);
        if (onTickRef.current) {
          onTickRef.current(0, totalSeconds);
        }
        // Trigger timeout callback safely
        setTimeout(() => {
          onTimeoutRef.current();
        }, 0);
        return;
      }

      const newTime = currentT - 1;
      const newSpent = totalSeconds - newTime;

      setTimeLeft(newTime);

      if (onTickRef.current) {
        onTickRef.current(newTime, newSpent);
      }

      // Play subtle tick warning when time is critical and sound is enabled
      if (soundEnabled && newTime <= 60 && newTime % 10 === 0) {
        playWarningBeep();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [totalSeconds, soundEnabled]);

  // Safe synthesizer beep using browser Web Audio API
  const playWarningBeep = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // high A pitch
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.15); // quick decay
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio feedback is disabled or blocked by browser policies.");
    }
  };

  // Helper to format remaining seconds
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Determine urgency state
  const isCritical = timeLeft <= 60; // < 1 minute
  const isWarning = timeLeft <= 300 && timeLeft > 60; // < 5 minutes
  const progressRatio = totalSeconds > 0 ? timeLeft / totalSeconds : 0;

  // Choose alert styling based on urgency
  let bgClass = "bg-slate-50 border-slate-200 text-slate-700";
  let iconColor = "text-indigo-600";
  let ringColor = "ring-slate-100";
  let alertMessage = "";

  if (isCritical) {
    bgClass = "bg-rose-500 border-rose-600 text-white animate-pulse";
    iconColor = "text-white";
    ringColor = "ring-rose-400/50";
    alertMessage = "Waktu kritis! Kirim ujian sekarang!";
  } else if (isWarning) {
    bgClass = "bg-amber-50 border-amber-200 text-amber-700";
    iconColor = "text-amber-600 animate-bounce";
    ringColor = "ring-amber-200/50";
    alertMessage = "Sisa waktu kurang dari 5 menit.";
  }

  return (
    <div className="flex flex-col items-stretch space-y-2 select-none w-full max-w-sm font-sans">
      
      {/* 1. MAIN TIMER BOX */}
      <div className={`relative flex items-center justify-between px-4 py-2.5 rounded-2xl border shadow-sm transition-all duration-300 ring-4 ${bgClass} ${ringColor}`}>
        
        {/* Progress Bar inside */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10 overflow-hidden rounded-b-2xl">
          <div 
            className={`h-full transition-all duration-1000 ${
              isCritical ? "bg-white" : isWarning ? "bg-amber-500" : "bg-indigo-600"
            }`}
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>

        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-xl ${isCritical ? "bg-rose-600" : isWarning ? "bg-amber-100" : "bg-indigo-50"}`}>
            {isCritical ? (
              <AlertCircle className="w-4 h-4 text-white animate-spin" />
            ) : isWarning ? (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            ) : (
              <Clock className="w-4 h-4 text-indigo-600" />
            )}
          </div>
          
          <div className="text-left">
            <span className={`text-[9px] font-bold uppercase tracking-wider block opacity-75 ${isCritical ? "text-rose-100" : "text-slate-400"}`}>
              {isCritical ? "SISA WAKTU!!" : "SISA WAKTU"}
            </span>
            <span className="font-mono font-black text-lg leading-none tracking-tight">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Audio feedback control */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
            isCritical
              ? "bg-rose-600 hover:bg-rose-700 border-rose-400/30 text-white"
              : "bg-white hover:bg-slate-50 border-slate-200 text-slate-500"
          }`}
          title={soundEnabled ? "Matikan suara peringatan" : "Aktifkan suara peringatan"}
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5" />
          ) : (
            <VolumeX className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* 2. REALTIME NOTIFICATION LABEL */}
      <AnimatePresence>
        {alertMessage && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className={`text-center font-bold text-[10px] uppercase tracking-wide px-3 py-1 rounded-lg ${
              isCritical ? "text-rose-600 bg-rose-50 animate-pulse" : "text-amber-600 bg-amber-50"
            }`}
          >
            {alertMessage}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
