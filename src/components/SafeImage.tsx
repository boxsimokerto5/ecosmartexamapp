import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Image as ImageIcon, Loader2, AlertCircle } from "lucide-react";

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackText?: string;
}

export default function SafeImage({
  src,
  alt,
  className = "",
  containerClassName = "",
  fallbackText = "Gagal memuat gambar"
}: SafeImageProps) {
  const [loading, setLoading] = useState(src ? true : false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Synchronously reset state during render phase if the source changes
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setLoading(src ? true : false);
    setError(false);
  }

  // Handle retry
  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRetryCount(prev => prev + 1);
    setLoading(true);
    setError(false);
  };

  // Add a robust client-side timeout for image loading
  useEffect(() => {
    if (!src || !loading) return;

    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError(true);
        console.warn(`SafeImage: Loading timed out after 8s for ${src}`);
      }
    }, 8000); // 8 seconds timeout

    return () => clearTimeout(timer);
  }, [src, loading, retryCount]);

  // Proxy external images (especially ImgBB which is blocked by Indonesian ISPs like Telkomsel/IndiHome)
  // we use https://wsrv.nl/ which is a fast, reliable, open-source image proxy on Cloudflare.
  const getProxyUrl = (originalUrl: string) => {
    if (!originalUrl) return "";
    if (originalUrl.startsWith("http://") || originalUrl.startsWith("https://")) {
      if (originalUrl.includes("localhost") || originalUrl.includes("127.0.0.1") || originalUrl.includes("wsrv.nl")) {
        return originalUrl;
      }
      // Blocked image sharing domains in Indonesia
      const isImageHosting = /ibb\.co|imgur\.com|postimg|pixabay|unsplash|imageshack/i.test(originalUrl);
      if (isImageHosting) {
        const cleanUrl = originalUrl.replace(/^https?:\/\//, "");
        return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&retry=${retryCount}`;
      }
    }
    return originalUrl;
  };

  const finalSrc = getProxyUrl(src);

  return (
    <div className={`relative overflow-hidden bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center min-h-[140px] w-full ${containerClassName}`}>
      <AnimatePresence mode="wait">
        {/* Loading Spinner & Shimmer Overlay */}
        {loading && !error && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center gap-2.5 z-10"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite] [background-size:200%_100%]" />
            <div className="p-2 bg-indigo-50 rounded-full text-indigo-600 animate-bounce">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase animate-pulse">
              Memuat Gambar...
            </span>
          </motion.div>
        )}

        {/* Error State Overlay */}
        {error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-rose-50/75 flex flex-col items-center justify-center p-4 text-center gap-2 z-10"
          >
            <div className="p-1.5 bg-rose-100 rounded-full text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-[11px] font-bold text-rose-800 line-clamp-1">{fallbackText}</p>
            <p className="text-[9px] text-slate-500 leading-relaxed max-w-[200px] line-clamp-2">
              Koneksi diblokir atau URL gambar tidak valid.
            </p>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={handleRetry}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 text-[10px] font-bold rounded-md shadow-3xs cursor-pointer transition-all"
              >
                Coba Lagi
              </button>
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-md shadow-3xs cursor-pointer transition-all flex items-center"
              >
                Buka Tautan
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Actual Image */}
      {src ? (
        <motion.img
          src={finalSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          className={`w-full h-full object-contain max-h-56 ${className} ${
            loading ? "opacity-0 scale-95" : "opacity-100 scale-100"
          } transition-all duration-300 ease-out`}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 text-slate-400 p-4">
          <ImageIcon className="w-8 h-8 opacity-40 stroke-1" />
          <span className="text-[10px] font-medium">Tidak ada gambar</span>
        </div>
      )}
    </div>
  );
}
