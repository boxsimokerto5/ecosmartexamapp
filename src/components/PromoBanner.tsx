import React, { useState, useRef } from "react";
import { 
  Check, 
  Sparkles, 
  Flame, 
  ArrowRight, 
  ArrowLeft, 
  MessageSquare, 
  Zap, 
  Crown, 
  Star,
  Smile,
  Heart,
  ChevronRight,
  ChevronLeft
} from "lucide-react";

interface PromoBannerProps {
  onClose: () => void;
}

export default function PromoBanner({ onClose }: PromoBannerProps) {
  const [currentSlide, setCurrentSlide] = useState(1); // Default to "Perak" (index 1) as it is most popular
  
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const slides = [
    {
      id: "slide-1",
      title: "Paket Perunggu",
      duration: "1 BULAN",
      tagline: "Langkah awal ceria untuk ujian kelas bulanan 🌟",
      originalPrice: "Rp 50.000",
      promoPrice: "Rp 20.000",
      discount: "HEMAT 60%",
      accentColor: "amber",
      gradientBg: "from-amber-100 to-orange-100/70",
      borderColor: "border-amber-300",
      textColor: "text-amber-700",
      buttonBg: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/10",
      badgeBg: "bg-amber-100 text-amber-800 border-amber-300/30",
      features: [
        "Akses penuh fitur Guru & Pembuatan Soal",
        "Unggah Gambar Mandiri dengan mudah",
        "Siswa mengerjakan dengan mode anti-curang",
        "Laporan hasil ujian instan (Excel)",
      ],
      icon: <Star className="w-5 h-5 text-amber-500 animate-bounce" />
    },
    {
      id: "slide-2",
      title: "Paket Perak",
      duration: "3 BULAN",
      tagline: "Sahabat setia ujian sepanjang semester sekolah 💖",
      originalPrice: "Rp 150.000",
      promoPrice: "Rp 50.000",
      discount: "HEMAT 66% (TERKOMPLIT)",
      accentColor: "indigo",
      gradientBg: "from-indigo-100 to-violet-100/70",
      borderColor: "border-indigo-300",
      textColor: "text-indigo-700",
      buttonBg: "bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-md shadow-indigo-500/20",
      badgeBg: "bg-indigo-100 text-indigo-800 border-indigo-300/30",
      features: [
        "Semua fitur lengkap Paket Perunggu",
        "Prioritas akses server super stabil",
        "Analisis kompetensi otomatis & cepat",
        "Backup data ujian otomatis ke cloud",
      ],
      isPopular: true,
      icon: <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
    },
    {
      id: "slide-3",
      title: "Paket Emas",
      duration: "1 TAHUN",
      tagline: "Kelola evaluasi sepanjang tahun dengan senyuman 👑",
      originalPrice: "Rp 600.000",
      promoPrice: "Rp 200.000",
      discount: "DISKON 66% (TERHEMAT)",
      accentColor: "emerald",
      gradientBg: "from-emerald-100 to-teal-100/70",
      borderColor: "border-emerald-300",
      textColor: "text-emerald-700",
      buttonBg: "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-500/10",
      badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300/30",
      features: [
        "Semua fitur Paket Perak & Perunggu",
        "Akses Multi-Tenant Sekolah tanpa batas",
        "Kapasitas bank soal 10.000+ item",
        "Pendampingan & Support VIP 24/7",
      ],
      icon: <Crown className="w-5 h-5 text-emerald-600" />
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      setCurrentSlide(0); // Loop back
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    } else {
      setCurrentSlide(slides.length - 1); // Loop to end
    }
  };

  // Touch Swipe Handlers for native mobile feel
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diffX = touchStartX.current - touchEndX.current;
    const threshold = 50; // swipe minimum distance in pixels
    if (diffX > threshold) {
      handleNext();
    } else if (diffX < -threshold) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const activeSlide = slides[currentSlide];

  return (
    <div 
      className="fixed inset-0 w-full h-[100dvh] bg-gradient-to-b from-amber-50 via-sky-50 to-emerald-100 text-slate-800 z-50 overflow-hidden flex flex-col justify-between font-sans select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dynamic Glowing Accents */}
      <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[40%] rounded-full bg-amber-300/30 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[40%] rounded-full bg-emerald-300/30 blur-[100px] pointer-events-none" />
      <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] rounded-full bg-sky-300/20 blur-[120px] pointer-events-none" />

      {/* Header - Compact, Bright & Beautiful */}
      <header className="w-full flex items-center justify-between px-5 py-3 border-b border-slate-200/60 backdrop-blur-md bg-white/75 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white border border-slate-100 rounded-xl overflow-hidden flex items-center justify-center shadow-xs">
            <img 
              src="/logo.png" 
              alt="Eco Smart Exam Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <span className="font-extrabold text-xs uppercase tracking-tight text-slate-800 block leading-none">
              ECO SMART EXAM
            </span>
            <span className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider block mt-1">
              ✨ Portal Berlangganan Ceria
            </span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-[11px] text-slate-600 hover:text-slate-900 font-extrabold bg-amber-100/90 hover:bg-amber-100 px-3.5 py-1.5 rounded-full border border-amber-200 transition-all cursor-pointer shadow-xs flex items-center gap-1"
        >
          <Smile className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
          <span>Lewati</span>
        </button>
      </header>

      {/* Main Body Stage - Exactly constrained to avoid scroll */}
      <div className="flex-1 flex flex-col justify-center px-4 py-2 max-w-lg mx-auto w-full min-h-0 relative z-10">
        
        {/* Title area - Highly compact */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 text-amber-800 text-[9px] font-black uppercase tracking-wider shadow-xs">
            <Sparkles className="w-3 h-3 text-amber-500 animate-bounce" />
            <span>PROMO SPESIAL RAMAH & MUDAH</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 uppercase mt-1">
            Ujian Kreatif, Hemat Kertas 🌸
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-500 font-semibold mt-0.5 leading-tight">
            Pilih paket terbaik sekolah untuk kelancaran ujian dengan penuh kebahagiaan!
          </p>
        </div>

        {/* Tab Selector - Quick package switcher so ALL packages are immediately visible */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/70 border border-slate-200/50 rounded-2xl mb-3 shadow-xs">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => setCurrentSlide(idx)}
              className={`py-2 px-1 rounded-xl font-extrabold text-[10px] sm:text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                currentSlide === idx 
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm" 
                  : "text-slate-500 hover:bg-white/80"
              }`}
            >
              <span className="uppercase tracking-wide">{slide.title.replace("Paket ", "")}</span>
              <span className="text-[8px] opacity-90 font-bold">{slide.duration}</span>
            </button>
          ))}
        </div>

        {/* Swipe Card Holder */}
        <div className="relative flex-1 flex flex-col justify-center min-h-0">
          
          {/* Card Left Arrow */}
          <button 
            onClick={handlePrev}
            className="absolute left-[-16px] z-20 bg-white/95 hover:bg-white text-slate-700 w-8 h-8 rounded-full border border-slate-200 shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
            aria-label="Previous package"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Active Compact Slide Card */}
          <div 
            className={`w-full bg-white rounded-3xl border-2 ${activeSlide.isPopular ? "border-indigo-400 shadow-lg shadow-indigo-100" : "border-slate-100 shadow-md"} p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden`}
          >
            {/* Soft decorative background glow inside card */}
            <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${activeSlide.gradientBg} opacity-50 pointer-events-none`} />

            {/* Popular ribbon */}
            {activeSlide.isPopular && (
              <div className="absolute top-2 right-3 bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-[8px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider shadow-xs flex items-center gap-0.5">
                <Flame className="w-3 h-3 text-white animate-pulse" />
                <span>TERLARIS</span>
              </div>
            )}

            <div className="relative z-10">
              {/* Card top badge */}
              <div className="flex items-center gap-1.5 mb-2">
                <div className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border tracking-wide flex items-center gap-1 ${activeSlide.badgeBg}`}>
                  {activeSlide.icon}
                  <span>{activeSlide.title}</span>
                </div>
                <span className="text-[9px] text-slate-500 font-black bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/40">
                  {activeSlide.duration}
                </span>
              </div>

              {/* Tagline */}
              <p className="text-xs text-slate-600 font-extrabold leading-tight mb-3">
                {activeSlide.tagline}
              </p>

              {/* Cheerful Price Section */}
              <div className="bg-slate-50/90 border border-slate-100 p-3 rounded-2xl mb-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Harga Normal:</span>
                  <span className="text-xs text-slate-400 line-through font-bold">
                    {activeSlide.originalPrice}
                  </span>
                </div>
                
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-2xl sm:text-3xl font-black tracking-tight ${activeSlide.textColor}`}>
                    {activeSlide.promoPrice}
                  </span>
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                    / {activeSlide.duration}
                  </span>
                </div>

                <div className="mt-1">
                  <span className="inline-block text-[8px] font-black bg-rose-100 text-rose-600 border border-rose-200/50 px-2.5 py-0.5 rounded-full tracking-wider uppercase animate-pulse">
                    {activeSlide.discount}
                  </span>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Keuntungan Fitur:
                </p>
                {activeSlide.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-600">
                    <div className="bg-emerald-100 text-emerald-600 p-0.5 rounded-full mt-0.5 border border-emerald-200/30 shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span className="font-bold leading-tight">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Checkout Button */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 relative z-10">
              <a
                href={`https://wa.me/6285755735676?text=Halo%20SmartUjian,%20saya%20tertarik%20ingin%20berlangganan%20*${encodeURIComponent(activeSlide.title)}*%20(${activeSlide.duration})%20dengan%20promo%20harga%20*${activeSlide.promoPrice}*`}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 ${activeSlide.buttonBg} font-black text-xs rounded-xl shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer text-center uppercase tracking-wide`}
              >
                <MessageSquare className="w-3.5 h-3.5 fill-current" />
                <span>Langganan {activeSlide.title}</span>
              </a>
            </div>

          </div>

          {/* Card Right Arrow */}
          <button 
            onClick={handleNext}
            className="absolute right-[-16px] z-20 bg-white/95 hover:bg-white text-slate-700 w-8 h-8 rounded-full border border-slate-200 shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
            aria-label="Next package"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

        </div>

      </div>

      {/* Footer Navigation & Visual Hints */}
      <footer className="w-full bg-white/90 border-t border-slate-200/60 py-3.5 px-6 relative z-10 shadow-lg flex flex-col items-center gap-2">
        {/* Swiping gesture indicator & progress dots */}
        <div className="flex items-center gap-1.5 text-[9px] text-emerald-700 font-black uppercase tracking-wider bg-emerald-100/70 px-3 py-1 rounded-full border border-emerald-200/30 shadow-xs">
          <span>Tinggal geser kiri-kanan</span>
          <Smile className="w-3.5 h-3.5 text-amber-500" />
        </div>

        {/* Navigation indicator dots */}
        <div className="flex items-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                currentSlide === idx ? "w-7 bg-emerald-500" : "w-2 bg-slate-200 hover:bg-slate-300"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Back and Forward buttons */}
        <div className="w-full max-w-sm flex items-center justify-between gap-3 mt-1">
          <button
            onClick={handlePrev}
            className="flex-1 flex items-center justify-center gap-1 text-[11px] font-extrabold py-2 px-3 rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-all cursor-pointer uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Sebelumnya</span>
          </button>

          <button
            onClick={handleNext}
            className="flex-1 flex items-center justify-center gap-1 text-[11px] font-black py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-sm cursor-pointer uppercase tracking-wider"
          >
            <span>{currentSlide === slides.length - 1 ? "Masuk Portal" : "Selanjutnya"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
