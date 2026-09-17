import type {
  CaseType,
  CaseStatus,
  CaseSeverity,
  IssuePriority,
  DeploymentStatus,
  TestingStatus,
  KnowledgeValue,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Case, CaseComment, CaseTimelineEvent, CaseDecision, CaseAttachment, SimpleCaseStatus } from "@/lib/cases/types";
import { caseStatusesForSimple, caseCanClassifyAndAssign } from "@/lib/cases/types";
import { fieldOpsPrismaFilter } from "@/lib/field-ops-visibility";
import { logCaseStatusChange, logCaseAssignment, logCaseReassignment, logCaseTimelineEvent, appendTimelineMeta, timelineRoleLabel } from "@/lib/cases/timeline-log";
import { generatePrefixedTicketNumber } from "@/lib/ticket-numbers";
import {
  isInfrastructureAffectedSystem,
  resolveCoordinatorForReport,
} from "@/lib/coordinator-routing";
import { assignedCoordinatorScopeWhere } from "@/lib/coordinator-case-scope";
import { censusSystemToLabel, normalizeCensusSystem } from "@/lib/types";

const caseInclude = {
  createdBy: true,
  assignedDeveloper: true,
  assignedCoordinator: true,
  solvedBy: true,
  sourceReport: true,
  linkedIssue: true,
  comments: { include: { author: true }, orderBy: { createdAt: "asc" as const } },
  timeline: { orderBy: { createdAt: "asc" as const } },
  decisions: { orderBy: { createdAt: "desc" as const } },
  attachments: { orderBy: { createdAt: "asc" as const } },
};

/** Lightweight relations for list/dashboard views — avoids loading comments/timeline per row */
const caseListInclude = {
  createdBy: true,
  assignedDeveloper: true,
  assignedCoordinator: true,
  solvedBy: true,
  sourceReport: true,
  linkedIssue: true,
};

type DbCase = Prisma.CaseGetPayload<{ include: typeof caseInclude }>;
type DbCaseListItem = Prisma.CaseGetPayload<{ include: typeof caseListInclude }>;

function assignDeveloperPatch(developerId: string) {
  return { assignedDeveloperId: developerId, assignedAt: new Date() };
}

function clearDeveloperPatch() {
  return { assignedDeveloperId: null, assignedAt: null };
}

