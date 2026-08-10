import type { UserRole, TicketPriority, Ticket, Notification } from "@/lib/types";

export type TeamQueueId =
  | "support_l1"
  | "support_l2"
  | "developer"
  | "database"
  | "devops"
  | "apk"
  | "call_center";

export interface TeamQueue {
  id: TeamQueueId;
  internalName: string;
  friendlyName: string;
  description: string;
  roles: UserRole[];
}

export interface TicketChecklistItem {
  id: string;
  ticketId: string;
  label: string;
  completed: boolean;
  order: number;
}

export interface TicketAIAnalysis {
  ticketId: string;
  summary: string;
  suggestedSolution: string;
  recommendedTeam: string;
  slaHours: number;
  slaDeadline: string;
  escalationPath: string[];
  confidence: number;
}

export interface SimilarTicket {
  id: string;
  number: string;
  title: string;
  similarity: number;
  status: Ticket["status"];
  resolvedAt?: string;
}

export interface Playbook {
  id: string;
  title: string;
  issueType: string;
  steps: string[];
  estimatedMinutes: number;
  team: string;
}

export interface ShiftHandover {
  id: string;
  fromUserName: string;
  toUserName: string;
  shiftDate: string;
  summary: string;
  openTickets: number;
  criticalTickets: number;
  pendingEscalations: number;
  notes: string;
  createdAt: string;
}

export interface TriageResult {
  title: string;
  category: string;
  issueType: string;
  priority: TicketPriority;
  team: string;
  governorate?: string;
  slaHours: number;
  suggestedSolution: string;
  checklist: string[];
  similarKeywords: string[];
  confidence: number;
  clarifyingQuestion?: string;
}

export interface EscalationNotification extends Notification {
  level: "info" | "warning" | "critical";
  ticketNumber?: string;
  actionRequired?: boolean;
  entityType?: string;
  entityId?: string;
}

export const TEAM_QUEUES: TeamQueue[] = [
  {
    id: "developer",
    internalName: "Developer",
    friendlyName: "Developer",
    description: "Backend, frontend, and application issues",
    roles: ["DEVELOPER"],
  },
  {
    id: "database",
    internalName: "قاعدة البيانات",
    friendlyName: "فريق البيانات",
    description: "مشاكل حفظ ومزامنة البيانات",
    roles: ["DEVELOPER"],
  },
  {
    id: "devops",
    internalName: "DevOps",
    friendlyName: "فريق التشغيل",
    description: "مشاكل الأداء والاتصال",
    roles: ["DEVELOPER"],
  },
  {
    id: "apk",
    internalName: "APK",
    friendlyName: "APK",
    description: "Field app and Android build issues",
    roles: ["DEVELOPER"],
  },
];

export const TECHNICAL_ROLES: UserRole[] = ["ADMIN", "DEVELOPER"];

export function isTechnicalRole(role: UserRole): boolean {
  return TECHNICAL_ROLES.includes(role);
}

export function getTeamForRole(role: UserRole): string | null {
  const queue = TEAM_QUEUES.find((q) => q.roles.includes(role));
  return queue?.internalName ?? null;
}

export function getFriendlyTeamName(team: string, role: UserRole): string {
  if (isTechnicalRole(role)) return team;
  const queue = TEAM_QUEUES.find((q) => q.internalName === team);
  return queue?.friendlyName ?? "فريق الدعم";
}

export const SLA_LABELS: Record<TicketPriority, string> = {
  CRITICAL: "خلال ساعة",
  HIGH: "خلال 4 ساعات",
  MEDIUM: "خلال 24 ساعة",
  LOW: "خلال 48 ساعة",
};

export const SLA_HOURS: Record<TicketPriority, number> = {
  CRITICAL: 1,
  HIGH: 4,
  MEDIUM: 24,
  LOW: 48,
};

export const FRIENDLY_CATEGORIES = [
  "لا أستطيع الدخول للتطبيق",
  "البيانات لا تتزامن",
  "الموقع غير دقيق",
  "التطبيق يتوقف",
  "مشكلة في الاستبيان",
  "مشكلة في الجهاز",
  "أخرى",
] as const;

export const CATEGORY_TO_ISSUE: Record<string, string> = {
  "لا أستطيع الدخول للتطبيق": "تسجيل الدخول",
  "البيانات لا تتزامن": "مزامنة البيانات",
  "الموقع غير دقيق": "GPS",
  "التطبيق يتوقف": "تطبيق الميدان",
  "مشكلة في الاستبيان": "الاستبيان",
  "مشكلة في الجهاز": "الأجهزة",
  "أخرى": "أخرى",
};

export const ISSUE_TO_TEAM: Record<string, string> = {
  "تسجيل الدخول": "دعم L1",
  "مزامنة البيانات": "دعم L2",
  GPS: "APK",
  "تطبيق الميدان": "التطوير",
  "الاستبيان": "دعم L1",
  "الأجهزة": "دعم L1",
  "أخرى": "دعم L1",
};

export const ISSUE_TO_PLAYBOOK: Record<string, string> = {
  "تسجيل الدخول": "pb1",
  "مزامنة البيانات": "pb2",
  GPS: "pb3",
  "تطبيق الميدان": "pb4",
  "الأجهزة": "pb5",
};
