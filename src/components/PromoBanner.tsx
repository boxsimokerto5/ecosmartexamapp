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
  Compass,
  Smile
} from "lucide-react";

interface PromoBannerProps {
  onClose: () => void;
}

export default function PromoBanner({ onClose }: PromoBannerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const slides = [
    {
      id: "slide-1",
      title: "Paket Perunggu",
      duration: "1 BULAN",
      tagline: "Langkah awal ceria untuk ujian kelas bulanan",
      originalPrice: "Rp 50.000",
      promoPrice: "Rp 20.000",
      discount: "HEMAT 60%",
      accentColor: "amber",
      gradientFrom: "from-amber-100/60",
      gradientTo: "to-orange-100/40",
      borderColor: "border-amber-200",
      textColor: "text-amber-600",
      buttonBg: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/10",
      badgeBg: "bg-amber-100/80 text-amber-800 border-amber-200/40",
      features: [
        "Akses penuh fitur Guru & Pembuatan Soal",
        "Unggah Gambar Mandiri dengan mudah",
        "Siswa mengerjakan dengan mode anti-curang",
        "Laporan hasil ujian instan (Format Excel)",
      ],
      badgeIcon: <Star className="w-4 h-4 text-amber-500" />
    },
    {
      id: "slide-2",
      title: "Paket Perak",
      duration: "3 BULAN",
      tagline: "Sahabat setia ujian sepanjang semester sekolah",
      originalPrice: "Rp 150.000",
      promoPrice: "Rp 50.000",
      discount: "HEMAT 66% (TERKOMPLIT)",
      accentColor: "indigo",
      gradientFrom: "from-indigo-100/60",
      gradientTo: "to-violet-100/40",
      borderColor: "border-indigo-200",
      textColor: "text-indigo-600",
      buttonBg: "bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-md shadow-indigo-500/10",
      badgeBg: "bg-indigo-100/80 text-indigo-800 border-indigo-200/40",
      features: [
        "Semua fitur lengkap Paket Perunggu",
        "Prioritas akses server ujian super stabil",
        "Analisis kompetensi otomatis & cepat",
        "Backup data ujian otomatis ke cloud",
      ],
      isPopular: true,
      badgeIcon: <Flame className="w-4 h-4 text-indigo-500 animate-pulse" />
    },
    {
      id: "slide-3",
      title: "Paket Emas",
      duration: "1 TAHUN",
      tagline: "Kelola evaluasi sepanjang tahun dengan senyuman",
      originalPrice: "Rp 600.000",
      promoPrice: "Rp 200.000",
      discount: "DISKON 66% (PALING HEMAT)",
      accentColor: "emerald",
      gradientFrom: "from-emerald-100/60",
      gradientTo: "to-teal-100/40",
      borderColor: "border-emerald-200",
      textColor: "text-emerald-600",
      buttonBg: "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-500/10",
      badgeBg: "bg-emerald-100/80 text-emerald-800 border-emerald-200/40",
      features: [
        "Semua fitur Paket Perak & Perunggu",
        "Akses Multi-Tenant Sekolah tanpa batas",
        "Kapasitas bank soal hingga 10,000+ item",
        "Pendampingan & Support VIP 24/7",
      ],
      badgeIcon: <Crown className="w-4 h-4 text-emerald-500" />
    }
  ];

  const handleScroll = () => {
    if (carouselRef.current) {
      const scrollLeft = carouselRef.current.scrollLeft;
      const width = carouselRef.current.clientWidth;
      if (width > 0) {
        const newIndex = Math.round(scrollLeft / width);
        if (newIndex !== currentSlide && newIndex >= 0 && newIndex < slides.length) {
          setCurrentSlide(newIndex);
        }
      }
    }
  };

  const scrollToSlide = (index: number) => {
    if (carouselRef.current) {
      const width = carouselRef.current.clientWidth;
      carouselRef.current.scrollTo({
        left: index * width,
        behavior: "smooth"
      });
      setCurrentSlide(index);
    }
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      scrollToSlide(currentSlide + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      scrollToSlide(currentSlide - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-amber-50 via-emerald-50/60 to-sky-100 text-slate-800 z-50 overflow-y-auto select-none flex flex-col justify-between font-sans">
      
      {/* Playful Colorful Warm Glow Spots */}
      <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] rounded-full bg-amber-400/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[45%] h-[45%] rounded-full bg-emerald-400/25 blur-[100px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[35%] h-[35%] rounded-full bg-sky-400/20 blur-[90px] pointer-events-none" />

      {/* Header - Light, Translucent & Clean */}
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-200/50 backdrop-blur-md bg-white/70 sticky top-0 z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl overflow-hidden flex items-center justify-center shadow-xs">
            <img 
              src="/logo.png" 
              alt="Eco Smart Exam Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <span className="font-black text-sm uppercase tracking-tight text-slate-800 block leading-tight">
              ECO SMART EXAM
            </span>
            <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider block mt-0.5">
              Portal Berlangganan Premium
            </span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-slate-800 font-bold bg-white/90 hover:bg-white px-4 py-2 rounded-full border border-slate-200 transition-all cursor-pointer shadow-xs flex items-center gap-1"
        >
          <Smile className="w-4 h-4 text-amber-500" />
          <span>Lewati</span>
        </button>
      </header>

      {/* Hero Welcome Text */}
      <div className="text-center px-6 pt-8 pb-3 max-w-2xl mx-auto relative z-10">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 border border-amber-200/60 text-amber-800 text-[10px] font-black uppercase tracking-widest mb-3.5 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
          <span>PROMO SPESIAL CERIA & RAMAH</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-800 uppercase leading-none">
          Mari Tumbuh Bersama!
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-2.5 max-w-lg mx-auto leading-relaxed">
          Pilih paket berlangganan ramah kantong untuk menghadirkan ujian digital ramah lingkungan tanpa kertas di sekolah Anda. 🌸
        </p>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center py-4 relative z-10">
        <div className="w-full max-w-6xl mx-auto px-4 md:px-6">
          
          {/* Mobile Swipe Info */}
          <div className="md:hidden flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-black uppercase tracking-wider mb-4 bg-emerald-100/80 w-fit mx-auto px-3.5 py-1.5 rounded-full border border-emerald-200/50 shadow-xs">
            <Compass className="w-3.5 h-3.5 text-emerald-600 animate-spin-slow" />
            <span>Geser kartu untuk melihat paket</span>
          </div>

          {/* Cards Loop */}
          <div 
            ref={carouselRef}
            onScroll={handleScroll}
            className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-none pb-6 px-2 md:px-0 scroll-smooth touch-pan-x"
          >
            {slides.map((slide, index) => {
              const isSelected = currentSlide === index;
              return (
                <div 
                  key={slide.id}
                  className="w-[85vw] sm:w-[380px] md:w-full shrink-0 snap-center transition-all duration-350 transform md:hover:-translate-y-2 flex flex-col"
                >
                  {/* Card Container */}
                  <div className={`relative flex-1 bg-white/95 backdrop-blur-md rounded-3xl border-2 ${slide.isPopular ? "border-indigo-400 shadow-xl shadow-indigo-100/50" : "border-slate-100 shadow-lg shadow-slate-100/50"} p-6 flex flex-col justify-between overflow-hidden`}>
                    
                    {/* Dynamic soft background gradient overlay */}
                    <div className={`absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${slide.gradientFrom} ${slide.gradientTo} opacity-60 pointer-events-none`} />
                    
                    {/* Popular / Best Choice Badge */}
                    {slide.isPopular && (
                      <div className="absolute -top-px right-6 transform -translate-y-1/2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-wider shadow-md flex items-center gap-1 animate-pulse">
                        <Flame className="w-3.5 h-3.5 text-white" />
                        <span>PAKET PALING DICINTAI</span>
                      </div>
                    )}

                    <div>
                      {/* Package Head */}
                      <div className="flex items-center justify-between mb-5 relative z-10">
                        <div className={`text-[11px] font-black uppercase px-3 py-1 rounded-full border tracking-wider flex items-center gap-1.5 ${slide.badgeBg}`}>
                          {slide.badgeIcon}
                          <span>{slide.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-extrabold tracking-wider bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200/50">
                          {slide.duration}
                        </span>
                      </div>

                      {/* Package Title & Description */}
                      <div className="relative z-10 mb-4">
                        <h3 className="text-xl sm:text-2.5xl font-black tracking-tight text-slate-800 uppercase">
                          {slide.title}
                        </h3>
                        <p className="text-xs text-slate-500 font-semibold mt-1">
                          {slide.tagline}
                        </p>
                      </div>

                      {/* Cheerful Price Box */}
                      <div className="bg-slate-50/80 border border-slate-100 p-4.5 rounded-2xl mb-6 text-center relative z-10">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Normal:</span>
                          <span className="text-xs text-slate-400 line-through font-bold tracking-wider">
                            {slide.originalPrice}
                          </span>
                        </div>
                        
                        <div className="flex flex-col items-center">
                          <div className="flex items-baseline gap-1 justify-center">
                            <span className={`text-3xl sm:text-3.5xl font-black tracking-tight ${slide.textColor}`}>
                              {slide.promoPrice}
                            </span>
                            <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest ml-1">
                              / {slide.duration}
                            </span>
                          </div>
                          
                          <span className="mt-2.5 inline-block text-[9px] font-black bg-rose-100 text-rose-600 border border-rose-200/60 px-3.5 py-1 rounded-full tracking-widest uppercase">
                            {slide.discount}
                          </span>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="space-y-3 mb-2 relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Fitur Terbaik Untukmu:
                        </p>
                        {slide.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600">
                            <div className="bg-emerald-100 text-emerald-600 p-0.5 rounded-full mt-0.5 border border-emerald-200/50 shrink-0">
                              <Check className="w-3 h-3" />
                            </div>
                            <span className="font-semibold leading-relaxed">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order Button (WhatsApp) */}
                    <div className="mt-8 pt-5 border-t border-slate-100 relative z-10">
                      <a
                        href={`https://wa.me/6285755735676?text=Halo%20SmartUjian,%20saya%20tertarik%20ingin%20berlangganan%20*${encodeURIComponent(slide.title)}*%20(${slide.duration})%20dengan%20promo%20harga%20*${slide.promoPrice}*`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 ${slide.buttonBg} font-black text-xs rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-center uppercase tracking-wider`}
                      >
                        <MessageSquare className="w-4 h-4 fill-current" />
                        <span>Langganan {slide.title}</span>
                      </a>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Swipe Indicators and Mobile Controls - Light and Cheerful */}
      <div className="w-full bg-white/90 border-t border-slate-200/50 py-5 px-6 sticky bottom-0 z-10 shadow-md">
        <div className="max-w-md mx-auto flex flex-col items-center gap-4">
          
          {/* Dots */}
          <div className="flex items-center gap-2.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => scrollToSlide(idx)}
                className={`h-2.5 rounded-full transition-all duration-350 cursor-pointer ${
                  currentSlide === idx ? "w-8 bg-emerald-500" : "w-2.5 bg-slate-200 hover:bg-slate-300"
                }`}
                aria-label={`Go to page ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="w-full flex items-center justify-between gap-4">
            <button
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className={`flex items-center gap-1.5 text-xs font-bold px-4 py-3 rounded-xl border uppercase tracking-wider transition-all cursor-pointer ${
                currentSlide === 0
                  ? "border-slate-100 text-slate-300 cursor-not-allowed opacity-40"
                  : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 text-xs font-black px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-md shadow-emerald-500/10 cursor-pointer uppercase tracking-wider"
            >
              <span>{currentSlide === slides.length - 1 ? "Masuk Portal" : "Selanjutnya"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
