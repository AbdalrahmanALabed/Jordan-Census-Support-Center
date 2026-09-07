import type { TicketPriority, UserRole, CensusSystem } from "@/lib/types";

export type ReportStatus =
  | "NEW"
  | "UNDER_REVIEW"
  | "WAITING_CLASSIFICATION"
  | "CONVERTED_TO_TICKET"
  | "REJECTED"
  | "CLOSED";

export type ReportClassification =
  | "BUG"
  | "USER_MISTAKE"
  | "TRAINING_ISSUE"
  | "CONFIGURATION_ISSUE"
  | "FEATURE_REQUEST"
  | "COMPLAINT"
  | "QUESTION"
  | "DUPLICATE"
  | "OUT_OF_SCOPE"
  | "MAJOR_INCIDENT";

export type AttachmentType = "image" | "video" | "voice" | "log" | "pdf";

export interface ReportAttachment {
  id: string;
  reportId: string;
  name: string;
  type: AttachmentType;
  url: string;
  size?: string;
  createdAt: string;
}

export interface FieldReport {
  id: string;
  number: string;
  observation: string;
  status: ReportStatus;
  governorate: string;
  district?: string;
  center?: string;
  enumeratorsAffected?: number;
  supervisorId: string;
  supervisorName: string;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  classification?: ReportClassification;
  rejectionReason?: string;
  convertedTicketId?: string;
  convertedTicketNumber?: string;
  convertedIssueId?: string;
  convertedIssueNumber?: string;
  recommendedTeam?: string;
  recommendedPriority?: TicketPriority;
  submissionChannel?: string;
  affectedSystem?: CensusSystem | string;
  similarReportIds?: string[];
  attachments: ReportAttachment[];
  managerDecision?: "CONFIRMED_PROBLEM" | "NOT_A_PROBLEM";
  managerDecisionBy?: string;
  managerDecisionAt?: string;
}

export interface ConvertReportPayload {
  classification: ReportClassification;
  priority: TicketPriority;
  team: string;
  reason: string;
  slaHours: number;
  issueType: string;
}

export interface RoutingRule {
  id: string;
  keywords: string[];
  recommendedTeam: string;
  recommendedClassification: ReportClassification;
  priority: TicketPriority;
  enabled: boolean;
}

export interface RolePermission {
  role: UserRole;
  permissions: string[];
}

export interface SimilarReportGroup {
  reportIds: string[];
  observation: string;
  count: number;
  similarity: number;
}

export interface OperationsDashboard {
  pendingReview: number;
  waitingClassification: number;
  confirmedProblems: number;
  notProblems: number;
  majorIncidents: number;
  similarGroups: SimilarReportGroup[];
  urgentReports: FieldReport[];
  needsDecision: FieldReport[];
  recentConfirmed: FieldReport[];
  recentNotProblem: FieldReport[];
  teamLoad: { team: string; count: number }[];
  todayConverted: number;
  todayRejected: number;
}

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  NEW: "جديد",
  UNDER_REVIEW: "قيد المراجعة",
  WAITING_CLASSIFICATION: "بانتظار التصنيف",
  CONVERTED_TO_TICKET: "تحوّل لمسألة",
  REJECTED: "مرفوض",
  CLOSED: "مغلق",
};

export const CLASSIFICATION_LABELS: Record<ReportClassification, string> = {
  BUG: "BUG",
  USER_MISTAKE: "خطأ مستخدم",
  TRAINING_ISSUE: "مشكلة تدريب",
  CONFIGURATION_ISSUE: "مشكلة إعداد",
  FEATURE_REQUEST: "طلب ميزة",
  COMPLAINT: "شكوى",
  QUESTION: "استفسار",
  DUPLICATE: "بلاغ مكرر",
  OUT_OF_SCOPE: "خارج نطاق الدعم",
  MAJOR_INCIDENT: "حادث جسيم",
};

/** @deprecated Use NOT_APP_TECHNICAL_ISSUE_OPTIONS from case-classification.ts */
export const NOT_PROBLEM_REASONS: {
  value: Exclude<ReportClassification, "BUG" | "MAJOR_INCIDENT">;
  label: string;
  hint: string;
}[] = [];

export const ATTACHMENT_TYPE_LABELS: Record<AttachmentType, string> = {
  image: "صورة",
  video: "فيديو",
  voice: "تسجيل صوتي",
  log: "سجل",
  pdf: "PDF",
};

export const CONVERSION_TEAMS = [
  { id: "developer", label: "Developer", internal: "Developer" },
  { id: "database", label: "Database", internal: "Database" },
  { id: "devops", label: "DevOps", internal: "DevOps" },
  { id: "design", label: "Design", internal: "Design" },
] as const;

export const ALL_PERMISSIONS = [
  "view_dashboard",
  "submit_report",
  "view_own_reports",
  "review_reports",
  "classify_reports",
  "convert_to_ticket",
  "reject_reports",
  "view_tickets",
  "manage_tickets",
  "view_queues",
  "manage_users",
  "manage_roles",
  "manage_routing",
  "view_analytics",
] as const;

export const PERMISSION_LABELS: Record<string, string> = {
  view_dashboard: "عرض لوحة التحكم",
  submit_report: "تقديم بلاغ ميداني",
  view_own_reports: "عرض بلاغاتي",
  review_reports: "مراجعة البلاغات",
  classify_reports: "تصنيف البلاغات",
  convert_to_issue: "تحويل لمسألة",
  convert_to_ticket: "تحويل لمسألة",
  reject_reports: "رفض البلاغات",
  view_tickets: "عرض المسائل",
  manage_tickets: "إدارة المسائل",
  view_queues: "عرض الطوابير",
  manage_users: "إدارة المستخدمين",
  manage_roles: "إدارة الصلاحيات",
  manage_routing: "إدارة قواعد التوجيه",
  view_analytics: "عرض التحليلات",
};

export const DEFAULT_ROLE_PERMISSIONS: RolePermission[] = [
  {
    role: "ADMIN",
    permissions: [...ALL_PERMISSIONS],
  },
  {
    role: "SUPERVISOR",
    permissions: ["submit_report", "view_own_reports", "view_dashboard"],
  },
  {
    role: "SUPPORT_COORDINATOR",
    permissions: [
      "view_dashboard",
      "submit_report",
      "view_own_reports",
      "review_reports",
      "reject_reports",
      "view_issues",
      "close_issues",
      "manage_users",
    ],
  },
  {
    role: "FIELD_OPERATIONS_COORDINATOR",
    permissions: [
      "view_dashboard",
      "submit_report",
      "view_own_reports",
      "review_reports",
      "reject_reports",
      "view_issues",
      "close_issues",
      "manage_users",
    ],
  },
  {
    role: "DEVELOPER",
    permissions: ["view_dashboard", "view_tickets", "manage_tickets", "view_queues"],
  },
];

export {
  hasPermissionSync as hasPermission,
  isSupervisorRole,
  isSuperAdminRole,
  isSupportCoordinatorRole,
  isSupportSupervisorRole,
  isManagerRole,
  PERMISSION_LABELS as PERMISSION_LABELS_DB,
} from "@/lib/permissions";
