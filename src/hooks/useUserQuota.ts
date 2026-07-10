import { useState, useEffect } from "react";
import { School } from "../types";

export interface UserQuotaResult {
  totalUsers: number;
  baseCapacity: number;
  addonCapacity: number;
  totalCapacity: number;
  addonCount: number;
  addonExpiresAt: string | null;
  hasAddon: boolean;
  isAddonExpired: boolean;
  quotaPercentage: number;
  isLimitReached: boolean;
  isNearingLimit: boolean; // >= 90%
}

export function calculateUserQuota(
  school: School | null,
  teachersCount: number,
  studentsCount: number
): UserQuotaResult {
  const totalUsers = teachersCount + studentsCount;
  const baseCapacity = 200;
  
  const addonCount = school?.addonCount || 0;
  const addonExpiresAt = school?.addonExpiresAt || null;
  const hasAddon = addonCount > 0;
  
  const isAddonExpired = hasAddon && !!addonExpiresAt && new Date(addonExpiresAt).getTime() < Date.now();
  const addonCapacity = (hasAddon && !isAddonExpired) ? (addonCount * 150) : 0;
  const totalCapacity = baseCapacity + addonCapacity;
  
  const quotaPercentage = totalCapacity > 0 ? Math.min(100, Math.round((totalUsers / totalCapacity) * 100)) : 0;
  const isLimitReached = totalUsers >= totalCapacity;
  const isNearingLimit = totalUsers >= totalCapacity * 0.9; // 90% warning

  return {
    totalUsers,
    baseCapacity,
    addonCapacity,
    totalCapacity,
    addonCount,
    addonExpiresAt,
    hasAddon,
    isAddonExpired,
    quotaPercentage,
    isLimitReached,
    isNearingLimit
  };
}

export function useUserQuota(
  school: School | null,
  teachersCount: number,
  studentsCount: number
) {
  const [quota, setQuota] = useState<UserQuotaResult>(() => 
    calculateUserQuota(school, teachersCount, studentsCount)
  );

  useEffect(() => {
    setQuota(calculateUserQuota(school, teachersCount, studentsCount));

    // If there is an active addon, set up a timer to recalculate when it expires
    if (school?.addonCount && school.addonCount > 0 && school.addonExpiresAt) {
      const expiryTime = new Date(school.addonExpiresAt).getTime();
      const delay = expiryTime - Date.now();
      if (delay > 0) {
        const timer = setTimeout(() => {
          setQuota(calculateUserQuota(school, teachersCount, studentsCount));
        }, delay);
        return () => clearTimeout(timer);
      }
    }
  }, [school, teachersCount, studentsCount]);

  return quota;
}
