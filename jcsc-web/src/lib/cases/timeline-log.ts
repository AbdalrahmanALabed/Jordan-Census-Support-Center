import type { CaseStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";

export const STATUS_CHANGE_MARKER = "__status__:";
export const ROLE_MARKER = "__role__:";
export const REASSIGN_MARKER = "__reassign__:";

export const USER_ROLE_TIMELINE_LABELS: Partial<Record<UserRole, string>> = {
  SUPERVISOR: "الدعم الفني المراكز",
  SUPPORT_SUPERVISOR: "مشرف الدعم",
  SUPPORT_COORDINATOR: "منسق الدعم",
  FIELD_OPERATIONS_COORDINATOR: "منسق إدارة العمل الميداني",
  ADMIN: "سوبر أدمن",
  DEVELOPER: "مطور",
  SUPPORT_MANAGER: "مدير الدعم",
  SUPPORT_L1: "دعم L1",
  SUPPORT_L2: "دعم L2",
  DATABASE: "فريق قواعد البيانات",
  DEVOPS: "فريق DevOps",
  GIS: "فريق GIS",
  CALL_CENTER: "مركز الاتصال",
};

export function timelineRoleLabel(role?: UserRole | null): string | undefined {
  if (!role) return undefined;
  return USER_ROLE_TIMELINE_LABELS[role] ?? role;
}

export async function resolveTimelineRoleLabel(
  actorId?: string
): Promise<string | undefined> {
  if (!actorId) return undefined;
  const user = await prisma.user.findUnique({
    where: { id: actorId },
    select: { role: true },
  });
  return timelineRoleLabel(user?.role);
}

export function formatStatusChangeDetails(
  from: CaseStatus,
  to: CaseStatus,
  note?: string
): string {
  const base = `${STATUS_CHANGE_MARKER}${from}→${to}`;
  return note?.trim() ? `${base}\n${note.trim()}` : base;
}

export function appendTimelineMeta(
  body: string | undefined,
  meta: {
    role?: string;
    reassignFrom?: string;
    reassignTo?: string;
  }
): string | undefined {
  const lines: string[] = [];
  if (meta.role) lines.push(`${ROLE_MARKER}${meta.role}`);
  if (meta.reassignFrom && meta.reassignTo) {
    lines.push(`${REASSIGN_MARKER}${meta.reassignFrom}→${meta.reassignTo}`);
  }
  if (body?.trim()) lines.push(body.trim());
  return lines.length ? lines.join("\n") : undefined;
}

export function parseStatusChangeDetails(details?: string): {
  from: CaseStatus;
  to: CaseStatus;
  note?: string;
} | null {
  const body = stripTimelineMeta(details).body;
  if (!body?.startsWith(STATUS_CHANGE_MARKER)) return null;
  const rest = body.slice(STATUS_CHANGE_MARKER.length);
  const [transition, ...noteParts] = rest.split("\n");
  const [from, to] = transition.split("→") as [CaseStatus?, CaseStatus?];
  if (!from || !to) return null;
  return { from, to, note: noteParts.join("\n").trim() || undefined };
}

export function stripTimelineMeta(details?: string): {
  body?: string;
  role?: string;
  reassignFrom?: string;
  reassignTo?: string;
} {
  if (!details) return {};
  const lines = details.split("\n");
  let role: string | undefined;
  let reassignFrom: string | undefined;
  let reassignTo: string | undefined;
  const bodyLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith(ROLE_MARKER)) {
      role = line.slice(ROLE_MARKER.length).trim();
      continue;
    }
    if (line.startsWith(REASSIGN_MARKER)) {
      const [from, to] = line.slice(REASSIGN_MARKER.length).split("→");
      reassignFrom = from?.trim();
      reassignTo = to?.trim();
      continue;
    }
    bodyLines.push(line);
  }

  return {
    body: bodyLines.join("\n").trim() || undefined,
    role,
    reassignFrom,
    reassignTo,
  };
}

export async function logCaseStatusChange(params: {
  caseId: string;
  fromStatus: CaseStatus;
  toStatus: CaseStatus;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  note?: string;
}) {
  if (params.fromStatus === params.toStatus) return;

  const role =
    params.actorRole ?? (await resolveTimelineRoleLabel(params.actorId));

  await prisma.caseTimelineEvent.create({
    data: {
      caseId: params.caseId,
      action: "تغيير الحالة",
      details: appendTimelineMeta(
        formatStatusChangeDetails(
          params.fromStatus,
          params.toStatus,
          params.note
        ),
        { role }
      ),
      actorId: params.actorId,
      actorName: params.actorName,
    },
  });
}

export async function logCaseAssignment(params: {
  caseId: string;
  assigneeName: string;
  assigneeTeam?: string | null;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  note?: string;
}) {
  const role =
    params.actorRole ?? (await resolveTimelineRoleLabel(params.actorId));

  const label = params.assigneeTeam
    ? `${params.assigneeName} — ${params.assigneeTeam}`
    : params.assigneeName;

  await prisma.caseTimelineEvent.create({
    data: {
      caseId: params.caseId,
      action: "إسناد",
      details: appendTimelineMeta(
        params.note ? `${label}\n${params.note}` : label,
        { role }
      ),
      actorId: params.actorId,
      actorName: params.actorName,
    },
  });
}

export async function logCaseReassignment(params: {
  caseId: string;
  fromName: string;
  toName: string;
  toTeam?: string | null;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  reason?: string;
}) {
  const role =
    params.actorRole ?? (await resolveTimelineRoleLabel(params.actorId));

  const toLabel = params.toTeam
    ? `${params.toName} — ${params.toTeam}`
    : params.toName;
  const reason = params.reason?.trim();

  await prisma.caseTimelineEvent.create({
    data: {
      caseId: params.caseId,
      action: "إعادة إسناد",
      details: appendTimelineMeta(
        reason ? `${toLabel}\n${reason}` : toLabel,
        {
          role,
          reassignFrom: params.fromName,
          reassignTo: params.toName,
        }
      ),
      actorId: params.actorId,
      actorName: params.actorName,
    },
  });
}

export async function logCaseTimelineEvent(params: {
  caseId: string;
  action: string;
  details?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  reassignFrom?: string;
  reassignTo?: string;
}) {
  const role =
    params.actorRole ?? (await resolveTimelineRoleLabel(params.actorId));

  await prisma.caseTimelineEvent.create({
    data: {
      caseId: params.caseId,
      action: params.action,
      details: appendTimelineMeta(params.details, {
        role,
        reassignFrom: params.reassignFrom,
        reassignTo: params.reassignTo,
      }),
      actorId: params.actorId,
      actorName: params.actorName,
    },
  });
}