function parseGovernorates(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function mapCaseToClient(c: DbCase | DbCaseListItem): Case {
  const gov = parseGovernorates(c.affectedGovernorates);
  return {
    id: c.id,
    number: c.number,
    title: c.title,
    description: c.description,
    caseType: c.caseType as Case["caseType"],
    status: c.status as Case["status"],
    priority: c.priority as Case["priority"],
    severity: c.severity as Case["severity"],
    sourceReportId: c.sourceReportId ?? undefined,
    sourceReportNumber: c.sourceReport?.number,
    linkedIssueId: c.linkedIssueId ?? undefined,
    linkedIssueNumber: c.linkedIssue?.number,
    affectedUsers: c.affectedUsers,
    affectedGovernorates: gov.length ? gov : [c.governorate],
    affectedSystem: c.affectedSystem,
    suggestedTeam: c.suggestedTeam ?? undefined,
    assignedTeam: c.assignedTeam ?? undefined,
    assignedDeveloperId: c.assignedDeveloperId ?? undefined,
    assignedDeveloperName: c.assignedDeveloper?.name,
    assignedDeveloperRole: c.assignedDeveloper?.role,
    assignedDeveloperTeam: c.assignedDeveloper?.team ?? undefined,
    assignedCoordinatorId: c.assignedCoordinatorId ?? undefined,
    assignedCoordinatorName: c.assignedCoordinator?.name,
    deploymentStatus: c.deploymentStatus as Case["deploymentStatus"],
    testingStatus: c.testingStatus as Case["testingStatus"],
    resolutionNotes: c.resolutionNotes ?? undefined,
    resolutionType: c.resolutionType ?? undefined,
    timeSpentMinutes: c.timeSpentMinutes ?? undefined,
    solvedBy: c.solvedById ?? undefined,
    solvedByName: c.solvedBy?.name,
    knowledgeArticleId: c.knowledgeArticleId ?? undefined,
    knowledgeValue: c.knowledgeValue as Case["knowledgeValue"],
    duplicateOfCaseId: c.duplicateOfCaseId ?? undefined,
    mergedIntoCaseId: c.mergedIntoCaseId ?? undefined,
    createdBy: c.createdById,
    createdByName: c.createdBy.name,
  createdByRole: c.createdBy.role as Case["createdByRole"],
    governorate: c.governorate,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export function mapCaseComment(c: DbCase["comments"][number]): CaseComment {
  return {
    id: c.id,
    caseId: c.caseId,
    content: c.content,
    authorId: c.authorId,
    authorName: c.author.name,
    isInternal: c.isInternal,
    createdAt: c.createdAt.toISOString(),
  };
}

export function mapCaseTimeline(t: DbCase["timeline"][number]): CaseTimelineEvent {
  return {
    id: t.id,
    caseId: t.caseId,
    action: t.action,
    details: t.details ?? undefined,
    actorName: t.actorName ?? undefined,
    createdAt: t.createdAt.toISOString(),
  };
}

export function mapCaseDecision(d: DbCase["decisions"][number]): CaseDecision {
  return {
    id: d.id,
    caseId: d.caseId,
    decision: d.decision,
    reason: d.reason ?? undefined,
    decidedBy: d.decidedByName ?? "—",
    decidedAt: d.createdAt.toISOString(),
  };
}

export function mapCaseAttachment(a: DbCase["attachments"][number]): CaseAttachment {
  const kindMap: Record<string, CaseAttachment["kind"]> = {
    IMAGE: "image",
    VIDEO: "video",
    VOICE: "voice",
    PDF: "pdf",
    LOG: "log",
  };
  return {
    id: a.id,
    caseId: a.caseId,
    name: a.name,
    kind: kindMap[a.type] ?? "pdf",
    url: a.url,
    size: a.size ?? undefined,
    uploadedBy: a.uploadedBy ?? "—",
    createdAt: a.createdAt.toISOString(),
  };
}

function mapReportAttachmentToCaseView(
  a: { id: string; name: string; type: string; url: string; size: string | null; createdAt: Date },
  caseId: string
): CaseAttachment {
  const kindMap: Record<string, CaseAttachment["kind"]> = {
    IMAGE: "image",
    VIDEO: "video",
    VOICE: "voice",
    PDF: "pdf",
    LOG: "log",
  };
  return {
    id: `report-${a.id}`,
    caseId,
    name: a.name,
    kind: kindMap[a.type] ?? "pdf",
    url: a.url,
    size: a.size ?? undefined,
    uploadedBy: "من البلاغ",
    createdAt: a.createdAt.toISOString(),
  };
}

/** Case attachments, falling back to linked report attachments for older records */
export async function resolveCaseAttachmentsForClient(
  caseItem: DbCase | DbCaseListItem & { attachments: DbCase["attachments"]; sourceReportId: string | null }
): Promise<CaseAttachment[]> {
  const realCaseAttachments = caseItem.attachments.filter(
    (a) => a.url && !a.url.includes("placeholder")
  );
  if (realCaseAttachments.length > 0) {
    return realCaseAttachments.map(mapCaseAttachment);
  }
  if (!caseItem.sourceReportId) return [];

  const report = await prisma.report.findUnique({
    where: { id: caseItem.sourceReportId },
    include: { attachments: true },
  });
  return (report?.attachments ?? [])
    .filter((a) => a.url && !a.url.includes("placeholder"))
    .map((a) => mapReportAttachmentToCaseView(a, caseItem.id));
}

export async function generateCaseNumber(affectedSystem?: string): Promise<string> {
  return generatePrefixedTicketNumber(affectedSystem);
}

export async function listCases(filters?: {
  search?: string;
  caseType?: CaseType | "ALL";
  status?: CaseStatus | "ALL";
  simpleStatus?: SimpleCaseStatus | "ALL";
  createdById?: string;
  createdByIds?: string[];
  /** حالات أنشأها أعضاء فريق مشرف الدعm + المسندة إليه مباشرة */
  supportSupervisorUserId?: string;
  assignedCoordinatorId?: string;
  limit?: number;
  role?: string | null;
}) {
  const where: Prisma.CaseWhereInput = {};

  const visibilityWhere = fieldOpsPrismaFilter(filters?.role);
  if (visibilityWhere) {
    Object.assign(where, visibilityWhere);
  }

  if (filters?.supportSupervisorUserId) {
    where.OR = [
      { createdBy: { directManagerId: filters.supportSupervisorUserId } },
      { assignedCoordinatorId: filters.supportSupervisorUserId },
    ];
  } else if (filters?.createdByIds?.length) {
    where.createdById = { in: filters.createdByIds };
  } else if (filters?.createdById) {
    where.createdById = filters.createdById;
  }

  if (filters?.assignedCoordinatorId) {
    where.assignedCoordinatorId = filters.assignedCoordinatorId;
  }

  if (filters?.caseType && filters.caseType !== "ALL") {
    where.caseType = filters.caseType;
  }
  if (filters?.simpleStatus && filters.simpleStatus !== "ALL") {
    where.status = { in: caseStatusesForSimple(filters.simpleStatus) as CaseStatus[] };
  } else if (filters?.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  let cases = await prisma.case.findMany({
    where,
    include: caseListInclude,
    orderBy: { updatedAt: "desc" },
    ...(filters?.limit ? { take: filters.limit } : {}),
  });

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    cases = cases.filter(
      (c) =>
        c.number.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }

  return cases;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getCaseSummaryStats(role?: string | null, userId?: string | null) {
  const today = startOfToday();
  const inProgressStatuses = caseStatusesForSimple("IN_PROGRESS");
  const solvedStatuses = caseStatusesForSimple("SOLVED");
  const closedStatuses = caseStatusesForSimple("CLOSED");
  const visibilityWhere = fieldOpsPrismaFilter(role) ?? {};
  const assigneeScope = assignedCoordinatorScopeWhere(role, userId);

  const countWithVisibility = (where: Prisma.CaseWhereInput) =>
    prisma.case.count({ where: { ...where, ...visibilityWhere, ...assigneeScope } });

  const [
    pendingCoordinator,
    awaitingApproval,
    inProgress,
    solved,
    closedToday,
    escalatedToday,
    createdToday,
    waitingDeployment,
    bugsOpen,
  ] = await Promise.all([
    countWithVisibility({ status: "OPEN" }),
    countWithVisibility({ status: "AWAITING_APPROVAL" }),
    countWithVisibility({ status: { in: inProgressStatuses as CaseStatus[] } }),
    countWithVisibility({ status: { in: solvedStatuses as CaseStatus[] } }),
    countWithVisibility({
      status: { in: closedStatuses as CaseStatus[] },
      updatedAt: { gte: today },
    }),
    countWithVisibility({
      status: "AWAITING_APPROVAL",
      updatedAt: { gte: today },
    }),
    countWithVisibility({ createdAt: { gte: today } }),
    countWithVisibility({ status: "WAITING_DEPLOYMENT" }),
    countWithVisibility({
      caseType: "BUG",
      status: { notIn: ["CLOSED", "MERGED"] },
    }),
  ]);

  return {
    pendingCoordinator,
    awaitingApproval,
    inProgress,
    solved,
    closedToday,
    escalatedToday,
    createdToday,
    waitingDeployment,
    bugsOpen,
    totalOpen: pendingCoordinator + awaitingApproval + inProgress + solved,
  };
}

export async function getCaseById(id: string) {
  return prisma.case.findUnique({ where: { id }, include: caseInclude });
}

export async function createCaseManual(data: {
  title?: string;
  description: string;
  caseType: CaseType;
  priority: IssuePriority;
  severity?: CaseSeverity;
  governorate?: string;
  affectedSystem: string;
  affectedUsers?: number;
  createdById: string;
  assignedTeam?: string;
  developerId?: string;
  researcherIssueType?: "TECHNICAL" | "FIELD" | null;
}) {
  const number = await generateCaseNumber(data.affectedSystem);
  const governorate = data.governorate?.trim() || "غير محدد";
  const title = data.title?.trim() || data.description.trim().slice(0, 120);

  let assignedDeveloperId: string | undefined;
  if (data.developerId) {
    assignedDeveloperId = data.developerId;
  }

  const isBug = data.caseType === "BUG";
  const hasAssignee = Boolean(assignedDeveloperId || data.assignedTeam?.trim());
  const status = isBug && hasAssignee ? "IN_PROGRESS" : isBug ? "IN_PROGRESS" : "OPEN";

  const systemKey = normalizeCensusSystem(data.affectedSystem);
  const systemLabel = censusSystemToLabel(systemKey);
  const coordinator =
    status === "OPEN" && governorate !== "غير محدد"
      ? await resolveCoordinatorForReport(
          governorate,
          systemKey,
          data.researcherIssueType ?? undefined
        )
      : null;

  const created = await prisma.case.create({
    data: {
      number,
      title,
      description: data.description,
      caseType: data.caseType,
      status,
      priority: data.priority,
      severity: data.severity ?? "MEDIUM",
      affectedUsers: data.affectedUsers ?? 1,
      affectedGovernorates: JSON.stringify([governorate]),
      affectedSystem: systemLabel,
      assignedTeam: data.assignedTeam,
      ...(assignedDeveloperId ? assignDeveloperPatch(assignedDeveloperId) : {}),
      governorate,
      createdById: data.createdById,
      assignedCoordinatorId: coordinator?.id ?? null,
      timeline: {
        create: {
          action: isBug ? "إنشاء خلل" : "إنشاء يدوي",
          actorId: data.createdById,
          details: assignedDeveloperId || data.assignedTeam ? "تعيين فوري" : undefined,
        },
      },
    },
    include: caseInclude,
  });

  return created;
}

export async function classifyCaseDb(
  caseId: string,
  caseType: CaseType,
  actorId: string,
  actorName: string
) {
  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (!existing) return null;

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      caseType,
      status: caseType === "BUG" ? "AWAITING_APPROVAL" : "IN_PROGRESS",
    },
    include: caseInclude,
  });

  const nextStatus = updated.status;
  if (existing.status !== nextStatus) {
    await logCaseStatusChange({
      caseId,
      fromStatus: existing.status,
      toStatus: nextStatus,
      actorId,
      actorName,
      note: caseType,
    });
  }

  await prisma.caseTimelineEvent.create({
    data: {
      caseId,
      action: "تصنيف الحالة",
      details: caseType,
      actorId,
      actorName,
    },
  });

  await prisma.caseDecision.create({
    data: {
      caseId,
      decision: "CLASSIFIED",
      reason: caseType,
      decidedById: actorId,
      decidedByName: actorName,
    },
  });

  return updated;
}

export async function resolveCaseImmediateDb(data: {
  caseId: string;
  resolutionType: string;
  resolutionNotes: string;
  timeSpentMinutes: number;
  solvedById: string;
  solvedByName: string;
  knowledgeValue?: KnowledgeValue;
}) {
  const existing = await prisma.case.findUnique({ where: { id: data.caseId } });
  if (!existing) throw new Error("Case not found");

  const updated = await prisma.case.update({
    where: { id: data.caseId },
    data: {
      status: "RESOLVED",
      resolutionType: data.resolutionType,
      resolutionNotes: data.resolutionNotes,
      timeSpentMinutes: data.timeSpentMinutes,
      solvedById: data.solvedById,
      knowledgeValue: data.knowledgeValue ?? "MEDIUM",
    },
    include: caseInclude,
  });

  if (existing.status !== "RESOLVED") {
    await logCaseStatusChange({
      caseId: data.caseId,
      fromStatus: existing.status,
      toStatus: "RESOLVED",
      actorId: data.solvedById,
      actorName: data.solvedByName,
      note: data.resolutionType,
    });
  }

  await prisma.caseDecision.create({
    data: {
      caseId: data.caseId,
      decision: "RESOLVED_IMMEDIATE",
      reason: data.resolutionNotes,
      decidedById: data.solvedById,
      decidedByName: data.solvedByName,
    },
  });

  await prisma.caseTimelineEvent.create({
    data: {
      caseId: data.caseId,
      action: "حل فوري",
      details: data.resolutionType,
      actorId: data.solvedById,
      actorName: data.solvedByName,
    },
  });

  return updated;
}

export async function approveCaseAsBugDb(caseId: string, actorId: string, actorName: string) {
  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (!existing) return null;

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: { status: "IN_PROGRESS", caseType: "BUG" },
    include: caseInclude,
  });

  if (existing.status !== "IN_PROGRESS") {
    await logCaseStatusChange({
      caseId,
      fromStatus: existing.status,
      toStatus: "IN_PROGRESS",
      actorId,
      actorName,
    });
  }

  await prisma.caseDecision.create({
    data: {
      caseId,
      decision: "APPROVED_AS_BUG",
      decidedById: actorId,
      decidedByName: actorName,
    },
  });

  await prisma.caseTimelineEvent.create({
    data: {
      caseId,
      action: "موافقة كخلل",
      actorId,
      actorName,
    },
  });

  return updated;
}

