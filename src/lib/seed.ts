import { db } from "./firebase";
import { 
  collection, 
  getDocs, 
  writeBatch, 
  doc 
} from "firebase/firestore";
import { School, Teacher, Student, Exam, Result, Notification, Principal, SchoolClass } from "../types";

export const DEFAULT_SCHOOLS: School[] = [];
export const DEFAULT_PRINCIPALS: Principal[] = [];
export const DEFAULT_CLASSES: SchoolClass[] = [];
export const DEFAULT_TEACHERS: Teacher[] = [];
export const DEFAULT_STUDENTS: Student[] = [];
export const DEFAULT_EXAMS: Exam[] = [];
export const DEFAULT_RESULTS: Result[] = [];
export const DEFAULT_NOTIFICATIONS: Notification[] = [];

// Clean up all standard dummy records from Firestore
export async function seedDatabaseIfEmpty() {
  try {
    const dummySchools = ["SMK-MERDEKA"];
    const dummyPrincipals = ["kepala"];
    const dummyClasses = ["SMK-MERDEKA-XII-RPL-1", "SMK-MERDEKA-XII-TKJ-2"];
    const dummyTeachers = ["guru"];
    const dummyStudents = ["budi", "ani", "citra", "dono", "eka"];
    const dummyExams = ["exam-math", "exam-prog", "exam-physics"];
    const dummyResults = ["res-ani-math", "res-citra-prog", "res-dono-math", "res-budi-math-active"];
    const dummyNotifications = ["notif-1", "notif-2"];

    const batch = writeBatch(db);

    dummySchools.forEach(id => batch.delete(doc(db, "schools", id)));
    dummyPrincipals.forEach(id => batch.delete(doc(db, "principals", id)));
    dummyClasses.forEach(id => batch.delete(doc(db, "classes", id)));
    dummyTeachers.forEach(id => batch.delete(doc(db, "teachers", id)));
    dummyStudents.forEach(id => batch.delete(doc(db, "students", id)));
    dummyExams.forEach(id => batch.delete(doc(db, "exams", id)));
    dummyResults.forEach(id => batch.delete(doc(db, "results", id)));
    dummyNotifications.forEach(id => batch.delete(doc(db, "notifications", id)));

    await batch.commit();
    console.log("Deleted all default dummy records from the database.");
    return true;
  } catch (error) {
    console.error("Error during database dummy cleanup: ", error);
    return false;
  }
}
