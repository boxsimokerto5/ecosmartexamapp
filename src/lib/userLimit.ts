import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { School } from "../types";

export interface UserLimitResult {
  isBlocked: boolean;
  message?: string;
  totalUsers: number;
  activeCapacity: number;
  userIndex: number;
  addonExpired: boolean;
}

export async function checkUserLimit(schoolId: string, userId: string): Promise<UserLimitResult> {
  try {
    // 1. Get School Profile
    const schoolSnap = await getDoc(doc(db, "schools", schoolId));
    if (!schoolSnap.exists()) {
      return { isBlocked: false, totalUsers: 0, activeCapacity: 200, userIndex: -1, addonExpired: false };
    }
    const school = schoolSnap.data() as School;

    // 2. Fetch all teachers and students to determine total user count and ordering
    const [teachersSnap, studentsSnap] = await Promise.all([
      getDocs(query(collection(db, "teachers"), where("schoolId", "==", schoolId))),
      getDocs(query(collection(db, "students"), where("schoolId", "==", schoolId)))
    ]);

    const usersList: { id: string; createdAt: string }[] = [];

    teachersSnap.forEach((doc) => {
      const data = doc.data();
      usersList.push({
        id: doc.id,
        createdAt: data.createdAt || new Date(2020, 0, 1).toISOString()
      });
    });

    studentsSnap.forEach((doc) => {
      const data = doc.data();
      usersList.push({
        id: doc.id,
        createdAt: data.createdAt || new Date(2020, 0, 1).toISOString()
      });
    });

    // Sort by createdAt ascending (oldest first)
    usersList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const totalUsers = usersList.length;
    const userIndex = usersList.findIndex((u) => u.id === userId);

    // Calculate capacities
    const addonCount = school.addonCount || 0;
    const addonExpiresAt = school.addonExpiresAt;
    const hasAddon = addonCount > 0;
    const isAddonExpired = hasAddon && addonExpiresAt && new Date(addonExpiresAt).getTime() < Date.now();
    
    const activeCapacity = (hasAddon && !isAddonExpired) ? (200 + addonCount * 150) : 200;

    // If user is not found in the list, they can't be ordered. Just default to allowing them or check length
    const effectiveIndex = userIndex !== -1 ? userIndex : totalUsers;

    if (effectiveIndex >= activeCapacity) {
      if (hasAddon && isAddonExpired) {
        return {
          isBlocked: true,
          message: `Maaf, akun Anda saat ini dinonaktifkan sementara karena kuota pengguna sekolah telah melebihi batas 200 user standar, dan paket add-on (+${addonCount * 150} user) sekolah Anda telah habis masa berlakunya. Silakan hubungi Kepala Sekolah atau administrator sekolah untuk memperpanjang add-on kapasitas user.`,
          totalUsers,
          activeCapacity,
          userIndex: effectiveIndex,
          addonExpired: true
        };
      } else {
        return {
          isBlocked: true,
          message: `Maaf, akun Anda saat ini dinonaktifkan sementara karena sekolah Anda telah mencapai batas maksimal kuota pengguna ${activeCapacity} user. Silakan hubungi Kepala Sekolah atau administrator untuk membeli paket add-on tambahan (+150 user / Rp 15.000 per bulan).`,
          totalUsers,
          activeCapacity,
          userIndex: effectiveIndex,
          addonExpired: false
        };
      }
    }

    return {
      isBlocked: false,
      totalUsers,
      activeCapacity,
      userIndex: effectiveIndex,
      addonExpired: isAddonExpired
    };
  } catch (error) {
    console.error("Error checking user limit:", error);
    // In case of error, we can default to allow to prevent lockouts on firestore failures
    return { isBlocked: false, totalUsers: 0, activeCapacity: 200, userIndex: -1, addonExpired: false };
  }
}

export async function canAddUser(schoolId: string): Promise<{ allowed: boolean; totalUsers: number; activeCapacity: number; message?: string }> {
  try {
    const schoolSnap = await getDoc(doc(db, "schools", schoolId));
    if (!schoolSnap.exists()) {
      return { allowed: true, totalUsers: 0, activeCapacity: 200 };
    }
    const school = schoolSnap.data() as School;

    const [teachersSnap, studentsSnap] = await Promise.all([
      getDocs(query(collection(db, "teachers"), where("schoolId", "==", schoolId))),
      getDocs(query(collection(db, "students"), where("schoolId", "==", schoolId)))
    ]);

    const totalUsers = teachersSnap.size + studentsSnap.size;

    const addonCount = school.addonCount || 0;
    const addonExpiresAt = school.addonExpiresAt;
    const hasAddon = addonCount > 0;
    const isAddonExpired = hasAddon && addonExpiresAt && new Date(addonExpiresAt).getTime() < Date.now();
    
    const activeCapacity = (hasAddon && !isAddonExpired) ? (200 + addonCount * 150) : 200;

    if (totalUsers >= activeCapacity) {
      if (hasAddon && isAddonExpired) {
        return {
          allowed: false,
          totalUsers,
          activeCapacity,
          message: `Batas kuota pengguna (${activeCapacity} user) telah tercapai karena paket addon sekolah Anda telah habis masa berlakunya.`
        };
      } else {
        return {
          allowed: false,
          totalUsers,
          activeCapacity,
          message: `Batas kuota pengguna (${activeCapacity} user) telah tercapai. Harap perpanjang paket addon kapasitas.`
        };
      }
    }

    return { allowed: true, totalUsers, activeCapacity };
  } catch (error) {
    console.error("Error checking canAddUser:", error);
    return { allowed: true, totalUsers: 0, activeCapacity: 200 };
  }
}