/** @deprecated OPEN cases are triaged by support coordinator first */
export async function acceptCaseDb(caseId: string, _actorId: string, _actorName: string) {
  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (!existing || existing.status !== "OPEN") return null;
  return null;
}

/** Step 2: classify + assign to specialty team */
export async function classifyAndAssignCaseDb(
  caseId: string,
  caseType: CaseType,
  actorId: string,
  actorName: string,
  assigneeId?: string,
  opts?: {
    assignedTeam?: string;
    priority?: import("@prisma/client").IssuePriority;
    severity?: import("@prisma/client").CaseSeverity;
    description?: string;
    affectedSystem?: string;
  }
) {
  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (!existing) return null;

  if (!caseCanClassifyAndAssign(existing.status)) {
    return null;
  }

  const isBug = caseType === "BUG";
  const team = opts?.assignedTeam?.trim();
  if (isBug && !assigneeId && !team) {
    throw new Error("يجب اختيار التخصص المسؤول للخلل التقني");
  }

  const classifyNote = caseType;
  const assignLabel = team ?? (assigneeId ? undefined : null);

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      caseType,
      status: "IN_PROGRESS",
      ...(assigneeId ? assignDeveloperPatch(assigneeId) : {}),
      ...(team ? { assignedTeam: team } : {}),
      ...(opts?.priority ? { priority: opts.priority } : {}),
      ...(opts?.severity ? { severity: opts.severity } : {}),
      ...(opts?.description ? { description: opts.description, title: opts.description.slice(0, 120) } : {}),
      ...(opts?.affectedSystem ? { affectedSystem: opts.affectedSystem } : {}),
    },
    include: caseInclude,
  });

  if (existing.status !== "IN_PROGRESS") {
    await logCaseStatusChange({
      caseId,
      fromStatus: existing.status,
      toStatus: "IN_PROGRESS",
      actorId,
      actorName,
      note: classifyNote,
    });
  }

  await logCaseTimelineEvent({
    caseId,
    action: "تصنيف الحالة",
    details: classifyNote,
    actorId,
    actorName,
  });

  if (assignLabel || assigneeId) {
    let assigneeName = assignLabel ?? "Developer";
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (assignee) assigneeName = assignee.name;
    }
    await logCaseAssignment({
      caseId,
      assigneeName,
      assigneeTeam: team ?? (assigneeId ? undefined : assignLabel),
      actorId,
      actorName,
    });
  }

  await prisma.caseDecision.create({
    data: {
      caseId,
      decision: "CLASSIFIED_ASSIGNED",
      reason: classifyNote,
      decidedById: actorId,
      decidedByName: actorName,
    },
  });

  return { updated, assigneeId };
}

