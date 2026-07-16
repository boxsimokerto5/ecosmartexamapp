export interface School {
  id: string; // School code / ID
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  foundation?: string;
  logoUrl?: string; // Base64 encoded or URL school logo image
  createdAt: string;
  subscriptionPackage?: "1_bulan" | "3_bulan" | "1_tahun" | "free_trial";
  subscriptionActive?: boolean;
  subscriptionExpiresAt?: string; // ISO String
  suspended?: boolean;
  addonCount?: number; // Jumlah paket addon yang dibeli (masing-masing +150 user)
  addonExpiresAt?: string; // Tanggal kedaluwarsa addon (ISO String)
}

export interface Principal {
  id: string; // username
  name: string;
  username: string;
  password?: string;
  schoolId: string;
  schoolName: string;
  createdAt: string;
}

export interface SchoolClass {
  id: string;
  name: string; // e.g., XII-RPL-1
  schoolId: string;
  createdAt: string;
}

export interface Teacher {
  id: string; // username
  name: string;
  username: string;
  password?: string;
  schoolId: string;
  schoolName: string;
  createdAt: string;
  classes?: string[]; // list of assigned class IDs
}

export interface Student {
  id: string; // matches username
  name: string;
  username: string;
  password?: string; // stored for login verification
  class: string;
  schoolId: string;
  schoolName: string;
  createdAt: string;
}

export interface Question {
  id: string;
  type?: "pilihan_ganda" | "isian"; // Default is "pilihan_ganda"
  text: string;
  imageUrl?: string;
  options?: string[]; // typically 4 options (A, B, C, D) for pilihan_ganda
  correctAnswer: number | string; // 0, 1, 2, 3 for pilihan_ganda; string keyword/text for isian
  points: number;
  explanation?: string; // explanation for correct answer or incorrect choices
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  questions: Question[];
  status: "draft" | "active" | "closed";
  schoolId: string;
  schoolName: string;
  createdAt: string;
  token?: string; // proctor token required to start exam
  classes?: string[]; // list of classroom names targeted for this exam
  teacherId?: string; // teacher who created/assigned this exam
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
}

export interface ClassroomSession {
  id: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  schoolId: string;
  status: "active" | "completed";
  createdAt: string;
  joinedStudentsCount?: number;
}

export interface Result {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  schoolId: string;
  schoolName: string;
  answers: Record<string, number | string>; // questionId -> chosen index (0-3) or essay text
  score: number;
  totalQuestions: number;
  correctCount: number;
  submittedAt: string;
  status: "started" | "submitted";
  durationSpent: number; // in seconds
  essayScores?: Record<string, number>; // questionId -> custom points assigned by teacher
  gradedByTeacher?: boolean; // flag if teacher has reviewed/saved manual grading
}

export interface Notification {
  id: string;
  studentId: string; // "all" or specific studentId
  schoolId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: "exam_new" | "exam_graded" | "info";
}
