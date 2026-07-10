import React, { useState } from "react";
import { Exam, Result } from "../types";
import { X, FileText, RefreshCw, Eye, Search, Award, Users, BookOpen, Clock } from "lucide-react";
import { generateStudentExamPDF } from "../lib/printStudentExamPdf";
import { motion } from "motion/react";

interface ExamHistoryModalProps {
  exam: Exam;
  results: Result[];
  onClose: () => void;
  onRerelease: (resultId: string) => void;
  onViewDetails: (result: Result) => void;
}

export default function ExamHistoryModal({ exam, results, onClose, onRerelease, onViewDetails }: ExamHistoryModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter results for this exam only
  const examResults = results.filter(r => r.examId === exam.id);

  // Filter with search query
  const filteredExamResults = examResults.filter(r => 
    r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.studentClass.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.studentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats calculation
  const finishedResults = examResults.filter(r => r.status === "submitted");
  const totalFinished = finishedResults.length;
  
  const averageScore = totalFinished > 0 
    ? Math.round(finishedResults.reduce((acc, curr) => acc + curr.score, 0) / totalFinished) 
    : 0;

  const highestScore = totalFinished > 0 
    ? Math.max(...finishedResults.map(r => r.score)) 
    : 0;

  const lowestScore = totalFinished > 0 
    ? Math.min(...finishedResults.map(r => r.score)) 
    : 0;

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" id="exam-history-modal">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Wrapper */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-950 text-white px-6 py-5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                Histori Pengerjaan Paket Soal
              </span>
              <h3 className="text-lg font-bold leading-tight">{exam.title}</h3>
              <p className="text-xs text-slate-300 line-clamp-1">{exam.description || "Tidak ada deskripsi."}</p>
            </div>
            <button 
              id="btn-close-history-modal"
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Quick stats panel */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500 text-white rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Selesai</div>
                  <div className="text-xl font-extrabold text-indigo-950">{totalFinished} Siswa</div>
                </div>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100/50 p-4 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500 text-white rounded-lg">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Rata-Rata</div>
                  <div className="text-xl font-extrabold text-emerald-950">{averageScore} / 100</div>
                </div>
              </div>

              <div className="bg-sky-50/50 border border-sky-100/50 p-4 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-sky-500 text-white rounded-lg">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-sky-500 uppercase tracking-wider">Tertinggi</div>
                  <div className="text-xl font-extrabold text-sky-950">{highestScore}</div>
                </div>
              </div>

              <div className="bg-rose-50/50 border border-rose-100/50 p-4 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-rose-500 text-white rounded-lg">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Terendah</div>
                  <div className="text-xl font-extrabold text-rose-950">{lowestScore}</div>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama siswa, kelas, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
                />
              </div>
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider self-end sm:self-center">
                Menampilkan {filteredExamResults.length} dari {examResults.length} riwayat
              </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-[9px] font-bold tracking-wider">
                      <th className="py-3 px-5">Nama Siswa</th>
                      <th className="py-3 px-5">ID Siswa</th>
                      <th className="py-3 px-5 text-center">Kelas</th>
                      <th className="py-3 px-5 text-center">Status</th>
                      <th className="py-3 px-5 text-center">Skor</th>
                      <th className="py-3 px-5 text-center">Benar/Total</th>
                      <th className="py-3 px-5 text-center">Durasi</th>
                      <th className="py-3 px-5">Waktu Selesai</th>
                      <th className="py-3 px-5 text-center">Aksi / Cetak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                    {filteredExamResults.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-400 italic font-medium">
                          Tidak ada riwayat siswa yang ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filteredExamResults.map((res) => {
                        const isSubmitted = res.status === "submitted";
                        return (
                          <tr key={res.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5 px-5 font-bold text-slate-900">{res.studentName}</td>
                            <td className="py-3.5 px-5 font-mono text-slate-500">{res.studentId}</td>
                            <td className="py-3.5 px-5 text-center font-semibold text-slate-600">{res.studentClass}</td>
                            <td className="py-3.5 px-5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                isSubmitted 
                                  ? "bg-indigo-50 text-indigo-600" 
                                  : "bg-emerald-50 text-emerald-600 animate-pulse"
                              }`}>
                                {isSubmitted ? "Selesai" : "Mengerjakan"}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-center font-bold text-sm">
                              {isSubmitted ? (
                                <span className={res.score >= 70 ? "text-emerald-600" : "text-rose-500"}>
                                  {res.score}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-center font-mono text-slate-500">
                              {isSubmitted ? `${res.correctCount} / ${res.totalQuestions}` : "-"}
                            </td>
                            <td className="py-3.5 px-5 text-center font-mono text-slate-500">
                              {formatDuration(res.durationSpent)}
                            </td>
                            <td className="py-3.5 px-5 text-slate-400">
                              {isSubmitted ? new Date(res.submittedAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                              }) : "-"}
                            </td>
                            <td className="py-3.5 px-5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Print PDF Action */}
                                <button
                                  onClick={() => generateStudentExamPDF(res, exam)}
                                  disabled={!isSubmitted}
                                  className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                                    isSubmitted
                                      ? "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100 cursor-pointer shadow-xs"
                                      : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                                  }`}
                                  title={isSubmitted ? "Cetak PDF Hasil Evaluasi Siswa" : "Ujian belum dikumpulkan"}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold">PDF</span>
                                </button>

                                {/* Detail Action */}
                                <button
                                  onClick={() => onViewDetails(res)}
                                  disabled={!isSubmitted}
                                  className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                                    isSubmitted
                                      ? "bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100 cursor-pointer shadow-xs"
                                      : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                                  }`}
                                  title="Lihat Detail Jawaban"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                {/* Rerelease Action */}
                                <button
                                  onClick={() => onRerelease(res.id)}
                                  className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-100 hover:border-rose-100 rounded-lg transition-all cursor-pointer shadow-xs"
                                  title="Rilis Ulang Ujian (Reset)"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Footer Controls */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-end">
            <button
              id="btn-close-history-footer"
              onClick={onClose}
              className="py-2 px-5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
            >
              Tutup Histori
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