/** Manager accepts case, classifies it, optionally assigns developer for bugs */
export async function acceptAndClassifyCaseDb(
  caseId: string,
  caseType: CaseType,
  actorId: string,
  actorName: string,
  developerId?: string
) {
  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (!existing) return null;

  let status: import("@prisma/client").CaseStatus = "IN_PROGRESS";
  if (caseType === "BUG") {
    status = developerId ? "IN_PROGRESS" : "AWAITING_APPROVAL";
  }

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      caseType,
      status,
      ...(caseType === "BUG" && developerId ? assignDeveloperPatch(developerId) : {}),
    },
    include: caseInclude,
  });

  const classifyNote = caseType;

  if (existing.status !== status) {
    await logCaseStatusChange({
      caseId,
      fromStatus: existing.status,
      toStatus: status,
      actorId,
      actorName,
      note: classifyNote,
    });
  }

  await prisma.caseTimelineEvent.create({
    data: {
      caseId,
      action: "قبول وتصنيف",
      details: classifyNote,
      actorId,
      actorName,
    },
  });

  await prisma.caseDecision.create({
    data: {
      caseId,
      decision: "ACCEPTED_CLASSIFIED",
      reason: classifyNote,
      decidedById: actorId,
      decidedByName: actorName,
    },
  });

  if (caseType === "BUG" && developerId) {
    const dev = await prisma.user.findUnique({ where: { id: developerId } });
    if (dev) {
      await logCaseAssignment({
        caseId,
        assigneeName: dev.name,
        assigneeTeam: dev.team,
        actorId,
        actorName,
      });
    }
  }

  return { updated, developerId: caseType === "BUG" ? developerId : undefined };
}

