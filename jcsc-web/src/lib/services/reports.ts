import type {

  FieldReport,

  ReportStatus,

  ConvertReportPayload,

  RoutingRule,

  OperationsDashboard,

  RolePermission,

} from "@/lib/reports";

import {

  mockReports,

  mockRoutingRules,

  buildOperationsDashboard,

  recommendRouting,

} from "@/lib/mock-data/reports";

import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/reports";

import { mockTickets } from "@/lib/mock-data";

import type { Ticket } from "@/lib/types";



function delay(ms = 100) {

  return new Promise((resolve) => setTimeout(resolve, ms));

}



import { apiFetchResult, apiFetchOrThrow, shouldUseMockFallback } from "@/lib/api-client";
import { withBasePath } from "@/lib/base-path";



export interface ReportFilters {

  status?: ReportStatus | "ALL";

  search?: string;

  governorate?: string;

}



export async function getReports(filters?: ReportFilters): Promise<FieldReport[]> {

  const params = new URLSearchParams();

  if (filters?.status) params.set("status", filters.status);

  if (filters?.search) params.set("search", filters.search);

  if (filters?.governorate) params.set("governorate", filters.governorate);



  const result = await apiFetchResult<FieldReport[]>(`/api/reports?${params}`);

  if (result.ok) return result.data;

  if (!shouldUseMockFallback(result.status)) return [];



  await delay();

  let reports = [...mockReports].map((r) => ({ ...r, enumeratorsAffected: r.enumeratorsAffected ?? 1 }));

  if (filters?.status && filters.status !== "ALL") {
    reports = reports.filter((r) => r.status === filters.status);
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    reports = reports.filter(
      (r) =>
        r.observation.toLowerCase().includes(q) ||
        r.number.toLowerCase().includes(q) ||
        r.supervisorName.includes(q)
    );
  }

  if (filters?.governorate && filters.governorate !== "ALL") {
    reports = reports.filter((r) => r.governorate === filters.governorate);
  }

  return reports.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}



export async function getReportById(id: string): Promise<FieldReport | null> {
  const result = await apiFetchResult<FieldReport>(`/api/reports/${id}`);

  if (result.ok) return result.data;

  if (result.status === 404) return null;

  if (!shouldUseMockFallback(result.status)) return null;

  await delay();
  return mockReports.find((r) => r.id === id) ?? null;
}



export async function getOperationsDashboard(): Promise<OperationsDashboard> {

  await delay();

  return buildOperationsDashboard(mockReports.map((r) => ({ ...r, enumeratorsAffected: r.enumeratorsAffected ?? 1 })));

}



export async function getRoutingRules(): Promise<RoutingRule[]> {
  const result = await apiFetchResult<RoutingRule[]>("/api/routing-rules");
  if (result.ok) return result.data;
  if (!shouldUseMockFallback(result.status)) return [];

  await delay();
  return mockRoutingRules;
}

export async function getRolePermissions(): Promise<RolePermission[]> {
  const result = await apiFetchResult<RolePermission[]>("/api/roles");
  if (result.ok) return result.data;
  if (!shouldUseMockFallback(result.status)) return DEFAULT_ROLE_PERMISSIONS;

  await delay();
  return DEFAULT_ROLE_PERMISSIONS;
}

export async function toggleRolePermission(
  role: string,
  permissionKey: string,
  granted: boolean
): Promise<boolean> {
  try {
    const res = await fetch(withBasePath("/api/roles"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, permissionKey, granted }),
    });
    return res.ok;
  } catch {
    return false;
  }
}



export async function getRoutingRecommendation(observation: string) {

  await delay(200);

  return recommendRouting(observation);

}



export async function submitFieldReport(data: {
  observation: string;
  affectedSystem: string;
  governorate?: string;
  district?: string;
  center?: string;
  enumeratorsAffected?: number;
  submissionChannel?: string;
  researcherIssueType?: string;
  supervisorId: string;
  supervisorName: string;
  attachmentNames?: { name: string; type: FieldReport["attachments"][0]["type"]; url?: string }[];
}): Promise<FieldReport> {
  return apiFetchOrThrow<FieldReport>("/api/reports", {
    method: "POST",
    body: JSON.stringify({
      observation: data.observation,
      affectedSystem: data.affectedSystem,
      governorate: data.governorate ?? "غير محدد",
      district: data.district,
      center: data.center,
      enumeratorsAffected: data.enumeratorsAffected ?? 1,
      submissionChannel: data.submissionChannel ?? "app",
      researcherIssueType: data.researcherIssueType,
      supervisorId: data.supervisorId,
      attachmentNames: data.attachmentNames,
    }),
  });
}

