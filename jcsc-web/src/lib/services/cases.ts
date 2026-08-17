import type { Case, CaseType, CaseStatus, CaseDecision, CaseComment, SimpleCaseStatus } from "@/lib/cases/types";
import { caseStatusesForSimple } from "@/lib/cases/types";
import type { IssuePriority } from "@/lib/types";
import {
  mockCases,
  mockCaseComments,
  mockCaseTimeline,
  mockCaseDecisions,
  mockCaseAttachments,
  mockAuditLog,
  mockEmailTemplates,
  mockShiftHandoversMutable,
} from "@/lib/mock-data/cases";
import { mockReports } from "@/lib/mock-data/reports";
import { mockIssues, mockUsers } from "@/lib/mock-data";
import { mockPrefixedTicketNumber } from "@/lib/ticket-numbers";
import { queueEmail } from "@/lib/email/engine";
import { ASSIGNEE_NAMES, sortAssigneesByName } from "@/lib/assignees";
import { isTechnicalAssigneeRole } from "@/lib/developer-specialties";
import { withBasePath } from "@/lib/base-path";

export interface CaseFilters {
  search?: string;
  caseType?: CaseType | "ALL";
  status?: CaseStatus | "ALL";
  simpleStatus?: SimpleCaseStatus | "ALL";
  team?: string;
  mine?: boolean;
  limit?: number;
}

function delay(ms = 100) {
  return new Promise((r) => setTimeout(r, ms));
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(withBasePath(path), {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error?: string };

async function apiFetchResult<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(withBasePath(path), {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, status: res.status, error: body.error };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 0 };
  }
}

type CaseDetailResponse = {
  case: Case;
  comments: CaseComment[];
  timeline: import("@/lib/cases/types").CaseTimelineEvent[];
  decisions: CaseDecision[];
  attachments: import("@/lib/cases/types").CaseAttachment[];
};

export async function getCases(filters?: CaseFilters): Promise<Case[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.caseType) params.set("caseType", filters.caseType);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.simpleStatus) params.set("simpleStatus", filters.simpleStatus);
  if (filters?.mine) params.set("mine", "true");
  if (filters?.limit) params.set("limit", String(filters.limit));

  const result = await apiFetchResult<Case[]>(`/api/cases?${params.toString()}`);
  if (result.ok) return result.data;
  // API responded with error — don't show fake mock data (especially 403)
  if (result.status > 0) return [];

  await delay();
  let items = [...mockCases];
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    items = items.filter(
      (c) =>
        c.number.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }
  if (filters?.caseType && filters.caseType !== "ALL") {
    items = items.filter((c) => c.caseType === filters.caseType);
  }
  if (filters?.status && filters.status !== "ALL") {
    items = items.filter((c) => c.status === filters.status);
  }
  if (filters?.simpleStatus && filters.simpleStatus !== "ALL") {
    const allowed = caseStatusesForSimple(filters.simpleStatus);
    items = items.filter((c) => allowed.includes(c.status));
  }
  return items.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getCaseById(id: string): Promise<Case | null> {
  const result = await apiFetchResult<CaseDetailResponse>(`/api/cases/${id}`);
  if (result.ok && result.data.case) return result.data.case;
  // API responded — don't mix mock data with real DB ids
  if (!result.ok && result.status > 0) return null;

  await delay();
  return mockCases.find((c) => c.id === id) ?? null;
}

export async function getCaseComments(caseId: string) {
  const api = await apiFetch<CaseDetailResponse>(`/api/cases/${caseId}`);
  if (api?.comments) return api.comments;

  await delay();
  return mockCaseComments.filter((c) => c.caseId === caseId);
}

export async function getCaseTimeline(caseId: string) {
  const api = await apiFetch<CaseDetailResponse>(`/api/cases/${caseId}`);
  if (api?.timeline) return api.timeline;

  await delay();
  return mockCaseTimeline.filter((t) => t.caseId === caseId);
}

export async function getCaseDecisions(caseId: string) {
  const api = await apiFetch<CaseDetailResponse>(`/api/cases/${caseId}`);
  if (api?.decisions) return api.decisions;

  await delay();
  return mockCaseDecisions.filter((d) => d.caseId === caseId);
}

export async function getCaseAttachments(caseId: string) {
  const api = await apiFetch<CaseDetailResponse>(`/api/cases/${caseId}`);
  if (api?.attachments) return api.attachments;

  await delay();
  return mockCaseAttachments.filter((a) => a.caseId === caseId);
}

