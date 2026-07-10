import { initializeApp } from "firebase/app";
import * as realFS from "firebase/firestore";

declare global {
  interface Window {
    __isDemoMode?: boolean;
    __demoDb?: any;
    __resetDemoDb?: () => void;
  }
}

const firebaseConfig = {
  apiKey: "AIzaSyCqa8O-nzpgYY14EEqs9s1eMH3ocGVmXJ0",
  authDomain: "gen-lang-client-0549649164.firebaseapp.com",
  projectId: "gen-lang-client-0549649164",
  storageBucket: "gen-lang-client-0549649164.firebasestorage.app",
  messagingSenderId: "109276852918",
  appId: "1:109276852918:web:9d74dd96aef4f948e42c17"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom database ID specified in firebase-applet-config.json
export const db = realFS.getFirestore(app, "ai-studio-ujianonline-217077e5-3015-4e78-9e75-0a0b0ab6ab1a");

// --- DEMO MODE ENGINE (In-Memory Database) ---
// This guarantees that any changes made during a demo session are completely client-side,
// do not affect the real production database, and automatically reset upon page refresh.

let demoDb: Record<string, any[]> = {};

const createInitialDemoDb = (): Record<string, any[]> => ({
  schools: [
    {
      id: "demo-school-id",
      name: "SMK Merdeka Nusantara (Demo)",
      address: "Jl. Pendidikan Hijau No. 12, Jakarta",
      phone: "021-777888",
      email: "demo@smkmerdeka.sch.id",
      website: "www.smkmerdeka.sch.id",
      createdAt: new Date().toISOString(),
      subscriptionPackage: "3_bulan",
      subscriptionActive: true,
      subscriptionExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ],
  principals: [
    {
      id: "demo-kepala",
      name: "Dr. H. Ahmad Fauzi, M.Pd (Demo)",
      username: "demo-kepala",
      password: "password",
      schoolId: "demo-school-id",
      schoolName: "SMK Merdeka Nusantara (Demo)",
      createdAt: new Date().toISOString()
    }
  ],
  classes: [
    { id: "class-demo-1", name: "XII-RPL-1", schoolId: "demo-school-id", createdAt: new Date().toISOString() },
    { id: "class-demo-2", name: "XII-TKJ-2", schoolId: "demo-school-id", createdAt: new Date().toISOString() },
  ],
  teachers: [
    {
      id: "demo-guru",
      name: "Widya Lestari, S.Pd (Demo)",
      username: "demo-guru",
      password: "password",
      schoolId: "demo-school-id",
      schoolName: "SMK Merdeka Nusantara (Demo)",
      createdAt: new Date().toISOString(),
      classes: ["XII-RPL-1", "XII-TKJ-2"]
    }
  ],
  students: [
    {
      id: "demo-budi",
      name: "Budi Santoso (Demo)",
      username: "demo-budi",
      password: "password",
      class: "XII-RPL-1",
      schoolId: "demo-school-id",
      schoolName: "SMK Merdeka Nusantara (Demo)",
      createdAt: new Date().toISOString()
    },
    {
      id: "demo-ani",
      name: "Ani Wijaya (Demo)",
      username: "demo-ani",
      password: "password",
      class: "XII-RPL-1",
      schoolId: "demo-school-id",
      schoolName: "SMK Merdeka Nusantara (Demo)",
      createdAt: new Date().toISOString()
    },
    {
      id: "demo-citra",
      name: "Citra Kirana (Demo)",
      username: "demo-citra",
      password: "password",
      class: "XII-TKJ-2",
      schoolId: "demo-school-id",
      schoolName: "SMK Merdeka Nusantara (Demo)",
      createdAt: new Date().toISOString()
    }
  ],
  exams: [
    {
      id: "exam-demo-math",
      title: "Ujian Matematika Terintegrasi (Demo)",
      description: "Materi operasi hitung pecahan, peluang, dan geometri dasar.",
      duration: 15,
      status: "active",
      schoolId: "demo-school-id",
      schoolName: "SMK Merdeka Nusantara (Demo)",
      createdAt: new Date().toISOString(),
      token: "DEMO123",
      classes: ["XII-RPL-1"],
      teacherId: "demo-guru",
      questions: [
        {
          id: "q1",
          text: "Hasil dari 3/4 + 1/2 adalah...",
          options: ["1 1/4", "1 1/2", "1 1/3", "1 1/5"],
          correctAnswer: 0,
          points: 50,
          explanation: "3/4 + 2/4 = 5/4 = 1 1/4"
        },
        {
          id: "q2",
          text: "Berapakah jumlah rusuk pada bangun ruang kubus?",
          options: ["6", "8", "12", "16"],
          correctAnswer: 2,
          points: 50,
          explanation: "Kubus memiliki 12 rusuk yang sama panjang."
        }
      ]
    },
    {
      id: "exam-demo-prog",
      title: "Ujian Pemrograman Web Dasar (Demo)",
      description: "Materi HTML, CSS, JavaScript, dan konsep Client-Side Rendering.",
      duration: 10,
      status: "active",
      schoolId: "demo-school-id",
      schoolName: "SMK Merdeka Nusantara (Demo)",
      createdAt: new Date().toISOString(),
      token: "HTML5",
      classes: ["XII-RPL-1", "XII-TKJ-2"],
      teacherId: "demo-guru",
      questions: [
        {
          id: "p1",
          text: "Tag HTML manakah yang digunakan untuk membuat judul halaman web paling besar?",
          options: ["<h6>", "<heading>", "<h1>", "<head>"],
          correctAnswer: 2,
          points: 50,
          explanation: "Tag <h1> digunakan untuk mendefinisikan heading paling utama dan berukuran paling besar."
        },
        {
          id: "p2",
          text: "Manakah sintaks CSS yang benar untuk memberikan warna latar belakang hitam?",
          options: ["body {background-color: black;}", "body:background-color = black;", "{body;color:black;}", "body {bg-color: black;}"],
          correctAnswer: 0,
          points: 50,
          explanation: "Properti CSS yang tepat untuk latar belakang adalah background-color."
        }
      ]
    }
  ],
  results: [
    {
      id: "res-demo-ani-math",
      examId: "exam-demo-math",
      examTitle: "Ujian Matematika Terintegrasi (Demo)",
      studentId: "demo-ani",
      studentName: "Ani Wijaya (Demo)",
      studentClass: "XII-RPL-1",
      schoolId: "demo-school-id",
      schoolName: "SMK Merdeka Nusantara (Demo)",
      answers: { q1: 0, q2: 1 },
      score: 50,
      totalQuestions: 2,
      correctCount: 1,
      submittedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      status: "submitted",
      durationSpent: 120
    }
  ],
  notifications: [
    {
      id: "notif-demo-1",
      studentId: "all",
      schoolId: "demo-school-id",
      title: "Selamat Datang di Eco Smart Exam (Demo)",
      message: "Ini adalah lingkungan demo interaktif. Di sini Anda bebas mencoba semua fitur: membuat ujian, mengerjakan soal, memantau nilai langsung, dan mengelola kelas tanpa mempengaruhi database asli. Semua aksi Anda bersifat sementara dan akan kembali ke semula (reset) saat halaman direfresh!",
      read: false,
      createdAt: new Date().toISOString(),
      type: "info"
    }
  ]
});

// Initialize the demo store in local memory
demoDb = createInitialDemoDb();

// Expose demo triggers globally
if (typeof window !== "undefined") {
  window.__isDemoMode = false;
  window.__demoDb = demoDb;
  window.__resetDemoDb = () => {
    demoDb = createInitialDemoDb();
    window.__demoDb = demoDb;
    notifyListeners();
  };
}

// Active real-time subscription listeners for demo mode
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn("Virtual listener error:", e);
    }
  });
}