export async function updateReportStatus(
  id: string,
  status: ReportStatus,
  extra?: Partial<FieldReport>
): Promise<FieldReport | null> {

  let action: string | undefined;
  if (status === "UNDER_REVIEW") action = "start_review";
  else if (status === "WAITING_CLASSIFICATION") action = "ready_for_classification";

  try {
    if (action) {
      return await apiFetchOrThrow<FieldReport>(`/api/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
    }
    return await apiFetchOrThrow<FieldReport>(`/api/reports/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  } catch {
    // fall through to mock
  }

  await delay(200);

  const idx = mockReports.findIndex((r) => r.id === id);

  if (idx === -1) return null;

  mockReports[idx] = {

    ...mockReports[idx],

    ...extra,

    status,

    updatedAt: new Date().toISOString(),

  };

  return mockReports[idx];

}



export async function convertReportToTicket(

  reportId: string,

  payload: ConvertReportPayload

): Promise<{ report: FieldReport; ticket: Ticket } | null> {

  try {
    const apiData = await apiFetchOrThrow<{ report: FieldReport; issue: { id: string; number: string } }>(
      `/api/reports/${reportId}/convert`,
      {
        method: "POST",
        body: JSON.stringify({
          team: payload.team,
          priority: payload.priority,
          category: payload.issueType,
          classification: payload.classification,
          reason: payload.reason,
          slaHours: payload.slaHours,
        }),
      }
    );

    const ticket: Ticket = {
      id: apiData.issue.id,
      number: apiData.issue.number,
      title: apiData.report.observation,
      status: "RECEIVED",
      priority: payload.priority,
      governorate: apiData.report.governorate,
      issueType: payload.issueType,
      team: payload.team,
      reporterId: apiData.report.supervisorId,
      reporterName: apiData.report.supervisorName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return { report: apiData.report, ticket };
  } catch {
    // fall through to mock
  }

  await delay(400);

  const idx = mockReports.findIndex((r) => r.id === reportId);

  if (idx === -1) return null;



  const report = mockReports[idx];

  const ticketNum = mockTickets.length + 1;

  const ticket: Ticket = {

    id: `t${ticketNum}`,

    number: `ISS-2026-${String(ticketNum).padStart(3, "0")}`,

    title: report.observation,

    description: `مصدر: ${report.number}\nالسبب: ${payload.reason}`,

    status: "RECEIVED",

    priority: payload.priority,

    governorate: report.governorate,

    issueType: payload.issueType,

    team: payload.team,

    reporterId: report.supervisorId,

    reporterName: report.supervisorName,

    createdAt: new Date().toISOString(),

    updatedAt: new Date().toISOString(),

  };

  mockTickets.unshift(ticket);



  mockReports[idx] = {

    ...report,

    status: "CONVERTED_TO_TICKET",

    classification: payload.classification,

    convertedTicketId: ticket.id,

    convertedTicketNumber: ticket.number,

    updatedAt: new Date().toISOString(),

  };



  return { report: mockReports[idx], ticket };

}



export async function rejectReport(

  reportId: string,

  reason: string,

  classification?: FieldReport["classification"]

): Promise<FieldReport | null> {

  try {
    return await apiFetchOrThrow<FieldReport>(`/api/reports/${reportId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "reject", reason, classification }),
    });
  } catch {
    // fall through to mock
  }

  await delay(200);

  return updateReportStatus(reportId, "REJECTED", {

    rejectionReason: reason,

    classification,

    managerDecision: "NOT_A_PROBLEM",

  });

}



export async function confirmReportAsProblemWithAssign(
  reportId: string,
  assigneeId: string,
  priority?: import("@/lib/types").IssuePriority,
  options?: {
    observation?: string;
    affectedSystem?: string;
    severity?: import("@/lib/cases/types").CaseSeverity;
  }
): Promise<FieldReport> {
  return apiFetchOrThrow<FieldReport>(`/api/reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "confirm_and_assign",
      assigneeId,
      priority,
      severity: options?.severity,
      observation: options?.observation,
      affectedSystem: options?.affectedSystem,
    }),
  });
}

export async function confirmReportAsProblem(
  reportId: string,
  _reviewedBy: string
): Promise<FieldReport | null> {
  try {
    return await apiFetchOrThrow<FieldReport>(`/api/reports/${reportId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "confirm_problem", classification: "BUG" }),
    });
  } catch {
    // fall through to mock
  }

  await delay(200);

  return updateReportStatus(reportId, "WAITING_CLASSIFICATION", {
    reviewedBy: _reviewedBy,
    reviewedAt: new Date().toISOString(),
    managerDecision: "CONFIRMED_PROBLEM",
    managerDecisionBy: _reviewedBy,
    managerDecisionAt: new Date().toISOString(),
    classification: "BUG",
  });

}



export async function markReportAsNotProblem(

  reportId: string,

  reviewedBy: string,

  reason: string,

  classification: FieldReport["classification"] = "USER_MISTAKE"

): Promise<FieldReport | null> {

  return rejectReport(reportId, reason, classification);

}



export async function getSimilarReports(reportId: string): Promise<FieldReport[]> {
  const result = await apiFetchResult<FieldReport[]>(`/api/reports/${reportId}/similar`);
  if (result.ok) return result.data;
  if (!shouldUseMockFallback(result.status)) return [];

  await delay();
  const report = mockReports.find((r) => r.id === reportId);
  if (!report?.similarReportIds) return [];
  return mockReports.filter((r) => report.similarReportIds!.includes(r.id));
}



const TEAM_ALIASES: Record<string, string[]> = {

  Developer: ["Developer", "developer", "Backend", "backend", "Frontend", "frontend", "التطوير"],

  Database: ["Database", "database", "قاعدة البيانات"],

  DevOps: ["DevOps", "devops"],

  APK: ["APK", "apk", "Android", "android"],

  "Call Center": ["Call Center", "call center", "مركز الاتصال", "دعm L1", "دعm L2"],

};



export async function getQueueByTeam(team: string): Promise<Ticket[]> {
  await delay();
  const { mockIssues } = await import("@/lib/mock-data");
  const aliases = TEAM_ALIASES[team] ?? [team];
  return mockIssues.filter(
    (t) =>
      aliases.some((a) => t.team.toLowerCase().includes(a.toLowerCase())) &&
      t.status !== "CLOSED"
  ) as Ticket[];
}



export async function getSupervisorReports(supervisorId: string): Promise<FieldReport[]> {
  const result = await apiFetchResult<FieldReport[]>(`/api/reports?supervisorOnly=true`);
  if (result.ok) return result.data.filter((r) => r.supervisorId === supervisorId);
  if (!shouldUseMockFallback(result.status)) return [];

  await delay();
  return mockReports.filter((r) => r.supervisorId === supervisorId);
}


