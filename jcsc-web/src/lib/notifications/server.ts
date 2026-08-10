import type { IssuePriority } from "@prisma/client";
import { prisma } from "@/lib/db";
import { queueEmail } from "@/lib/email/engine";

export type NotificationLevel = "info" | "warning" | "critical";

export interface SendNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: string;
  entityType?: string;
  entityId?: string;
  issueNumber?: string;
  level?: NotificationLevel;
  actionRequired?: boolean;
  priority?: IssuePriority | "CRITICAL";
}

async function getDebounceMs() {
  const cfg = await prisma.systemConfig.findUnique({
    where: { key: "notification_debounce_minutes" },
  });
  const minutes = cfg ? parseInt(cfg.value, 10) : 2;
  return (Number.isFinite(minutes) ? minutes : 2) * 60 * 1000;
}

function buildCollapsedMessage(base: string, count: number) {
  if (count <= 1) return base;
  return `${base} (+${count - 1} إشعار${count - 1 > 1 ? "ات" : ""} مجمّعة)`;
}

export async function sendNotification(params: SendNotificationParams) {
  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user) return;

  const debounceMs = await getDebounceMs();
  const forceAll = params.priority === "CRITICAL";
  const level = params.level ?? "info";

  const debounce = await prisma.notificationDebounce.findUnique({
    where: { userId_type: { userId: params.userId, type: params.type } },
  });

  const withinWindow =
    debounce && Date.now() - debounce.lastSentAt.getTime() < debounceMs;

  if (withinWindow && debounce?.lastInAppId) {
    const pendingCount = debounce.pendingCount + 1;
    const collapsedMessage = buildCollapsedMessage(params.message, pendingCount);

    await prisma.notification.update({
      where: { id: debounce.lastInAppId },
      data: {
        title: params.title,
        message: collapsedMessage,
        level,
        actionRequired: params.actionRequired ?? false,
        issueNumber: params.issueNumber,
        entityType: params.entityType,
        entityId: params.entityId,
        createdAt: new Date(),
        isRead: false,
        readAt: null,
      },
    });

    await prisma.notificationDebounce.update({
      where: { id: debounce.id },
      data: { pendingCount, lastSentAt: new Date() },
    });
    return;
  }

  const channels: ("IN_APP" | "EMAIL" | "SMS")[] = [];
  if (user.notifyInApp || forceAll) channels.push("IN_APP");
  if ((user.notifyEmail || forceAll) && user.email) channels.push("EMAIL");
  if ((user.notifySms || forceAll) && user.phone) channels.push("SMS");

  if (channels.length === 0) channels.push("IN_APP");

  let lastInAppId: string | undefined;

  for (const channel of channels) {
    const created = await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        channel,
        level,
        actionRequired: params.actionRequired ?? false,
        issueNumber: params.issueNumber,
        entityType: params.entityType,
        entityId: params.entityId,
      },
    });
    if (channel === "IN_APP") lastInAppId = created.id;
    if (channel === "EMAIL" && user.email) {
      const templateKey =
        params.type === "escalation_developer_sla"
          ? "developer_fix_escalation"
          : params.type === "issue_assigned" ||
              params.type === "issue_reassigned" ||
              params.type === "case_assigned"
            ? "case_assigned"
            : params.type === "issue_status"
              ? "sla_breach"
              : params.type === "issue_returned"
                ? "case_assigned"
                : params.type === "issue_closed"
                  ? "case_closed"
                  : params.type === "escalation_sla"
                    ? "sla_breach"
                    : "report_received";

      const extraVars: Record<string, string> = {};
      if (params.type === "escalation_developer_sla") {
        const hoursCfg = await prisma.systemConfig.findUnique({
          where: { key: "developer_fix_escalation_hours" },
        });
        extraVars.hours = hoursCfg?.value ?? "2";
        extraVars.managerName = user.name;
        extraVars.developerName = "المطور";
        extraVars.title = params.message;

        if (params.entityId) {
          const caseRow = await prisma.case.findUnique({
            where: { id: params.entityId },
            include: { assignedDeveloper: true },
          });
          if (caseRow) {
            extraVars.title = caseRow.title;
            extraVars.developerName =
              caseRow.assignedDeveloper?.name ?? extraVars.developerName;
          }
        }
      }

      await queueEmail(
        templateKey,
        {
          caseNumber: params.issueNumber ?? "",
          title: params.title,
          assignee: user.name,
          assigneeName: user.name,
          notes: params.message,
          ...extraVars,
        },
        user.email
      );
    }
  }

  if (debounce) {
    await prisma.notificationDebounce.update({
      where: { id: debounce.id },
      data: {
        pendingCount: 1,
        lastInAppId: lastInAppId ?? null,
        lastSentAt: new Date(),
      },
    });
  } else {
    await prisma.notificationDebounce.upsert({
      where: { userId_type: { userId: params.userId, type: params.type } },
      create: {
        userId: params.userId,
        type: params.type,
        pendingCount: 1,
        lastInAppId: lastInAppId ?? null,
      },
      update: {
        pendingCount: 1,
        lastInAppId: lastInAppId ?? null,
        lastSentAt: new Date(),
      },
    });
  }
}

export function mapNotificationToClient(n: {
  id: string;
  title: string;
  message: string;
  type: string;
  channel: string;
  level: string;
  actionRequired: boolean;
  issueNumber: string | null;
  isRead: boolean;
  readAt: Date | null;
  userId: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
}) {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    channel: n.channel,
    level: n.level as NotificationLevel,
    actionRequired: n.actionRequired,
    issueNumber: n.issueNumber ?? undefined,
    isRead: n.isRead,
    readAt: n.readAt?.toISOString(),
    userId: n.userId,
    entityType: n.entityType ?? undefined,
    entityId: n.entityId ?? undefined,
    createdAt: n.createdAt.toISOString(),
  };
}

export function isEscalationType(type: string) {
  return type.startsWith("escalation_");
}

/** Notify all active support coordinators */
export async function notifySupportCoordinators(
  params: Omit<SendNotificationParams, "userId"> & { excludeUserId?: string }
) {
  const { excludeUserId, ...rest } = params;
  const coordinators = await prisma.user.findMany({
    where: { role: "SUPPORT_COORDINATOR", isActive: true },
  });
  for (const user of coordinators) {
    if (excludeUserId && user.id === excludeUserId) continue;
    await sendNotification({ ...rest, userId: user.id });
  }
}

/** Notify all active super admins (ADMIN role) */
export async function notifySuperAdmins(params: Omit<SendNotificationParams, "userId">) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
  });
  for (const admin of admins) {
    await sendNotification({ ...params, userId: admin.id });
  }
}