/** Manager dismisses — not a real problem */
export async function dismissNotAProblemDb(
  caseId: string,
  actorId: string,
  actorName: string,
  reason?: string,
  caseType: import("@prisma/client").CaseType = "USER_MISTAKE"
) {
  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (!existing) return null;

  const note = reason?.trim() || "ليست مشكلة — لا تحتاج متابعة";
  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      status: "CLOSED",
      caseType,
      resolutionNotes: note,
      resolutionType: "NOT_A_PROBLEM",
    },
    include: caseInclude,
  });

  if (existing.status !== "CLOSED") {
    await logCaseStatusChange({
      caseId,
      fromStatus: existing.status,
      toStatus: "CLOSED",
      actorId,
      actorName,
      note,
    });
  }

  await logCaseTimelineEvent({
    caseId,
    action: "ليست مشكلة — إغلاق",
    details: note.slice(0, 120),
    actorId,
    actorName,
  });

  await prisma.caseDecision.create({
    data: {
      caseId,
      decision: "NOT_A_PROBLEM",
      reason: note,
      decidedById: actorId,
      decidedByName: actorName,
    },
  });

  return updated;
}

export async function findCaseByReportId(reportId: string) {
  return prisma.case.findFirst({ where: { sourceReportId: reportId } });
}

/** Super admin: confirm problem + assign specialty (from AWAITING_APPROVAL only) */
export async function reviewCaseAsProblemDb(
  caseId: string,
  actorId: string,
  actorName: string,
  opts: {
    assignedTeam: string;
    priority?: import("@prisma/client").IssuePriority;
    severity?: import("@prisma/client").CaseSeverity;
    developerId?: string;
  }
) {
  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (!existing || existing.status !== "AWAITING_APPROVAL") return null;

  const result = await classifyAndAssignCaseDb(
    caseId,
    "BUG",
    actorId,
    actorName,
    opts.developerId,
    { assignedTeam: opts.assignedTeam, priority: opts.priority, severity: opts.severity }
  );
  if (!result) return null;

  if (existing.sourceReportId) {
    await prisma.report.update({
      where: { id: existing.sourceReportId },
      data: {
        status: "CLASSIFIED",
        classification: "BUG",
        reviewedById: actorId,
        reviewedAt: new Date(),
      },
    });
  }

  return result;
}

/** Super admin: not a problem + sync linked report */
export async function reviewCaseNotProblemDb(
  caseId: string,
  actorId: string,
  actorName: string,
  classification: import("@prisma/client").ReportClassification,
  reason: string
) {
  const caseTypeMap: Partial<Record<string, import("@prisma/client").CaseType>> = {
    USER_MISTAKE: "USER_MISTAKE",
    TRAINING_ISSUE: "TRAINING_ISSUE",
    QUESTION: "QUESTION",
    CONFIGURATION_ISSUE: "CONFIGURATION_ISSUE",
    COMPLAINT: "COMPLAINT",
    FEATURE_REQUEST: "FEATURE_REQUEST",
    DUPLICATE: "INTERNAL_NOTE",
    OUT_OF_SCOPE: "INTERNAL_NOTE",
  };
  const caseType = caseTypeMap[classification] ?? "USER_MISTAKE";
  const updated = await dismissNotAProblemDb(caseId, actorId, actorName, reason, caseType);
  if (!updated) return null;

  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (existing?.sourceReportId) {
    await prisma.report.update({
      where: { id: existing.sourceReportId },
      data: {
        status: "REJECTED",
        classification,
        rejectionReason: reason,
        reviewedById: actorId,
        reviewedAt: new Date(),
      },
    });
  }

  return updated;
}

