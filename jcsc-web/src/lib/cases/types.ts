import type { IssuePriority } from "@/lib/types";

/** Unified Case — every operational item starts here */
export type CaseType =
  | "BUG"
  | "TRAINING_ISSUE"
  | "USER_MISTAKE"
  | "CONFIGURATION_ISSUE"
  | "QUESTION"
  | "FEATURE_REQUEST"
  | "COMPLAINT"
  | "INCIDENT"
  | "TASK"
  | "INTERNAL_NOTE";

export type CaseStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "AWAITING_APPROVAL"
  | "IN_PROGRESS"
  | "WAITING_DEPLOYMENT"
  | "READY_FOR_TESTING"
  | "RESOLVED"
  | "CLOSED"
  | "MERGED";

export type CaseSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type AttachmentKind = "image" | "video" | "voice" | "pdf" | "log";

export interface CaseAttachment {
  id: string;
  caseId: string;
  name: string;
  kind: AttachmentKind;
  url: string;
  size?: string;
  uploadedBy: string;
  createdAt: string;
}

export interface CaseComment {
  id: string;
  caseId: string;
  content: string;
  authorId: string;
  authorName: string;
  isInternal: boolean;
  createdAt: string;
}

export interface CaseTimelineEvent {
  id: string;
  caseId: string;
  action: string;
  details?: string;
  actorName?: string;
  createdAt: string;
}

export interface CaseDecision {
  id: string;
  caseId: string;
  decision: string;
  reason?: string;
  decidedBy: string;
  decidedAt: string;
}

export interface Case {
  id: string;
  number: string;
  title: string;
  description: string;
  caseType: CaseType;
  status: CaseStatus;
  priority: IssuePriority;
  severity: CaseSeverity;
  sourceReportId?: string;
  sourceReportNumber?: string;
  linkedIssueId?: string;
  linkedIssueNumber?: string;
  affectedUsers: number;
  affectedGovernorates: string[];
  affectedSystem: string;
  suggestedTeam?: string;
  assignedTeam?: string;
  assignedDeveloperId?: string;
  assignedDeveloperName?: string;
  assignedDeveloperRole?: string;
  assignedDeveloperTeam?: string;
  assignedCoordinatorId?: string;
  assignedCoordinatorName?: string;
  deploymentStatus?: "NOT_STARTED" | "QUEUED" | "IN_PROGRESS" | "DEPLOYED";
  testingStatus?: "NOT_STARTED" | "IN_PROGRESS" | "PASSED" | "FAILED";
  resolutionNotes?: string;
  resolutionType?: string;
  timeSpentMinutes?: number;
  solvedBy?: string;
  solvedByName?: string;
  knowledgeArticleId?: string;
  knowledgeArticleTitle?: string;
  knowledgeValue?: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  duplicateOfCaseId?: string;
  mergedIntoCaseId?: string;
  createdBy: string;
  createdByName: string;
  createdByRole?: string;
  governorate: string;
  createdAt: string;
  updatedAt: string;
}

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  BUG: "BUG",
  TRAINING_ISSUE: "مشكلة تدريب",
  USER_MISTAKE: "خطأ مستخدم",
  CONFIGURATION_ISSUE: "مشكلة إعداد",
  QUESTION: "استفسار",
  FEATURE_REQUEST: "طلب ميزة",
  COMPLAINT: "شكوى",
  INCIDENT: "حادث",
  TASK: "مهمة",
  INTERNAL_NOTE: "ملاحظة داخلية",
};

/** @deprecated Use REPORT_CLASSIFY_OPTIONS from case-classification.ts */
export const OPERATIONAL_CASE_TYPES = [
  { type: "BUG" as CaseType, label: "BUG" },
  { type: "INCIDENT" as CaseType, label: "مشاكل جهاز" },
  { type: "TRAINING_ISSUE" as CaseType, label: "مشكلة في تدريب الباحث" },
  { type: "FEATURE_REQUEST" as CaseType, label: "تحسينات" },
];

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  OPEN: "مفتوح",
  UNDER_REVIEW: "قيد المراجعة",
  AWAITING_APPROVAL: "بانتظار الموافقة",
  IN_PROGRESS: "قيد المعالجة",
  WAITING_DEPLOYMENT: "قيد المعالجة",
  READY_FOR_TESTING: "قيد المعالجة",
  RESOLVED: "محلول",
  CLOSED: "مغلق",
  MERGED: "مغلق",
};

/** 4 statuses for census ops UI */
export type SimpleCaseStatus = "NEW" | "IN_PROGRESS" | "SOLVED" | "CLOSED";

export const SIMPLE_CASE_STATUS_LABELS: Record<SimpleCaseStatus, string> = {
  NEW: "جديد",
  IN_PROGRESS: "قيد المعالجة",
  SOLVED: "محلول",
  CLOSED: "مغلق",
};

export function toSimpleCaseStatus(status: CaseStatus): SimpleCaseStatus {
  if (status === "OPEN") return "NEW";
  if (["UNDER_REVIEW", "AWAITING_APPROVAL", "IN_PROGRESS", "WAITING_DEPLOYMENT", "READY_FOR_TESTING"].includes(status))
    return "IN_PROGRESS";
  if (status === "RESOLVED") return "SOLVED";
  return "CLOSED";
}

/** حالة جديدة — بانتظار منسق الدعم */
export function caseNeedsCoordinatorReview(status: CaseStatus): boolean {
  return status === "OPEN";
}

/** مُصعّدة من منسق الدعم — بانتظار السوبر أدمن */
export function caseNeedsSuperAdminReview(status: CaseStatus): boolean {
  return status === "AWAITING_APPROVAL";
}

/** @deprecated Super admin no longer accepts OPEN — coordinator triages first */
export function caseNeedsAcceptance(status: CaseStatus): boolean {
  return false;
}

/** Case is waiting for support coordinator classification */
export function caseInCoordinatorQueue(status: CaseStatus): boolean {
  return status === "OPEN";
}

/** مقبولة — تحتاج تصنيف وإسناد */
export function caseNeedsClassifyAssign(status: CaseStatus): boolean {
  return status === "UNDER_REVIEW";
}

/** Coordinator / super-admin can classify & assign from these statuses */
export function caseCanClassifyAndAssign(status: CaseStatus): boolean {
  return (
    caseNeedsCoordinatorReview(status) ||
    caseNeedsClassifyAssign(status) ||
    caseNeedsSuperAdminReview(status)
  );
}

export function simpleStatusLabel(status: CaseStatus): string {
  return SIMPLE_CASE_STATUS_LABELS[toSimpleCaseStatus(status)];
}

export function caseStatusesForSimple(simple: SimpleCaseStatus): CaseStatus[] {
  switch (simple) {
    case "NEW":
      return ["OPEN"];
    case "IN_PROGRESS":
      return ["UNDER_REVIEW", "AWAITING_APPROVAL", "IN_PROGRESS", "WAITING_DEPLOYMENT", "READY_FOR_TESTING"];
    case "SOLVED":
      return ["RESOLVED"];
    case "CLOSED":
      return ["CLOSED", "MERGED"];
  }
}

export const RESOLUTION_TYPES = [
  "حل فوري بدون مطور",
  "تدريب",
  "إعداد",
  "إصلاح تقني",
  "تحويل لمسألة",
  "رفض — ليست مشكلة",
] as const;

export function isDeveloperRole(role: string): boolean {
  return role === "DEVELOPER";
}

export function canConvertReportToBug(role: string): boolean {
  return role === "ADMIN";
}

export function canCloseBug(role: string): boolean {
  return role === "ADMIN";
}
