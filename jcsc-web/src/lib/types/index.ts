export type UserRole =
  | "ADMIN"
  | "SUPPORT_SUPERVISOR"
  | "SUPPORT_COORDINATOR"
  | "FIELD_OPERATIONS_COORDINATOR"
  | "SUPPORT_MANAGER"
  | "SUPPORT_L1"
  | "SUPPORT_L2"
  | "DEVELOPER"
  | "DATABASE"
  | "DEVOPS"
  | "GIS"
  | "SUPERVISOR"
  | "CALL_CENTER";

export type IssueStatus =
  | "RECEIVED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "NEED_INFO"
  | "WAITING_DEPLOYMENT"
  | "READY_FOR_TESTING"
  | "RETURNED"
  | "CLOSED";

export type IssuePriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/** @deprecated Use IssueStatus — legacy ticket lifecycle */
export type TicketStatus = IssueStatus;

/** @deprecated Use IssuePriority */
export type TicketPriority = IssuePriority;

export type ResearcherStatus = "ACTIVE" | "IDLE" | "NO_SYNC";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  role: UserRole;
  team?: string;
  governorate?: string;
  isActive: boolean;
  createdAt: string;
  permissions?: string[];
}

export interface Issue {
  id: string;
  number: string;
  title: string;
  description?: string;
  status: IssueStatus;
  priority: IssuePriority;
  governorate: string;
  issueType: string;
  team: string;
  assigneeId?: string;
  sourceReportId?: string;
  reporterId?: string;
  assigneeName?: string;
  reporterName?: string;
  enumeratorsAffected?: number;
  slaTargetAt?: string;
  createdAt: string;
  updatedAt: string;
  comments?: Comment[];
  timeline?: TimelineEvent[];
  checklist?: { id: string; label: string; completed: boolean; order: number }[];
  attachments?: Attachment[];
  resolutionNote?: string;
  rootCause?: string;
  closeReason?: string;
}

/** @deprecated Use Issue */
export type Ticket = Issue;

export interface Comment {
  id: string;
  content: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  ticketId: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  action: string;
  details?: string;
  ticketId: string;
  createdAt: string;
}