// Custom proxied exports
export function collection(database: any, path: string) {
  if ((typeof window !== "undefined" && window.__isDemoMode) || (database && database.__isVirtual)) {
    return {
      __isVirtual: true,
      type: "collection",
      path,
      collectionName: path
    };
  }
  return realFS.collection(database, path);
}

export function doc(dbOrCol: any, pathOrId: string, ...more: string[]) {
  if ((typeof window !== "undefined" && window.__isDemoMode) || (dbOrCol && dbOrCol.__isVirtual)) {
    let colName = "";
    let id = "";
    if (dbOrCol && dbOrCol.__isVirtual) {
      colName = dbOrCol.collectionName;
      id = pathOrId;
    } else {
      colName = pathOrId;
      id = more[0] || "";
    }
    return {
      __isVirtual: true,
      type: "document",
      collectionName: colName,
      docId: id,
      path: `${colName}/${id}`
    };
  }
  const realDbOrCol = dbOrCol && dbOrCol.__isVirtual ? db : dbOrCol;
  return realFS.doc(realDbOrCol, pathOrId, ...more);
}

export function query(collectionRef: any, ...queryConstraints: any[]) {
  if ((typeof window !== "undefined" && window.__isDemoMode) || (collectionRef && collectionRef.__isVirtual)) {
    const filters = queryConstraints.filter((c) => c && c.__isConstraint);
    return {
      __isVirtual: true,
      type: "query",
      collectionName: collectionRef.collectionName,
      path: collectionRef.path,
      filters
    };
  }
  return realFS.query(collectionRef, ...queryConstraints);
}

