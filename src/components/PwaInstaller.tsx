import React, { useState, useEffect } from "react";
import { Download, Smartphone, Laptop, X, Share, Info, Check, ArrowDown, HelpCircle, Sparkles, AlertCircle, ExternalLink } from "lucide-react";

export default function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | "other">("other");
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Detect if app is currently running in an iframe (e.g., AI Studio preview panel)
    setIsInIframe(window.self !== window.top);

    // Detect if app is already running in standalone mode (PWA/Installed)
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone || 
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
      
      // If already installed, hide the banner
      if (isStandaloneMode) {
        setShowBanner(false);
      }
    };

    checkStandalone();

    // Detect Platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform("ios");
    } else if (/android/.test(userAgent)) {
      setPlatform("android");
    } else if (/macintosh|windows|linux/.test(userAgent)) {
      setPlatform("desktop");
    }

    // We removed the sessionStorage check so it will always prompt the user on every fresh load if not installed.
    setShowBanner(true);

    // Check if the prompt was already captured by index.html early script
    if ((window as any).deferredSDKPrompt) {
      setDeferredPrompt((window as any).deferredSDKPrompt);
      setIsInstallable(true);
    }

    // Capture standard PWA installation prompt if it fires now
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredSDKPrompt = e;
      setIsInstallable(true);
    };

    // Custom listener for the early script
    const handleCustomPromptEvent = (e: any) => {
      if (e.detail) {
        setDeferredPrompt(e.detail);
        setIsInstallable(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("pwa-prompt-available", handleCustomPromptEvent);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("pwa-prompt-available", handleCustomPromptEvent);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isInIframe) {
      // Open in a new tab where standard PWA browser permissions are not sandboxed
      window.open(window.location.origin, "_blank");
      return;
    }

    const activePrompt = deferredPrompt || (window as any).deferredSDKPrompt;
    
    if (activePrompt) {
      try {
        activePrompt.prompt();
        const { outcome } = await activePrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          (window as any).deferredSDKPrompt = null;
          setIsInstallable(false);
          setShowBanner(false);
        }
      } catch (err) {
        console.error("Gagal memicu instalasi otomatis:", err);
        setShowInstructions(true);
      }
    } else {
      // No native prompt available (e.g. on iOS, WebView, or user engagement not met yet)
      setShowInstructions(true);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    sessionStorage.setItem("pwa_install_dismissed", "true");
  };

  // If already installed, don't show anything
  if (isStandalone || !showBanner) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom/Top PWA Banner */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-white border border-slate-200 shadow-xl rounded-3xl p-4 z-40 animate-fadeIn select-none">
        <div className="flex items-start gap-3">
          {/* Logo PWA */}
          <div className="w-11 h-11 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5 shadow-xs relative">
            <img 
              src="/logo.svg" 
              alt="Logo" 
              className="w-7 h-7 object-contain rounded-md crisp-image"
              referrerPolicy="no-referrer"
            />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white shadow-xs"></span>
            </span>
          </div>

          {/* Info Text */}
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                Eco Smart Exam App
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-indigo-50 border border-indigo-100/50 rounded-full text-[8px] font-black text-indigo-600">
                <Sparkles className="w-2 h-2" />
                <span>{isInIframe ? "Instalasi Cepat" : "Ringan"}</span>
              </span>
            </div>
            <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm tracking-tight mt-0.5">
              Pasang Aplikasi di Layar HP / PC
            </h4>
            <p className="text-[10px] sm:text-xs text-slate-500 leading-tight mt-1">
              {isInIframe 
                ? "Klik di bawah untuk membuka di tab baru & mengaktifkan tombol instalasi instan!" 
                : "Akses cepat tanpa browser, menghemat kuota, dan mencegah gangguan saat ujian!"}
            </p>
          </div>

          {/* Dismiss Button */}
          <button 
            onClick={dismissBanner}
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full transition-all cursor-pointer"
            aria-label="Tutup banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-3.5 pt-3.5 border-t border-slate-100">
          <button
            onClick={() => setShowInstructions(true)}
            className="flex-1 inline-flex items-center justify-center gap-1 py-2 px-3 text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border border-slate-200/60"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Cara Pasang</span>
          </button>

          <button
            onClick={handleInstallClick}
            className="flex-1 inline-flex items-center justify-center gap-1 py-2 px-3 text-[11px] font-black text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer text-center"
          >
            {isInIframe ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            <span>{isInIframe ? "Buka & Pasang" : "Pasang Sekarang"}</span>
          </button>
        </div>
      </div>

      {/* Manual Installation Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn select-none">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-tr from-emerald-600 to-indigo-700 p-5 text-white flex items-center justify-between relative shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-emerald-100" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">Panduan Instalasi</h3>
                  <p className="text-[10px] text-emerald-100/90 font-medium">Langkah mudah pasang aplikasi di HP/PC Anda</p>
                </div>
              </div>
              <button 
                onClick={() => setShowInstructions(false)}
                className="bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-full transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              
              {/* General Info */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-[11px] sm:text-xs text-amber-800 leading-relaxed flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Aplikasi ini dirancang sebagai <strong>PWA (Progressive Web App)</strong>. Anda bisa langsung menambahkannya ke layar utama perangkat Anda tanpa perlu mengunduh dari Play Store / App Store.
                </span>
              </div>

              {/* IOS / Apple Safari Guide */}
              {(platform === "ios" || platform === "other") && (
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    <span>Panduan iPhone &amp; iPad (Safari)</span>
                  </h4>
                  <ol className="text-xs text-slate-600 space-y-2.5 list-none pl-0">
                    <li className="flex gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-bold">
                      <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-[10px] shrink-0">1</span>
                      <span className="leading-tight">Buka web ini menggunakan browser bawaan <strong className="text-slate-800">Safari</strong>.</span>
                    </li>
                    <li className="flex gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-bold">
                      <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-[10px] shrink-0">2</span>
                      <span className="leading-tight flex items-center gap-1 flex-wrap">
                        Klik tombol <strong>Bagikan / Share</strong> 
                        <span className="inline-flex p-1 bg-white rounded-md border border-slate-200 shrink-0">
                          <Share className="w-3.5 h-3.5 text-blue-500" />
                        </span>
                        di bagian bawah layar.
                      </span>
                    </li>
                    <li className="flex gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-bold">
                      <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-[10px] shrink-0">3</span>
                      <span className="leading-tight">Gulir ke bawah, lalu pilih menu <strong className="text-slate-800">Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</span>
                    </li>
                    <li className="flex gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-bold">
                      <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-[10px] shrink-0">4</span>
                      <span className="leading-tight">Klik <strong className="text-slate-800">Tambah / Add</strong> di pojok kanan atas. Aplikasi siap digunakan!</span>
                    </li>
                  </ol>
                </div>
              )}

              {/* Android Chrome Guide */}
              {(platform === "android" || platform === "other") && (
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    <span>Panduan HP Android (Chrome/Edge)</span>
                  </h4>
                  <ol className="text-xs text-slate-600 space-y-2.5 list-none pl-0">
                    <li className="flex gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-bold">
                      <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[10px] shrink-0">1</span>
                      <span className="leading-tight">Ketuk tombol <strong className="text-slate-800">"Pasang Sekarang"</strong> pada kotak dialog di layar Anda.</span>
                    </li>
                    <li className="flex gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-bold">
                      <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[10px] shrink-0">2</span>
                      <span className="leading-tight">Jika tombol tidak merespon, ketuk <strong className="text-slate-800">Ikon Tiga Titik</strong> di pojok kanan atas browser Google Chrome.</span>
                    </li>
                    <li className="flex gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-bold">
                      <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[10px] shrink-0">3</span>
                      <span className="leading-tight">Pilih menu <strong className="text-slate-800">"Instal Aplikasi"</strong> atau <strong className="text-slate-800">"Tambahkan ke Layar Utama"</strong>.</span>
                    </li>
                  </ol>
                </div>
              )}

              {/* Laptop & PC Guide */}
              {(platform === "desktop" || platform === "other") && (
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Laptop className="w-4 h-4" />
                    <span>Panduan Laptop &amp; Komputer (PC)</span>
                  </h4>
                  <ol className="text-xs text-slate-600 space-y-2.5 list-none pl-0">
                    <li className="flex gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-bold">
                      <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-[10px] shrink-0">1</span>
                      <span className="leading-tight">Di browser Chrome/Edge, lihat ke bagian kanan kolom alamat URL (Address Bar).</span>
                    </li>
                    <li className="flex gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-bold">
                      <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-[10px] shrink-0">2</span>
                      <span className="leading-tight flex items-center gap-1.5 flex-wrap">
                        Klik ikon <strong className="text-slate-800">Instal / Unduh</strong> 
                        <span className="inline-flex p-1 bg-white rounded-md border border-slate-200 shrink-0">
                          <Download className="w-3.5 h-3.5 text-indigo-600" />
                        </span>
                        yang muncul di address bar.
                      </span>
                    </li>
                    <li className="flex gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-bold">
                      <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-[10px] shrink-0">3</span>
                      <span className="leading-tight">Klik tombol <strong className="text-slate-800">"Pasang / Install"</strong> pada pop-up konfirmasi yang muncul.</span>
                    </li>
                  </ol>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 text-center shrink-0">
              <button
                onClick={() => setShowInstructions(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-xl transition-all cursor-pointer uppercase tracking-wider"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