export async function getAwaitingApprovalCases(): Promise<Case[]> {
  const api = await apiFetch<Case[]>("/api/cases?awaiting=true");
  if (api) return api;

  await delay();
  return mockCases.filter((c) => c.status === "AWAITING_APPROVAL");
}

export async function getCasesByStatus(status: CaseStatus): Promise<Case[]> {
  await delay();
  return mockCases.filter((c) => c.status === status);
}

export async function createCaseManual(data: {
  title?: string;
  description: string;
  caseType: CaseType;
  priority?: IssuePriority;
  severity?: import("@/lib/cases/types").CaseSeverity;
  governorate?: string;
  affectedSystem: string;
  affectedUsers?: number;
  createdBy: string;
  createdByName: string;
  assignedTeam?: string;
  developerId?: string;
}): Promise<Case> {
  const result = await apiFetchResult<Case>("/api/cases", {
    method: "POST",
    body: JSON.stringify({
      description: data.description,
      caseType: data.caseType,
      priority: data.priority,
      severity: data.severity,
      governorate: data.governorate,
      affectedSystem: data.affectedSystem,
      affectedUsers: data.affectedUsers,
      assignedTeam: data.assignedTeam,
      developerId: data.developerId,
    }),
  });

  if (result.ok) return result.data;

  if (result.status === 401) {
    throw new Error("انتهت الجلسة — سجّل الدخول مجدداً");
  }
  if (result.status === 403) {
    throw new Error("ليس لديك صلاحية إنشاء حالة");
  }
  if (result.status > 0) {
    throw new Error(result.error ?? "فشل إنشاء الحالة — حاول مجدداً");
  }

  // Offline / no API — mock fallback only when network unavailable
  await delay(300);
  const num = mockCases.length + 1;
  const existingNumbers = mockCases.map((c) => c.number);
  const c: Case = {
    id: `case${num}`,
    number: mockPrefixedTicketNumber(data.affectedSystem, existingNumbers),
    title: data.description.trim().slice(0, 120),
    description: data.description,
    caseType: data.caseType,
    status: data.caseType === "BUG" ? "OPEN" : "IN_PROGRESS",
    priority: data.priority ?? "MEDIUM",
    severity: data.severity ?? (data.priority === "CRITICAL" ? "CRITICAL" : data.priority === "HIGH" ? "HIGH" : "MEDIUM"),
    affectedUsers: data.affectedUsers ?? 1,
    affectedGovernorates: [data.governorate ?? "غير محدد"],
    affectedSystem: data.affectedSystem,
    assignedTeam: data.assignedTeam,
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    governorate: data.governorate ?? "غير محدد",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockCases.unshift(c);
  mockCaseTimeline.unshift({
    id: `ct-new-${num}`,
    caseId: c.id,
    action: "إنشاء يدوي",
    actorName: data.createdByName,
    createdAt: new Date().toISOString(),
  });
  await queueEmail("case_assigned", { caseNumber: c.number, title: c.title });
  return c;
}

export async function resolveCaseImmediate(data: {
  caseId: string;
  resolutionType: string;
  resolutionNotes: string;
  timeSpentMinutes: number;
  solvedBy: string;
  solvedByName: string;
  knowledgeValue?: "HIGH" | "MEDIUM" | "LOW" | "NONE";
}): Promise<Case | null> {
  const api = await apiFetch<Case>(`/api/cases/${data.caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "resolve", ...data }),
  });
  if (api) return api;

  await delay(200);
  const idx = mockCases.findIndex((c) => c.id === data.caseId);
  if (idx === -1) return null;
  mockCases[idx] = {
    ...mockCases[idx],
    status: "RESOLVED",
    resolutionType: data.resolutionType,
    resolutionNotes: data.resolutionNotes,
    timeSpentMinutes: data.timeSpentMinutes,
    solvedBy: data.solvedBy,
    solvedByName: data.solvedByName,
    knowledgeValue: data.knowledgeValue ?? "MEDIUM",
    updatedAt: new Date().toISOString(),
  };
  mockCaseDecisions.push({
    id: `cd-${Date.now()}`,
    caseId: data.caseId,
    decision: "RESOLVED_IMMEDIATE",
    reason: data.resolutionNotes,
    decidedBy: data.solvedByName,
    decidedAt: new Date().toISOString(),
  });
  return mockCases[idx];
}

export async function approveCaseAsBug(
  caseId: string,
  approvedBy: string
): Promise<Case | null> {
  const api = await apiFetch<Case>(`/api/cases/${caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "approve" }),
  });
  if (api) return api;

  await delay(200);
  const idx = mockCases.findIndex((c) => c.id === caseId);
  if (idx === -1) return null;
  mockCases[idx] = {
    ...mockCases[idx],
    status: "IN_PROGRESS",
    caseType: "BUG",
    updatedAt: new Date().toISOString(),
  };
  mockCaseDecisions.push({
    id: `cd-ap-${Date.now()}`,
    caseId,
    decision: "APPROVED_AS_BUG",
    decidedBy: approvedBy,
    decidedAt: new Date().toISOString(),
  });
  return mockCases[idx];
}