export function where(field: string, op: any, value: any) {
  if (typeof window !== "undefined" && window.__isDemoMode) {
    return {
      __isConstraint: true,
      type: "where",
      field,
      op,
      value
    };
  }
  return realFS.where(field, op as any, value);
}

export function orderBy(field: string, direction?: "asc" | "desc") {
  if (typeof window !== "undefined" && window.__isDemoMode) {
    return {
      __isConstraint: true,
      type: "orderBy",
      field,
      direction
    };
  }
  return realFS.orderBy(field, direction);
}

export function limit(num: number) {
  if (typeof window !== "undefined" && window.__isDemoMode) {
    return {
      __isConstraint: true,
      type: "limit",
      num
    };
  }
  return realFS.limit(num);
}

export async function getDoc(docRef: any) {
  if ((typeof window !== "undefined" && window.__isDemoMode) || (docRef && docRef.__isVirtual)) {
    const colName = docRef.collectionName;
    const docId = docRef.docId;
    const item = demoDb[colName]?.find((d: any) => d.id === docId);
    return {
      exists: () => !!item,
      data: () => item || null,
      id: docId
    };
  }
  return realFS.getDoc(docRef);
}

export async function getDocs(queryOrColRef: any) {
  if ((typeof window !== "undefined" && window.__isDemoMode) || (queryOrColRef && queryOrColRef.__isVirtual)) {
    const colName = queryOrColRef.collectionName;
    let list = [...(demoDb[colName] || [])];

    if (queryOrColRef.type === "query" && queryOrColRef.filters) {
      queryOrColRef.filters.forEach((filter: any) => {
        if (filter.type === "where") {
          const { field, op, value } = filter;
          list = list.filter((item: any) => {
            const itemValue = item[field];
            if (op === "==") return itemValue === value;
            if (op === "!=") return itemValue !== value;
            if (op === "array-contains") return Array.isArray(itemValue) && itemValue.includes(value);
            if (op === "in") return Array.isArray(value) && value.includes(itemValue);
            return true;
          });
        }
      });
    }

    const docs = list.map((item: any) => ({
      id: item.id,
      data: () => item,
      exists: () => true
    }));

    return {
      empty: docs.length === 0,
      size: docs.length,
      docs,
      forEach: (callback: (doc: any) => void) => docs.forEach(callback)
    };
  }
  return realFS.getDocs(queryOrColRef);
}