export interface InternalNote {
  id: string;
  content: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface TicketLog {
  id: string;
  level: "info" | "warning" | "error";
  message: string;
  ticketId: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  userId: string;
  createdAt: string;
  type?: string;
  channel?: string;
  level?: "info" | "warning" | "critical";
  actionRequired?: boolean;
  issueNumber?: string;
  entityType?: string;
  entityId?: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Researcher {
  id: string;
  name: string;
  governorate: string;
  status: ResearcherStatus;
  lastSyncAt?: string;
  lastActiveAt?: string;
}

export interface OperationsStats {
  received: number;
  assigned: number;
  inProgress: number;
  needInfo: number;
  waitingDeployment: number;
  readyForTesting: number;
  returned: number;
  closed: number;
  slaBreached: number;
  chartData: { date: string; count: number }[];
}

export interface DashboardStats {
  openIssues: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  todayIssues: number;
  topCategories: { type: string; count: number }[];
  chartData: { date: string; count: number }[];
  openTickets: number;
  topIssues: { type: string; count: number }[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "سوبر أدمن",
  SUPPORT_SUPERVISOR: "مشرف الدعم",
  SUPPORT_COORDINATOR: "منسق الدعم",
  FIELD_OPERATIONS_COORDINATOR: "منسق إدارة العمل الميداني",
  SUPPORT_MANAGER: "مدير الدعم",
  SUPPORT_L1: "دعم L1",
  SUPPORT_L2: "دعم L2",
  DEVELOPER: "مطور",
  DATABASE: "قاعدة بيانات",
  DEVOPS: "DevOps",
  GIS: "GIS",
  SUPERVISOR: "الدعم الفني المراكز",
  CALL_CENTER: "مركز اتصال",
};

/** Legacy roles — kept in schema/DB only; hidden from pickers */
export const DEPRECATED_ROLES: UserRole[] = [
  "SUPPORT_MANAGER",
  "SUPPORT_L1",
  "SUPPORT_L2",
  "DATABASE",
  "DEVOPS",
  "GIS",
  "CALL_CENTER",
];

/** Active roles — Super Admin, Support Supervisor, Support Coordinator, Center Support, Developer */
export const CORE_ROLES: UserRole[] = [
  "ADMIN",
  "SUPPORT_SUPERVISOR",
  "SUPPORT_COORDINATOR",
  "FIELD_OPERATIONS_COORDINATOR",
  "SUPERVISOR",
  "DEVELOPER",
];

export function isActiveRole(role: UserRole): boolean {
  return CORE_ROLES.includes(role);
}

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  RECEIVED: "وارد",
  ASSIGNED: "معيّن",
  IN_PROGRESS: "قيد المعالجة",
  NEED_INFO: "يحتاج معلومات",
  WAITING_DEPLOYMENT: "بانتظار النشر",
  READY_FOR_TESTING: "جاهز للاختبار",
  RETURNED: "مُعاد للمعالجة",
  CLOSED: "مغلق",
};

/** @deprecated Use ISSUE_STATUS_LABELS */
export const STATUS_LABELS = ISSUE_STATUS_LABELS;

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  CRITICAL: "حرجة",
  HIGH: "عالية",
  MEDIUM: "متوسطة",
  LOW: "منخفضة",
};

export const RESEARCHER_STATUS_LABELS: Record<ResearcherStatus, string> = {
  ACTIVE: "نشط",
  IDLE: "متوقف",
  NO_SYNC: "بدون Sync",
};

export const TEAMS = [
  "L1 Support",
  "L2 Support",
  "Developer",
  "Database",
  "DevOps",
  "APK",
  "Design",
] as const;

export const GOVERNORATES = [
  "عمان",
  "إربد",
  "الزرقاء",
  "البلقاء",
  "الكرك",
  "معان",
  "الطفيلة",
  "مادبا",
  "جرش",
  "عجلون",
  "المفرق",
  "العقبة",
] as const;

/** أنظمة التعداد — يختارها دعم المراكز عند إرسال بلاغ أو حالة */
export const CENSUS_SYSTEMS = [
  { value: "CALL_CENTER", label: "مركز اتصال", ticketPrefix: "C" },
  { value: "SELF_ENUMERATION", label: "عد ذاتي", ticketPrefix: "S" },
  { value: "RESEARCHER_SYSTEM", label: "نظام الباحث", ticketPrefix: "R" },
  { value: "FIELD_OPERATIONS", label: "إدارة العمل الميداني", ticketPrefix: "F" },
] as const;

export type CensusSystem = (typeof CENSUS_SYSTEMS)[number]["value"];

export const CENSUS_SYSTEM_LABELS: Record<CensusSystem, string> = {
  CALL_CENTER: "مركز اتصال",
  SELF_ENUMERATION: "عد ذاتي",
  RESEARCHER_SYSTEM: "نظام الباحث",
  FIELD_OPERATIONS: "إدارة العمل الميداني",
};

export function censusSystemToLabel(value: CensusSystem | string): string {
  return CENSUS_SYSTEM_LABELS[value as CensusSystem] ?? value;
}

/** يحوّل أي قيمة مخزّنة للنظام إلى مفتاح CensusSystem */
export function normalizeCensusSystem(value?: string | null): CensusSystem {
  if (!value?.trim()) return "FIELD_OPERATIONS";
  const trimmed = value.trim();
  if (trimmed in CENSUS_SYSTEM_LABELS) return trimmed as CensusSystem;
  const byLabel = CENSUS_SYSTEMS.find((s) => s.label === trimmed);
  if (byLabel) return byLabel.value;
  return "FIELD_OPERATIONS";
}

export const ISSUE_CATEGORIES = [
  "تسجيل الدخول",
  "مزامنة البيانات",
  "GPS",
  "تطبيق الميدان",
  "الاستبيان",
  "الأجهزة",
  "أخرى",
] as const;

/** @deprecated Use ISSUE_CATEGORIES */
export const ISSUE_TYPES = ISSUE_CATEGORIES;

export const KB_CATEGORIES = [
  "نظام الباحث",
  "إدارة العمل الميداني",
  "مركز الاتصال",
  "لوحة المؤشرات",
] as const;
