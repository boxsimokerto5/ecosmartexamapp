import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where,
  getDoc
} from "./firebase";
import { db } from "./firebase";
import { Student, ClassroomSession, Exam } from "../types";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Assigns a student to a specific classroom name.
 */
export async function assignStudentToClass(studentId: string, className: string): Promise<void> {
  const path = `students/${studentId}`;
  try {
    const studentRef = doc(db, "students", studentId);
    await updateDoc(studentRef, { class: className });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Creates/links a teacher to a specific classroom session.
 */
export async function linkTeacherToClassroomSession(
  sessionData: Omit<ClassroomSession, "id" | "createdAt">
): Promise<string> {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const path = `classroom_sessions/${sessionId}`;
  try {
    const sessionRef = doc(db, "classroom_sessions", sessionId);
    const newSession: ClassroomSession = {
      ...sessionData,
      id: sessionId,
      createdAt: new Date().toISOString()
    };
    await setDoc(sessionRef, newSession);
    return sessionId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Updates classroom session status (active vs completed).
 */
export async function updateClassroomSessionStatus(
  sessionId: string, 
  status: "active" | "completed"
): Promise<void> {
  const path = `classroom_sessions/${sessionId}`;
  try {
    const sessionRef = doc(db, "classroom_sessions", sessionId);
    await updateDoc(sessionRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Deletes a classroom session.
 */
export async function deleteClassroomSession(sessionId: string): Promise<void> {
  const path = `classroom_sessions/${sessionId}`;
  try {
    const sessionRef = doc(db, "classroom_sessions", sessionId);
    await deleteDoc(sessionRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Assigns an exam to list of classroom names.
 */
export async function assignExamToClasses(examId: string, classes: string[]): Promise<void> {
  const path = `exams/${examId}`;
  try {
    const examRef = doc(db, "exams", examId);
    await updateDoc(examRef, { classes });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Fetches all students belonging to a class.
 */
export async function getStudentsByClass(schoolId: string, className: string): Promise<Student[]> {
  const path = "students";
  try {
    const q = query(
      collection(db, "students"),
      where("schoolId", "==", schoolId),
      where("class", "==", className)
    );
    const snap = await getDocs(q);
    const list: Student[] = [];
    snap.forEach((doc) => {
      list.push({ ...doc.data(), id: doc.id } as Student);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
