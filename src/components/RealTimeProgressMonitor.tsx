import React, { useState, useEffect } from "react";
import { Result, Exam, SchoolClass } from "../types";
import { 
  Activity, 
  Search, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  BookOpen, 
  Users, 
  TrendingUp, 
  Eye, 
  HelpCircle,
  Filter,
  Check,
  X,
  Play
} from "lucide-react";

interface RealTimeProgressMonitorProps {
  results: Result[];
  exams: Exam[];
  schoolClasses: SchoolClass[];
  onInspectResult?: (result: Result) => void;
}

export default function RealTimeProgressMonitor({
  results,
  exams,
  schoolClasses,
  onInspectResult
}: RealTimeProgressMonitorProps) {
  // Filters
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedExam, setSelectedExam] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Tabs for the monitor sub-sections
  const [monitorSubTab, setMonitorSubTab] = useState<"all" | "active" | "finished">("all");

  // Format time (seconds -> mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Derive status arrays
  const activeTakers = results.filter(r => r.status === "started");
  const finishedSubmissions = results.filter(r => r.status === "submitted");

  // Get matching exam duration for calculating time left
  const getExamDuration = (examId: string) => {
    const matchedExam = exams.find(e => e.id === examId);
    return matchedExam ? matchedExam.duration * 60 : 0; // returns duration in seconds
  };

  // Calculations
  const averageScore = finishedSubmissions.length > 0
    ? Math.round(finishedSubmissions.reduce((sum, r) => sum + r.score, 0) / finishedSubmissions.length)
    : 0;

  const passingSubmissions = finishedSubmissions.filter(r => r.score >= 70);
  const passRate = finishedSubmissions.length > 0
    ? Math.round((passingSubmissions.length / finishedSubmissions.length) * 100)
    : 0;

  // Filtered lists
  const getFilteredResults = (list: Result[]) => {
    return list.filter(r => {
      const matchClass = selectedClass === "all" || r.studentClass === selectedClass;
      const matchExam = selectedExam === "all" || r.examId === selectedExam;
      const matchQuery = !searchQuery.trim() || 
        r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.studentClass.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.examTitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchClass && matchExam && matchQuery;
    });
  };

  const filteredActiveTakers = getFilteredResults(activeTakers);
  const filteredFinishedSubmissions = getFilteredResults(finishedSubmissions);

  // Generate live activity timeline events
  // We can construct a list of "events" by looking at results start times (submittedAt but with status started) 
  // and end times (submittedAt with status submitted)
  interface ActivityEvent {
    id: string;
    studentName: string;
    studentClass: string;
    examTitle: string;
    type: "start" | "submit";
    score?: number;
    timestamp: string;
  }

  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    const events: ActivityEvent[] = [];
    
    results.forEach((r) => {
      if (r.status === "started") {
        events.push({
          id: `start-${r.id}`,
          studentName: r.studentName,
          studentClass: r.studentClass,
          examTitle: r.examTitle,
          type: "start",
          timestamp: r.submittedAt || new Date().toISOString()
        });
      } else if (r.status === "submitted") {
        // We can add both start event (estimated) and finished event
        events.push({
          id: `submit-${r.id}`,
          studentName: r.studentName,
          studentClass: r.studentClass,
          examTitle: r.examTitle,
          type: "submit",
          score: r.score,
          timestamp: r.submittedAt || new Date().toISOString()
        });
      }
    });

    // Sort events by timestamp descending (newest first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setActivityEvents(events.slice(0, 15)); // Keep top 15 events
  }, [results]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. REALTIME HEADER WITH SCANDAR */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden shadow-md">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] md:text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">
                Real-Time Listening Active
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Pusat Pemantauan Ujian Aktif
            </h3>
            <p className="text-xs text-slate-300 max-w-xl">
              Memantau status pengerjaan, jawaban masuk, durasi, dan perolehan skor siswa secara live langsung dari koneksi perangkat siswa.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700 p-3 rounded-xl shrink-0">
            <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-lg">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-xs">
              <div className="text-slate-400 font-medium">Auto-Sync Status</div>
              <div className="font-bold text-emerald-400 font-mono">Setiap 5 Detik Live</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Active Takers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sedang Mengerjakan</div>
            <div className="text-2xl font-black text-indigo-600 mt-1">{activeTakers.length} Siswa</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Siswa aktif di ruang ujian</p>
          </div>
          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
            <Play className="w-5 h-5 fill-indigo-600/10 animate-bounce" />
          </div>
        </div>

        {/* Completed Submissions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selesai Dikirim</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{finishedSubmissions.length} Siswa</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Berhasil mengumpulkan jawaban</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rata-Rata Nilai</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{averageScore} / 100</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Dari seluruh ujian terkumpul</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Pass Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tingkat Kelulusan</div>
            <div className="text-2xl font-black text-sky-600 mt-1">{passRate}%</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Skor diatas KKM (&ge; 70)</p>
          </div>
          <div className="bg-sky-50 p-3 rounded-xl text-sky-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 3. FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Class Filter */}
          <div>
            <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Filter Kelas</label>
            <select
              id="monitor-class-filter"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Semua Kelas</option>
              {schoolClasses.map(sc => (
                <option key={sc.id} value={sc.name}>{sc.name}</option>
              ))}
            </select>
          </div>

          {/* Exam Filter */}
          <div>
            <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Filter Ujian</label>
            <select
              id="monitor-exam-filter"
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Semua Ujian</option>
              {exams.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.title}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            id="monitor-search-input"
            type="text"
            placeholder="Cari nama siswa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
          />
        </div>
      </div>

      {/* 4. WORKSPACE LAYOUT SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Active Live Progress Monitoring */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Section Sub-Tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex gap-2">
              <button
                onClick={() => setMonitorSubTab("all")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  monitorSubTab === "all"
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                Semua Aktivitas
              </button>
              <button
                onClick={() => setMonitorSubTab("active")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  monitorSubTab === "active"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Sedang Ujian ({filteredActiveTakers.length})
              </button>
              <button
                onClick={() => setMonitorSubTab("finished")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  monitorSubTab === "finished"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                Sudah Selesai ({filteredFinishedSubmissions.length})
              </button>
            </div>
            
            <span className="text-[10px] text-slate-400 font-mono font-bold">
              Menampilkan {filteredActiveTakers.length + filteredFinishedSubmissions.length} Data
            </span>
          </div>

          {/* Active Takers Cards Grid */}
          {(monitorSubTab === "all" || monitorSubTab === "active") && (
            <div className="space-y-4">
              {monitorSubTab === "active" && filteredActiveTakers.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-10 text-center text-slate-400">
                  <div className="relative inline-block mb-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                      <Clock className="w-5 h-5" />
                    </span>
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-700 text-sm">Tidak Ada Siswa Mengerjakan Saat Ini</h5>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">Sistem sedang mendengarkan perubahan secara real-time. Ketika siswa memasukkan token proktor dan mulai, mereka akan muncul disini.</p>
                </div>
              )}

              {filteredActiveTakers.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Siswa Sedang Ujian (Real-time Progress)
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredActiveTakers.map((t) => {
                      const questionsAnswered = Object.keys(t.answers || {}).length;
                      const progressPercentage = Math.round((questionsAnswered / (t.totalQuestions || 1)) * 100) || 0;
                      const totalSecondsAllowed = getExamDuration(t.examId);
                      const timeLeft = Math.max(0, totalSecondsAllowed - t.durationSpent);
                      const isTimeOver = timeLeft === 0 && totalSecondsAllowed > 0;

                      return (
                        <div key={t.id} className="bg-white rounded-2xl border border-slate-150 p-5 shadow-xs hover:shadow-sm hover:border-indigo-200 transition-all space-y-4">
                          
                          {/* Student & Exam Info Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">
                                {t.studentClass}
                              </span>
                              <h5 className="font-extrabold text-slate-800 text-sm mt-1 truncate" title={t.studentName}>
                                {t.studentName}
                              </h5>
                              <p className="text-[11px] text-slate-500 truncate" title={t.examTitle}>
                                {t.examTitle}
                              </p>
                            </div>
                            <span className="flex h-2.5 w-2.5 shrink-0 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold">
                              <span className="text-slate-500">Progress Soal:</span>
                              <span className="text-slate-800 font-mono font-bold">
                                {questionsAnswered} / {t.totalQuestions} ({progressPercentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercentage}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Timers & Counters footer */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Berjalan:</span>
                              <span className="text-slate-800 font-mono font-bold">{formatTime(t.durationSpent)}</span>
                            </div>

                            {totalSecondsAllowed > 0 && (
                              <div className="flex items-center gap-1">
                                <span>Sisa Waktu:</span>
                                <span className={`font-mono font-extrabold ${isTimeOver ? "text-rose-500 animate-pulse" : "text-slate-800"}`}>
                                  {isTimeOver ? "Waktu Habis!" : formatTime(timeLeft)}
                                </span>
                              </div>
                            )}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Finished Submissions */}
          {(monitorSubTab === "all" || monitorSubTab === "finished") && (
            <div className="space-y-4 pt-2">
              {monitorSubTab === "finished" && filteredFinishedSubmissions.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-10 text-center text-slate-400">
                  <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <h5 className="font-bold text-slate-700 text-sm">Belum Ada Siswa Menyelesaikan</h5>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">Belum ada siswa yang mengirimkan lembar ujian di filter ini.</p>
                </div>
              )}

              {filteredFinishedSubmissions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Siswa Baru Menyelesaikan (Finished Submissions)
                  </h4>

                  <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-[9px] font-black tracking-wider">
                            <th className="py-3.5 px-5">Nama Siswa</th>
                            <th className="py-3.5 px-5">Kelas</th>
                            <th className="py-3.5 px-5">Paket Ujian</th>
                            <th className="py-3.5 px-5">Nilai Skor</th>
                            <th className="py-3.5 px-5">Benar / Soal</th>
                            <th className="py-3.5 px-5">Durasi Pengerjaan</th>
                            {onInspectResult && <th className="py-3.5 px-5 text-center">Aksi</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredFinishedSubmissions.map((sub) => {
                            const isPassing = sub.score >= 70;
                            return (
                              <tr key={sub.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="py-3 px-5 font-bold text-slate-800">{sub.studentName}</td>
                                <td className="py-3 px-5 text-slate-500">{sub.studentClass}</td>
                                <td className="py-3 px-5 text-slate-600 font-medium">{sub.examTitle}</td>
                                <td className="py-3 px-5">
                                  <span className={`text-sm font-black ${isPassing ? "text-emerald-600" : "text-rose-500"}`}>
                                    {sub.score}
                                  </span>
                                </td>
                                <td className="py-3 px-5 font-mono font-bold text-slate-500">
                                  {sub.correctCount} / {sub.totalQuestions}
                                </td>
                                <td className="py-3 px-5 text-slate-400 font-mono">
                                  {formatTime(sub.durationSpent)}
                                </td>
                                {onInspectResult && (
                                  <td className="py-3 px-5 text-center">
                                    <button
                                      id={`btn-inspect-result-${sub.id}`}
                                      onClick={() => onInspectResult(sub)}
                                      className="p-1 hover:bg-indigo-50 text-indigo-600 rounded transition-all cursor-pointer"
                                      title="Lihat Rincian Jawaban"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Side: Event Feed Log & System Logs */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Realtime Event Stream timeline */}
          <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-850 shadow-md space-y-4">
            <div>
              <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Log Aktivitas Instan (Live Stream)
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Riwayat tindakan siswa yang terekam secara kronologis.</p>
            </div>

            {activityEvents.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                Menunggu aktivitas pengerjaan masuk...
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                {activityEvents.map((evt) => (
                  <div key={evt.id} className="text-xs flex gap-2.5 items-start">
                    
                    {/* Visual icon marker */}
                    <div className="mt-0.5 shrink-0">
                      {evt.type === "start" ? (
                        <div className="h-4 w-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[8px]">
                          ▶
                        </div>
                      ) : (
                        <div className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[8px]">
                          ✓
                        </div>
                      )}
                    </div>

                    {/* Text action */}
                    <div className="flex-1 space-y-0.5">
                      <p className="text-[11px] leading-tight text-slate-200">
                        <span className="font-extrabold text-slate-100">{evt.studentName}</span> ({evt.studentClass}) 
                        {evt.type === "start" ? (
                          <span className="text-indigo-300 font-semibold"> mulai ujian </span>
                        ) : (
                          <span className="text-emerald-300 font-semibold"> mengirim lembar </span>
                        )}
                        <span className="text-slate-300 italic">"{evt.examTitle}"</span>.
                      </p>
                      
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                        <span>{new Date(evt.timestamp).toLocaleTimeString("id-ID")} WIB</span>
                        {evt.type === "submit" && (
                          <span className={`font-black uppercase tracking-wider ${evt.score! >= 70 ? "text-emerald-400" : "text-rose-400"}`}>
                            Skor: {evt.score}
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick instructions / Help guide */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
            <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              Petunjuk Pengawas Guru
            </h5>
            <ul className="text-[11px] text-slate-500 space-y-2 leading-relaxed list-disc list-inside">
              <li>Siswa diwajibkan meminta <strong>Token Proktor</strong> di menu Bank Soal sebelum memulai ujian.</li>
              <li>Sistem memproteksi pengerjaan jika siswa mencoba keluar dari layar penuh (Fullscreen) atau membuka tab lain.</li>
              <li>Jika siswa mengalami pemutusan internet, progres jawaban mereka yang tersimpan terakhir di server (sinkronisasi 5 detik sekali) akan aman dan bisa dilanjutkan saat koneksi pulih.</li>
              <li>Anda bisa mengeklik ikon rincian <Eye className="w-3 h-3 inline" /> di tab 'Finished' untuk melihat rincian butir soal mana saja yang dijawab benar/salah oleh siswa.</li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
