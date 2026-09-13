import { prisma } from "@/lib/db";

/** Lock expires after 3 minutes unless refreshed by heartbeat */
export const CASE_PROCESSING_LOCK_TTL_MS = 3 * 60 * 1000;

export type CaseLockInfo = {
  locked: boolean;
  heldByMe: boolean;
  lockedByUserName?: string;
  expiresAt?: string;
};

export async function getCaseLockInfo(
  caseId: string,
  lockToken?: string | null
): Promise<CaseLockInfo> {
  const lock = await prisma.caseProcessingLock.findUnique({
    where: { caseId },
    include: { user: { select: { name: true } } },
  });
  const now = new Date();
  if (!lock || lock.expiresAt <= now) {
    return { locked: false, heldByMe: false };
  }
  return {
    locked: true,
    heldByMe: Boolean(lockToken && lock.lockToken === lockToken),
    lockedByUserName: lock.user.name,
    expiresAt: lock.expiresAt.toISOString(),
  };
}

export async function acquireOrRefreshCaseLock(
  caseId: string,
  userId: string,
  lockToken: string
): Promise<{ ok: true; expiresAt: Date } | { ok: false; lockedByUserName: string }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CASE_PROCESSING_LOCK_TTL_MS);

  const existing = await prisma.caseProcessingLock.findUnique({
    where: { caseId },
    include: { user: { select: { name: true } } },
  });

  if (!existing || existing.expiresAt <= now) {
    if (existing) {
      await prisma.caseProcessingLock.deleteMany({
        where: { caseId, expiresAt: { lte: now } },
      });
    }
    try {
      await prisma.caseProcessingLock.create({
        data: { caseId, lockToken, userId, expiresAt },
      });
      return { ok: true, expiresAt };
    } catch {
      const retry = await prisma.caseProcessingLock.findUnique({
        where: { caseId },
        include: { user: { select: { name: true } } },
      });
      if (retry?.lockToken === lockToken && retry.expiresAt > now) {
        await prisma.caseProcessingLock.update({
          where: { caseId },
          data: { expiresAt },
        });
        return { ok: true, expiresAt };
      }
      return { ok: false, lockedByUserName: retry?.user.name ?? "مستخدم آخر" };
    }
  }

  if (existing.lockToken === lockToken) {
    await prisma.caseProcessingLock.update({
      where: { caseId },
      data: { expiresAt },
    });
    return { ok: true, expiresAt };
  }

  return { ok: false, lockedByUserName: existing.user.name };
}

export async function releaseCaseLock(caseId: string, lockToken: string) {
  await prisma.caseProcessingLock.deleteMany({
    where: { caseId, lockToken },
  });
}

export async function requireCaseProcessingLock(
  caseId: string,
  lockToken: string | undefined | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!lockToken?.trim()) {
    return {
      ok: false,
      message: "يجب فتح البلاغ من جلسة واحدة فقط — حدّث الصفحة وحاول مجدداً",
    };
  }

  const lock = await prisma.caseProcessingLock.findUnique({
    where: { caseId },
    include: { user: { select: { name: true } } },
  });
  const now = new Date();

  if (!lock || lock.expiresAt <= now) {
    return {
      ok: false,
      message: "انتهت مهلة المعالجة — حدّث الصفحة للحصول على القفل مجدداً",
    };
  }

  if (lock.lockToken !== lockToken) {
    return {
      ok: false,
      message: `هذا البلاغ قيد المعالجة حالياً (${lock.user.name}) — انتظر حتى ينتهي أو حدّث الصفحة لاحقاً`,
    };
  }

  return { ok: true };
}

/** Actions that change classification / triage — require an active processing lock */
export const CASE_TRIAGE_ACTIONS = new Set([
  "classify",
  "classify_and_assign",
  "accept_classify",
  "review_problem",
  "review_not_problem",
  "dismiss_not_problem",
  "coordinator_escalate_system_bug",
  "coordinator_dismiss_not_system",
]);

export const REPORT_TRIAGE_ACTIONS = new Set(["confirm_and_assign", "reject"]);
