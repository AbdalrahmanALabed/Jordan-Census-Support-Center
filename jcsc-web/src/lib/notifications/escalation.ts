import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/server";
import { logCaseTimelineEvent } from "@/lib/cases/timeline-log";

async function getConfigNumber(key: string, fallback: number) {
  const cfg = await prisma.systemConfig.findUnique({ where: { key } });
  if (!cfg) return fallback;
  const n = parseFloat(cfg.value);
  return Number.isFinite(n) ? n : fallback;
}

async function ensureEscalationConfig() {
  await prisma.systemConfig.upsert({
    where: { key: "developer_fix_escalation_hours" },
    create: { key: "developer_fix_escalation_hours", value: "2" },
    update: {},
  });
}

let cachedAdminManagers: { id: string; email: string; name: string }[] | null =
  null;

async function getFallbackManagers() {
  if (cachedAdminManagers) return cachedAdminManagers;
  cachedAdminManagers = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true, email: true, name: true },
  });
  return cachedAdminManagers;
}

async function resolveManagerForDeveloper(developerId: string) {
  const dev = await prisma.user.findUnique({
    where: { id: developerId },
    include: { directManager: true },
  });
  if (!dev) return null;

  if (dev.directManager?.email) {
    return dev.directManager;
  }

  const admins = await getFallbackManagers();
  return admins.find((a) => a.email) ?? admins[0] ?? null;
}

async function resolveAssignmentSince(caseId: string, assignedAt: Date | null, updatedAt: Date) {
  if (assignedAt) return assignedAt;

  const lastAssign = await prisma.caseTimelineEvent.findFirst({
    where: {
      caseId,
      action: { in: ["إسناد", "إعادة إسناد", "تصنيف الحالة", "قبول وتصنيف"] },
    },
    orderBy: { createdAt: "desc" },
  });
  return lastAssign?.createdAt ?? updatedAt;
}

async function processUnopenedAssignmentEscalations() {
  const unopenedMinutes = await getConfigNumber(
    "sla_escalation_unopened_minutes",
    30
  );
  const cutoff = new Date(Date.now() - unopenedMinutes * 60 * 1000);

  const staleAssignments = await prisma.notification.findMany({
    where: {
      isRead: false,
      channel: "IN_APP",
      type: { in: ["issue_assigned", "issue_reassigned", "case_assigned"] },
      createdAt: { lt: cutoff },
    },
    include: {
      user: { include: { directManager: true } },
    },
  });

  for (const notif of staleAssignments) {
    const lead =
      notif.user.directManager ??
      (await getFallbackManagers()).find((a) => a.email);
    if (!lead) continue;

    const alreadyEscalated = await prisma.notification.findFirst({
      where: {
        userId: lead.id,
        type: "escalation_unacknowledged",
        entityId: notif.entityId,
        createdAt: { gt: notif.createdAt },
      },
    });
    if (alreadyEscalated) continue;

    await sendNotification({
      userId: lead.id,
      title: "تصعيد — إشعار غير مفتوح",
      message: `${notif.user.name} لم يفتح إشعار التعيين: ${notif.message}`,
      type: "escalation_unacknowledged",
      entityType: notif.entityType ?? undefined,
      entityId: notif.entityId ?? undefined,
      issueNumber: notif.issueNumber ?? undefined,
      level: "warning",
      actionRequired: true,
    });
  }
}

async function processLegacyIssueSlaEscalations() {
  const now = new Date();
  const breachedIssues = await prisma.issue.findMany({
    where: {
      slaTargetAt: { lt: now },
      status: { not: "CLOSED" },
    },
  });

  const managers = await getFallbackManagers();

  for (const issue of breachedIssues) {
    for (const manager of managers) {
      const recent = await prisma.notification.findFirst({
        where: {
          userId: manager.id,
          type: "escalation_sla",
          entityId: issue.id,
          createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
        },
      });
      if (recent) continue;

      await sendNotification({
        userId: manager.id,
        title: "تصعيد — SLA متجاوز",
        message: `${issue.number} تجاوزت وقت الاستجابة (${issue.team})`,
        type: "escalation_sla",
        entityType: "Issue",
        entityId: issue.id,
        issueNumber: issue.number,
        level: "critical",
        actionRequired: true,
        priority: issue.priority === "CRITICAL" ? "CRITICAL" : undefined,
      });
    }
  }
}

/** إذا لم يُحل الخلل خلال ساعتين → إيميل + إشعار لمدير المطور (أو السوبر أدمن) */
async function processDeveloperFixEscalations() {
  const hours = await getConfigNumber("developer_fix_escalation_hours", 2);
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const openBugCases = await prisma.case.findMany({
    where: {
      caseType: "BUG",
      assignedDeveloperId: { not: null },
      status: { in: ["IN_PROGRESS", "UNDER_REVIEW"] },
    },
    include: {
      assignedDeveloper: true,
    },
  });

  for (const caseRow of openBugCases) {
    const dev = caseRow.assignedDeveloper;
    if (!dev) continue;

    const manager = await resolveManagerForDeveloper(dev.id);
    if (!manager?.email) {
      console.warn(
        `[escalation] no manager for dev ${dev.email}, case ${caseRow.number}`
      );
      continue;
    }

    const assignedSince = await resolveAssignmentSince(
      caseRow.id,
      caseRow.assignedAt,
      caseRow.updatedAt
    );

    if (assignedSince >= cutoff) continue;

    const alreadyEscalated = await prisma.notification.findFirst({
      where: {
        type: "escalation_developer_sla",
        entityType: "Case",
        entityId: caseRow.id,
      },
    });
    if (alreadyEscalated) continue;

    const hoursOpen = Math.max(
      1,
      Math.round((Date.now() - assignedSince.getTime()) / (60 * 60 * 1000))
    );

    await sendNotification({
      userId: manager.id,
      title: "تصعيد — لم يُحل الخلل خلال المهلة",
      message: `${caseRow.number}: ${dev.name} لم يُغلق الخلل منذ ${hoursOpen} ساعة — ${caseRow.title.slice(0, 80)}`,
      type: "escalation_developer_sla",
      entityType: "Case",
      entityId: caseRow.id,
      issueNumber: caseRow.number,
      level: "critical",
      actionRequired: true,
      priority: "CRITICAL",
    });

    await logCaseTimelineEvent({
      caseId: caseRow.id,
      action: "تصعيد — تجاوز مهلة المعالجة",
      details: `لم يُحل الخلل خلال ${hours} ساعة — أُبلِغ ${manager.name}`,
      actorName: "النظام",
    });

    console.info(
      `[escalation] developer SLA → ${manager.email} for ${caseRow.number}`
    );
  }
}

export async function processEscalations() {
  await ensureEscalationConfig();
  await processUnopenedAssignmentEscalations();
  await processLegacyIssueSlaEscalations();
  await processDeveloperFixEscalations();
}
