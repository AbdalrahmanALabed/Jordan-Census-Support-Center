"use client";

import { Loader2, Lock } from "lucide-react";

interface CaseProcessingLockBannerProps {
  loading?: boolean;
  blockedByOther?: boolean;
  lockedByUserName?: string;
}

export function CaseProcessingLockBanner({
  loading,
  blockedByOther,
  lockedByUserName,
}: CaseProcessingLockBannerProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border-2 border-sky-200 bg-sky-50/80 p-4 text-sm font-bold text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
        جاري حجز البلاغ للمعالجة...
      </div>
    );
  }

  if (!blockedByOther) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/30">
      <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
      <div>
        <p className="font-black text-amber-900 dark:text-amber-200">
          هذا البلاغ قيد المعالجة من جلسة أخرى
        </p>
        <p className="mt-1 text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
          {lockedByUserName
            ? `الحساب «${lockedByUserName}» يعمل عليه حالياً — لا يمكن التصنيف في نفس الوقت.`
            : "جلسة أخرى تعمل على هذا البلاغ — انتظر أو حدّث الصفحة لاحقاً."}
        </p>
      </div>
    </div>
  );
}