/** Support coordinator: escalate as System Bug → super admin queue */
export async function coordinatorEscalateSystemBugDb(
  caseId: string,
  actorId: string,
  actorName: string,
  note?: string
) {
  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (!existing || existing.status !== "OPEN") return null;

  const details =
    note?.trim() ||
    "تم تصنيف البلاغ كـ System Bug وإرساله للسوبر أدمن للمراجعة والإسناد";

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      status: "AWAITING_APPROVAL",
      caseType: "BUG",
    },
    include: caseInclude,
  });

  await logCaseStatusChange({
    caseId,
    fromStatus: existing.status,
    toStatus: "AWAITING_APPROVAL",
    actorId,
    actorName,
    note: details,
  });

  await logCaseTimelineEvent({
    caseId,
    action: "تصعيد System Bug — منسق الدعم",
    details,
    actorId,
    actorName,
  });

  await prisma.caseDecision.create({
    data: {
      caseId,
      decision: "ESCALATED_SYSTEM_BUG",
      reason: details,
      decidedById: actorId,
      decidedByName: actorName,
    },
  });

  if (existing.sourceReportId) {
    await prisma.report.update({
      where: { id: existing.sourceReportId },
      data: {
        status: "UNDER_REVIEW",
        classification: "BUG",
        reviewedById: actorId,
        reviewedAt: new Date(),
      },
    });
  }

  return updated;
}

/** Support coordinator: not a system bug — close with technical reason */
export async function coordinatorDismissNotSystemBugDb(
  caseId: string,
  actorId: string,
  actorName: string,
  classification: import("@prisma/client").ReportClassification,
  reason: string
) {
  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (!existing || existing.status !== "OPEN") return null;
  return reviewCaseNotProblemDb(caseId, actorId, actorName, classification, reason);
}

export async function closeCaseDb(
  caseId: string,
  actorId: string,
  actorName: string,
  resolutionNotes?: string
) {
  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (!existing) return null;

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      status: "CLOSED",
      resolutionNotes: resolutionNotes ?? undefined,
    },
    include: caseInclude,
  });

  if (existing.status !== "CLOSED") {
    await logCaseStatusChange({
      caseId,
      fromStatus: existing.status,
      toStatus: "CLOSED",
      actorId,
      actorName,
      note: resolutionNotes,
    });
  }

  await prisma.caseDecision.create({
    data: {
      caseId,
      decision: "CLOSED",
      decidedById: actorId,
      decidedByName: actorName,
      reason: resolutionNotes,
    },
  });

  await logCaseTimelineEvent({
    caseId,
    action: "إغلاق الحالة",
    details: resolutionNotes ?? undefined,
    actorId,
    actorName,
  });

  return updated;
}

/** Create Case when supervisor submits field observation */
export async function createCaseFromReport(data: {
  reportId: string;
  reportNumber: string;
  description: string;
  governorate: string;
  affectedUsers: number;
  createdById: string;
  affectedSystem?: string;
  researcherIssueType?: "TECHNICAL" | "FIELD" | null;
  /** منسق الدعم: إسناد للسوبر أدمن أو مشرف الدعم */
  assigneeUserId?: string | null;
}) {
  const report = await prisma.report.findUnique({
    where: { id: data.reportId },
    include: { attachments: true },
  });

  const systemKey = normalizeCensusSystem(data.affectedSystem);
  const systemLabel = censusSystemToLabel(systemKey);
  const number = await generateCaseNumber(systemKey);

  const creator = await prisma.user.findUnique({
    where: { id: data.createdById },
    select: { role: true, name: true },
  });

  const reportAttachments =
    report?.attachments.filter((a) => a.url && !a.url.includes("placeholder")) ?? [];

  type CaseAssignee = {
    id: string;
    name: string;
    role?: import("@prisma/client").UserRole;
  };

  let coordinator: CaseAssignee | null = data.assigneeUserId
    ? await prisma.user.findFirst({
        where: {
          id: data.assigneeUserId,
          isActive: true,
          role: { in: ["ADMIN", "SUPPORT_SUPERVISOR"] },
        },
        select: { id: true, name: true, role: true },
      })
    : null;

  if (!coordinator) {
    coordinator = await resolveCoordinatorForReport(
      data.governorate,
      systemKey,
      data.researcherIssueType
    );
  }

  const assigneeLabel =
    coordinator?.role === "ADMIN"
      ? `${coordinator.name} — السوبر أدمن`
      : coordinator?.role === "SUPPORT_SUPERVISOR"
        ? `${coordinator.name} — مشرف الدعم`
        : data.researcherIssueType === "FIELD"
          ? `${coordinator?.name} — نظام الباحث (فني)`
          : isInfrastructureAffectedSystem(systemKey)
            ? `${coordinator?.name} — البنية التحتية`
            : coordinator
              ? `${coordinator.name} — ${data.governorate}`
              : "";

  return prisma.case.create({
    data: {
      number,
      title: data.description.slice(0, 120),
      description: data.description,
      caseType: "QUESTION",
      status: "OPEN",
      priority: "MEDIUM",
      severity: "MEDIUM",
      sourceReportId: data.reportId,
      affectedUsers: data.affectedUsers,
      affectedGovernorates: JSON.stringify([data.governorate]),
      affectedSystem: systemLabel,
      researcherIssueType: data.researcherIssueType ?? null,
      governorate: data.governorate,
      createdById: data.createdById,
      assignedCoordinatorId: coordinator?.id ?? null,
      attachments:
        reportAttachments.length > 0
          ? {
              create: reportAttachments.map((a) => ({
                name: a.name,
                type: a.type,
                url: a.url,
                size: a.size,
                uploadedBy: creator?.name ?? "الدعم الفني المراكز",
              })),
            }
          : undefined,
      timeline: {
        create: [
          {
            action: "حالة جديدة من الميدان",
            details: appendTimelineMeta(`رقم البلاغ: ${data.reportNumber}`, {
              role: timelineRoleLabel(creator?.role),
            }),
            actorId: data.createdById,
            actorName: creator?.name,
          },
          ...(coordinator
            ? [
                {
                  action: data.assigneeUserId ? "إسناد للمراجعة" : "توجيه للمنسق",
                  details: assigneeLabel,
                  actorName: "النظام",
                },
              ]
            : []),
        ],
      },
    },
    include: caseInclude,
  });
}