export async function mergeReports(
  primaryReportId: string,
  mergeReportIds: string[],
  _mergedBy: string
): Promise<{ success: boolean; message: string }> {
  if (mergeReportIds.length === 0) {
    throw new Error("اختر بلاغاً واحداً على الأقل للدمج");
  }
  throw new Error("دمج البلاغات غير متاح حالياً — استخدم دمج الحالات من صفحة الحالات");
}

export async function mergeCases(
  primaryCaseId: string,
  mergeCaseIds: string[],
  mergedBy: string
): Promise<{ success: boolean; message: string }> {
  const api = await apiFetch<{ success: boolean; message: string }>("/api/cases/merge", {
    method: "POST",
    body: JSON.stringify({ primaryCaseId, mergeCaseIds }),
  });
  if (api) return api;

  await delay(300);
  for (const id of mergeCaseIds) {
    const idx = mockCases.findIndex((c) => c.id === id);
    if (idx !== -1) {
      mockCases[idx] = {
        ...mockCases[idx],
        status: "MERGED",
        mergedIntoCaseId: primaryCaseId,
        updatedAt: new Date().toISOString(),
      };
    }
  }
  return {
    success: true,
    message: `تم دمج ${mergeCaseIds.length} حالة في ${primaryCaseId} بواسطة ${mergedBy}`,
  };
}

export async function globalSearch(query: string) {
  const q = query.toLowerCase();
  if (!q.trim()) return { cases: [], reports: [], issues: [], users: [], articles: [] };

  const apiCases = await apiFetch<Case[]>(`/api/cases?search=${encodeURIComponent(query)}`);
  const casesFromApi = apiCases?.slice(0, 8);

  await delay(150);

  return {
    cases:
      casesFromApi ??
      mockCases
        .filter(
          (c) =>
            c.number.toLowerCase().includes(q) ||
            c.title.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q)
        )
        .slice(0, 8),
    reports: mockReports.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.observation.toLowerCase().includes(q)
    ).slice(0, 8),
    issues: mockIssues.filter(
      (i) =>
        i.number.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q)
    ).slice(0, 8),
    users: mockUsers.filter(
      (u) => u.name.includes(q) || u.email.toLowerCase().includes(q)
    ).slice(0, 5),
    articles: [] as { id: string; title: string }[],
  };
}

export async function getAuditLog(limit = 50) {
  await delay();
  return mockAuditLog.slice(0, limit);
}

export async function getDecisionLog() {
  await delay();
  return mockCaseDecisions.sort(
    (a, b) => new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime()
  );
}

export async function getEmailTemplates() {
  await delay();
  return mockEmailTemplates;
}

export async function submitShiftHandover(data: {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  notes: string;
  openCases: number;
  criticalCases: number;
}) {
  await delay(300);
  const entry = {
    id: `sh-${Date.now()}`,
    fromUserId: data.fromUserId,
    fromUserName: data.fromUserName,
    toUserId: data.toUserId,
    toUserName: data.toUserName,
    shiftDate: new Date().toLocaleDateString("ar-JO"),
    summary: "وردية",
    openTickets: data.openCases,
    criticalTickets: data.criticalCases,
    openCases: data.openCases,
    notes: data.notes,
    createdAt: new Date().toISOString(),
  };
  mockShiftHandoversMutable.unshift(entry);
  await queueEmail("shift_handover", {
    fromUser: data.fromUserName,
    toUser: data.toUserName,
    shiftDate: entry.shiftDate,
    notes: data.notes,
  });
  return entry;
}

export async function getShiftHandoversExtended() {
  await delay();
  return mockShiftHandoversMutable;
}