export function onSnapshot(ref: any, onNext: (snapshot: any) => void, onError?: (error: any) => void) {
  if ((typeof window !== "undefined" && window.__isDemoMode) || (ref && ref.__isVirtual)) {
    const trigger = async () => {
      try {
        if (ref.type === "document") {
          const snap = await getDoc(ref);
          onNext(snap);
        } else {
          const snap = await getDocs(ref);
          onNext(snap);
        }
      } catch (err) {
        if (onError) onError(err);
      }
    };

    trigger();
    listeners.add(trigger);

    return () => {
      listeners.delete(trigger);
    };
  }
  return realFS.onSnapshot(ref, onNext, onError);
}

export async function setDoc(docRef: any, data: any, options?: any) {
  if ((typeof window !== "undefined" && window.__isDemoMode) || (docRef && docRef.__isVirtual)) {
    const colName = docRef.collectionName;
    const docId = docRef.docId;
    if (!demoDb[colName]) {
      demoDb[colName] = [];
    }
    const idx = demoDb[colName].findIndex((d: any) => d.id === docId);
    const existing = idx >= 0 ? demoDb[colName][idx] : {};
    const newData = options?.merge ? { ...existing, ...data, id: docId } : { ...data, id: docId };

    if (idx >= 0) {
      demoDb[colName][idx] = newData;
    } else {
      demoDb[colName].push(newData);
    }

    setTimeout(() => {
      notifyListeners();
    }, 30);
    return;
  }
  return realFS.setDoc(docRef, data, options);
}

export async function updateDoc(docRef: any, data: any) {
  if ((typeof window !== "undefined" && window.__isDemoMode) || (docRef && docRef.__isVirtual)) {
    const colName = docRef.collectionName;
    const docId = docRef.docId;
    if (!demoDb[colName]) {
      demoDb[colName] = [];
    }
    const idx = demoDb[colName].findIndex((d: any) => d.id === docId);
    if (idx >= 0) {
      demoDb[colName][idx] = { ...demoDb[colName][idx], ...data };
    } else {
      demoDb[colName].push({ ...data, id: docId });
    }

    setTimeout(() => {
      notifyListeners();
    }, 30);
    return;
  }
  return realFS.updateDoc(docRef, data);
}

export async function addDoc(collectionRef: any, data: any) {
  if ((typeof window !== "undefined" && window.__isDemoMode) || (collectionRef && collectionRef.__isVirtual)) {
    const colName = collectionRef.collectionName;
    if (!demoDb[colName]) {
      demoDb[colName] = [];
    }
    const generatedId = `demo-doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newData = { ...data, id: generatedId };
    demoDb[colName].push(newData);

    setTimeout(() => {
      notifyListeners();
    }, 30);

    return {
      id: generatedId,
      path: `${colName}/${generatedId}`
    };
  }
  return realFS.addDoc(collectionRef, data);
}

export async function deleteDoc(docRef: any) {
  if ((typeof window !== "undefined" && window.__isDemoMode) || (docRef && docRef.__isVirtual)) {
    const colName = docRef.collectionName;
    const docId = docRef.docId;
    if (demoDb[colName]) {
      demoDb[colName] = demoDb[colName].filter((d: any) => d.id !== docId);
    }

    setTimeout(() => {
      notifyListeners();
    }, 30);
    return;
  }
  return realFS.deleteDoc(docRef);
}

export function writeBatch(database: any) {
  if ((typeof window !== "undefined" && window.__isDemoMode) || (database && database.__isVirtual)) {
    const operations: Array<() => Promise<void>> = [];
    return {
      set: (docRef: any, data: any, options?: any) => {
        operations.push(() => setDoc(docRef, data, options));
      },
      update: (docRef: any, data: any) => {
        operations.push(() => updateDoc(docRef, data));
      },
      delete: (docRef: any) => {
        operations.push(() => deleteDoc(docRef));
      },
      commit: async () => {
        for (const op of operations) {
          await op();
        }
      }
    };
  }
  return realFS.writeBatch(database);
}