export async function markCaseSolvedDb(
  caseId: string,
  actorId: string,
  actorName: string,
  resolutionNotes: string,
  requiresDeployment = false
) {
  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (!existing) throw new Error("Case not found");

  const notes = requiresDeployment
    ? `${resolutionNotes}\n\nRequires deployment — يتطلب نشر`
    : resolutionNotes;

  const nextStatus = requiresDeployment ? "WAITING_DEPLOYMENT" : "RESOLVED";

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      status: nextStatus,
      resolutionNotes: notes,
      solvedById: actorId,
      resolutionType: requiresDeployment ? "إصلاح تقني — يتطلب نشر" : "إصلاح تقني",
      deploymentStatus: requiresDeployment ? "QUEUED" : undefined,
    },
    include: caseInclude,
  });

  if (existing.status !== nextStatus) {
    await logCaseStatusChange({
      caseId,
      fromStatus: existing.status,
      toStatus: nextStatus,
      actorId,
      actorName,
      note: resolutionNotes,
    });
  }

  await logCaseTimelineEvent({
    caseId,
    action: "تم الحل",
    details: resolutionNotes.slice(0, 120),
    actorId,
    actorName,
  });

  return updated;
}

export async function returnCaseToDeveloperDb(
  caseId: string,
  actorId: string,
  actorName: string,
  reason: string
) {
  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (!existing?.assignedDeveloperId) return null;

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      status: "IN_PROGRESS",
      resolutionNotes: null,
    },
    include: caseInclude,
  });

  if (existing.status !== "IN_PROGRESS") {
    await logCaseStatusChange({
      caseId,
      fromStatus: existing.status,
      toStatus: "IN_PROGRESS",
      actorId,
      actorName,
      note: reason,
    });
  }

  await logCaseTimelineEvent({
    caseId,
    action: "إرجاع للمطور",
    details: reason.slice(0, 200),
    actorId,
    actorName,
  });

  await prisma.caseDecision.create({
    data: {
      caseId,
      decision: "RETURNED",
      reason,
      decidedById: actorId,
      decidedByName: actorName,
    },
  });

  return { updated, developerId: existing.assignedDeveloperId };
}

export async function reassignCaseDeveloperDb(
  caseId: string,
  newDeveloperId: string,
  actorId: string,
  actorName: string,
  reason: string
) {
  const dev = await prisma.user.findUnique({ where: { id: newDeveloperId } });
  if (!dev) return null;

  const existing = await prisma.case.findUnique({
    where: { id: caseId },
    include: { assignedDeveloper: true },
  });
  if (!existing) return null;

  const previousName = existing.assignedDeveloper?.name;

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      status: "IN_PROGRESS",
      ...assignDeveloperPatch(newDeveloperId),
    },
    include: caseInclude,
  });

  await logCaseReassignment({
    caseId,
    fromName: previousName ?? "غير محدد",
    toName: dev.name,
    toTeam: dev.team,
    actorId,
    actorName,
    reason,
  });

  await prisma.caseDecision.create({
    data: {
      caseId,
      decision: "REASSIGNED",
      reason,
      decidedById: actorId,
      decidedByName: actorName,
    },
  });

  return { updated, newDeveloperId, previousDeveloperId: existing.assignedDeveloperId };
}