export async function suggestAssignment(team: string) {
  await delay(100);
  const devs = mockUsers.filter(
    (u) =>
      u.isActive &&
      u.role === "DEVELOPER" &&
      (u.team?.includes(team) || team === "ALL")
  );
  return devs.map((d, i) => ({
    userId: d.id,
    name: d.name,
    team: d.team ?? "",
    workload: (i + 1) * 2,
    specialtyMatch: 0.9 - i * 0.1,
  }));
}

export async function getRecentCaseActivity(limit = 12) {
  await delay(50);
  const caseById = new Map(mockCases.map((c) => [c.id, c]));
  return [...mockCaseTimeline]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map((t) => ({
      ...t,
      caseNumber: caseById.get(t.caseId)?.number,
      caseTitle: caseById.get(t.caseId)?.title,
    }));
}

export type { CaseDecision };

export async function classifyCase(
  caseId: string,
  caseType: CaseType,
  classifiedBy: string
): Promise<Case | null> {
  const api = await apiFetch<Case>(`/api/cases/${caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "classify", caseType }),
  });
  if (api) return api;

  await delay(200);
  const idx = mockCases.findIndex((c) => c.id === caseId);
  if (idx === -1) return null;
  mockCases[idx] = {
    ...mockCases[idx],
    caseType,
    status: caseType === "BUG" ? "AWAITING_APPROVAL" : "IN_PROGRESS",
    updatedAt: new Date().toISOString(),
  };
  mockCaseTimeline.unshift({
    id: `ct-cl-${Date.now()}`,
    caseId,
    action: "تصنيف الحالة",
    details: caseType,
    actorName: classifiedBy,
    createdAt: new Date().toISOString(),
  });
  mockCaseDecisions.push({
    id: `cd-cl-${Date.now()}`,
    caseId,
    decision: "CLASSIFIED",
    reason: caseType,
    decidedBy: classifiedBy,
    decidedAt: new Date().toISOString(),
  });
  return mockCases[idx];
}

async function apiFetchOrThrow<T>(path: string, init?: RequestInit): Promise<T> {
  const result = await apiFetchResult<T>(path, init);
  if (!result.ok) {
    throw new Error(result.error ?? (result.status === 403 ? "غير مصرح" : `خطأ ${result.status || "شبكة"}`));
  }
  return result.data;
}

export async function acceptCase(caseId: string): Promise<Case | null> {
  return apiFetchOrThrow<Case>(`/api/cases/${caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "accept_case" }),
  });
}

export async function classifyAndAssignCase(
  caseId: string,
  caseType: CaseType,
  opts?: {
    assigneeId?: string;
    assignedTeam?: string;
    priority?: IssuePriority;
    severity?: import("@/lib/cases/types").CaseSeverity;
  }
): Promise<Case | null> {
  return apiFetchOrThrow<Case>(`/api/cases/${caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({
      action: "classify_and_assign",
      caseType,
      assigneeId: opts?.assigneeId,
      assignedTeam: opts?.assignedTeam,
      priority: opts?.priority,
      severity: opts?.severity,
    }),
  });
}

export async function acceptAndClassifyCase(
  caseId: string,
  caseType: CaseType,
  developerId?: string
): Promise<Case | null> {
  return apiFetchOrThrow<Case>(`/api/cases/${caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({
      action: "accept_classify",
      caseType,
      developerId,
    }),
  });
}

export async function dismissNotAProblem(
  caseId: string,
  reason?: string
): Promise<Case | null> {
  return apiFetchOrThrow<Case>(`/api/cases/${caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "dismiss_not_problem", reason }),
  });
}

export async function addCaseComment(data: {
  caseId: string;
  content: string;
  authorId: string;
  authorName: string;
  isInternal?: boolean;
}): Promise<CaseComment> {
  const api = await apiFetch<CaseComment>(`/api/cases/${data.caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({
      action: "comment",
      content: data.content,
      isInternal: data.isInternal,
    }),
  });
  if (api) return api;

  await delay(150);
  const comment = {
    id: `cc-${Date.now()}`,
    caseId: data.caseId,
    content: data.content,
    authorId: data.authorId,
    authorName: data.authorName,
    isInternal: data.isInternal ?? false,
    createdAt: new Date().toISOString(),
  };
  mockCaseComments.unshift(comment);
  mockCaseTimeline.unshift({
    id: `ct-cm-${Date.now()}`,
    caseId: data.caseId,
    action: data.isInternal ? "ملاحظة داخلية" : "تعليق",
    details: data.content.slice(0, 80),
    actorName: data.authorName,
    createdAt: new Date().toISOString(),
  });
  return comment;
}