export async function transferCaseCoordinatorDb(
  caseId: string,
  newCoordinatorId: string,
  actorId: string,
  actorName: string,
  reason: string
) {
  const target = await prisma.user.findUnique({ where: { id: newCoordinatorId } });
  if (!target) return null;

  const existing = await prisma.case.findUnique({
    where: { id: caseId },
    include: { assignedCoordinator: true },
  });
  if (!existing || existing.status !== "OPEN") return null;

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: { assignedCoordinatorId: newCoordinatorId },
    include: caseInclude,
  });

  await logCaseReassignment({
    caseId,
    fromName: existing.assignedCoordinator?.name ?? "غير محدد",
    toName: target.name,
    toTeam: target.team,
    actorId,
    actorName,
    reason,
  });

  return {
    updated,
    newCoordinatorId,
    previousCoordinatorId: existing.assignedCoordinatorId,
  };
}

export async function returnCaseToSuperAdminDb(
  caseId: string,
  actorId: string,
  actorName: string,
  reason: string
) {
  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (!existing) return null;

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      status: "AWAITING_APPROVAL",
      ...clearDeveloperPatch(),
      resolutionNotes: null,
    },
    include: caseInclude,
  });

  if (existing.status !== "AWAITING_APPROVAL") {
    await logCaseStatusChange({
      caseId,
      fromStatus: existing.status,
      toStatus: "AWAITING_APPROVAL",
      actorId,
      actorName,
      note: reason,
    });
  }

  await logCaseTimelineEvent({
    caseId,
    action: "إرجاع للسوبر أدمن",
    details: reason.slice(0, 200),
    actorId,
    actorName,
  });

  await prisma.caseDecision.create({
    data: {
      caseId,
      decision: "RETURNED_TO_ADMIN",
      reason,
      decidedById: actorId,
      decidedByName: actorName,
    },
  });

  return updated;
}

export async function addCaseAttachmentDb(data: {
  caseId: string;
  name: string;
  type: "IMAGE" | "VIDEO" | "VOICE" | "PDF" | "LOG";
  url: string;
  size?: number;
  uploadedBy: string;
}) {
  return prisma.caseAttachment.create({
    data: {
      caseId: data.caseId,
      name: data.name,
      type: data.type,
      url: data.url,
      size: data.size ? String(data.size) : null,
      uploadedBy: data.uploadedBy,
    },
  });
}

export async function assignCaseDeveloperDb(
  caseId: string,
  developerId: string,
  assignedById: string,
  assignedByName: string
) {
  const dev = await prisma.user.findUnique({ where: { id: developerId } });
  if (!dev) return null;

  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (!existing) return null;

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      ...assignDeveloperPatch(developerId),
      status: "IN_PROGRESS",
    },
    include: caseInclude,
  });

  if (existing.status !== "IN_PROGRESS") {
    await logCaseStatusChange({
      caseId,
      fromStatus: existing.status,
      toStatus: "IN_PROGRESS",
      actorId: assignedById,
      actorName: assignedByName,
    });
  }

  await logCaseAssignment({
    caseId,
    assigneeName: dev.name,
    assigneeTeam: dev.team,
    actorId: assignedById,
    actorName: assignedByName,
  });

  return updated;
}

export async function addCaseCommentDb(data: {
  caseId: string;
  content: string;
  authorId: string;
  isInternal?: boolean;
}) {
  const author = await prisma.user.findUnique({ where: { id: data.authorId } });
  const comment = await prisma.caseComment.create({
    data: {
      caseId: data.caseId,
      content: data.content,
      authorId: data.authorId,
      isInternal: data.isInternal ?? false,
    },
    include: { author: true },
  });

  await prisma.caseTimelineEvent.create({
    data: {
      caseId: data.caseId,
      action: data.isInternal ? "ملاحظة داخلية" : "تعليق",
      details: data.content.slice(0, 120),
      actorId: data.authorId,
      actorName: author?.name,
    },
  });

  return comment;
}

export async function mergeCasesDb(
  primaryCaseId: string,
  mergeCaseIds: string[],
  actorName: string
) {
  const mergedCases = await prisma.case.findMany({
    where: { id: { in: mergeCaseIds } },
    select: { id: true, status: true, number: true },
  });

  await prisma.case.updateMany({
    where: { id: { in: mergeCaseIds } },
    data: { status: "MERGED", mergedIntoCaseId: primaryCaseId },
  });

  for (const merged of mergedCases) {
    await logCaseStatusChange({
      caseId: merged.id,
      fromStatus: merged.status,
      toStatus: "MERGED",
      actorName,
      note: `دمج في ${primaryCaseId}`,
    });
  }

  await prisma.caseTimelineEvent.create({
    data: {
      caseId: primaryCaseId,
      action: "دمج حالات",
      details: `دمج ${mergeCaseIds.length} حالة`,
      actorName,
    },
  });

  return { success: true, message: `تم دمج ${mergeCaseIds.length} حالة` };
}

export async function getAwaitingApprovalCasesDb() {
  return prisma.case.findMany({
    where: { status: "AWAITING_APPROVAL" },
    include: caseInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function searchCasesGlobal(query: string, limit = 8) {
  const q = query.toLowerCase();
  const cases = await prisma.case.findMany({
    include: caseInclude,
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return cases
    .filter(
      (c) =>
        c.number.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    )
    .slice(0, limit);
}

export type { CaseType, CaseStatus, CaseSeverity, DeploymentStatus, TestingStatus };