export async function closeCase(
  caseId: string,
  closedBy: string,
  resolutionNotes?: string
): Promise<Case | null> {
  return apiFetchOrThrow<Case>(`/api/cases/${caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "close", resolutionNotes }),
  });
}

export async function assignCaseDeveloper(
  caseId: string,
  developerId: string,
  developerName: string,
  assignedBy: string
): Promise<Case | null> {
  const api = await apiFetch<Case>(`/api/cases/${caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "assign", developerId }),
  });
  if (api) return api;

  await delay(150);
  const idx = mockCases.findIndex((c) => c.id === caseId);
  if (idx === -1) return null;
  mockCases[idx] = {
    ...mockCases[idx],
    assignedDeveloperId: developerId,
    assignedDeveloperName: developerName,
    status: "IN_PROGRESS",
    updatedAt: new Date().toISOString(),
  };
  mockCaseTimeline.unshift({
    id: `ct-as-${Date.now()}`,
    caseId,
    action: "تعيين مطور",
    details: developerName,
    actorName: assignedBy,
    createdAt: new Date().toISOString(),
  });
  await queueEmail("case_assigned", {
    caseNumber: mockCases[idx].number,
    title: mockCases[idx].title,
    assignee: developerName,
  });
  return mockCases[idx];
}

export async function markCaseSolved(
  caseId: string,
  resolutionNotes: string,
  requiresDeployment = false
): Promise<Case | null> {
  return apiFetchOrThrow<Case>(`/api/cases/${caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "mark_solved", resolutionNotes, requiresDeployment }),
  });
}

export async function returnCaseToDeveloper(
  caseId: string,
  reason: string
): Promise<Case | null> {
  return apiFetchOrThrow<Case>(`/api/cases/${caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "return", reason }),
  });
}

export async function reassignCaseDeveloper(
  caseId: string,
  developerId: string,
  reason: string
): Promise<Case | null> {
  return apiFetchOrThrow<Case>(`/api/cases/${caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "reassign", developerId, reason }),
  });
}

export async function returnCaseToSuperAdmin(
  caseId: string,
  reason: string
): Promise<Case | null> {
  return apiFetchOrThrow<Case>(`/api/cases/${caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "return_to_admin", reason }),
  });
}

export async function getAssignableUsers() {
  return getDeveloperUsers();
}

export async function getDeveloperUsers() {
  const { getUsersWithPermissions } = await import("@/lib/services/users");
  const users = await getUsersWithPermissions();
  return sortAssigneesByName(
    users.filter(
      (u) =>
        u.isActive &&
        isTechnicalAssigneeRole(u.role) &&
        (ASSIGNEE_NAMES as readonly string[]).includes(u.name)
    )
  );
}

export async function coordinatorEscalateSystemBug(caseId: string, note?: string) {
  return apiFetchOrThrow<Case>(`/api/cases/${caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "coordinator_escalate_system_bug", note }),
  });
}

export async function coordinatorDismissNotSystemBug(
  caseId: string,
  classification: string,
  reason: string
) {
  return apiFetchOrThrow<Case>(`/api/cases/${caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({
      action: "coordinator_dismiss_not_system",
      classification,
      reason,
    }),
  });
}

export async function reviewCaseAsProblem(
  caseId: string,
  developerId: string,
  priority?: IssuePriority,
  severity?: import("@/lib/cases/types").CaseSeverity
) {
  return apiFetchOrThrow<Case>(`/api/cases/${caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "review_problem", developerId, priority, severity }),
  });
}

export async function reviewCaseNotProblem(
  caseId: string,
  classification: string,
  reason: string
) {
  return apiFetchOrThrow<Case>(`/api/cases/${caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "review_not_problem", classification, reason }),
  });
}

export async function addCaseAttachment(
  caseId: string,
  name: string,
  type: "IMAGE" | "PDF" | "VIDEO" | "VOICE" | "LOG" = "IMAGE",
  url?: string,
  size?: number
): Promise<void> {
  const api = await apiFetch<{ id: string }>(`/api/cases/${caseId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "add_attachment", name, type, url, size }),
  });
  if (api) return;

  await delay(100);
  mockCaseAttachments.unshift({
    id: `ca-${Date.now()}`,
    caseId,
    name,
    kind: type === "IMAGE" ? "image" : "pdf",
    url: url ?? "/uploads/placeholder",
    uploadedBy: "مستخدم",
    createdAt: new Date().toISOString(),
  });
}
