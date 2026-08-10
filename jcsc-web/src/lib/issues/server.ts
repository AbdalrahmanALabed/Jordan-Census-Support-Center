import type { IssuePriority, IssueStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export const CATEGORY_CHECKLISTS: Record<string, string[]> = {
  "مزامنة البيانات": [
    "التحقق من سجلات الخادm",
    "اختبار المzامنة على جهاز تجريبي",
    "التأكد من اتصال الشبكة",
    "إبلاغ المدير بالنتيجة",
  ],
  "تسجيل الدخول": [
    "مراجعة سجلات المصادقة",
    "اختبار حساب تجريبي",
    "التحقق من صلاحية الجلسة",
    "توثيق الحل",
  ],
  GPS: [
    "التحقق من إعدادات الموقع",
    "اختبار GPS على الجهاز",
    "مراجعة إعدادات GPS",
  ],
  default: [
    "جمع معلومات إضافية",
    "تشخيص السبب الجذري",
    "تطبيق الإصلاح",
    "التحقق من الحل",
  ],
};

export function getChecklistLabels(category: string): string[] {
  if (CATEGORY_CHECKLISTS[category]) return CATEGORY_CHECKLISTS[category];
  for (const [key, items] of Object.entries(CATEGORY_CHECKLISTS)) {
    if (key !== "default" && category.includes(key)) return items;
  }
  return CATEGORY_CHECKLISTS.default;
}

export async function createIssueChecklist(issueId: string, category: string) {
  const labels = getChecklistLabels(category);
  await prisma.issueChecklistItem.createMany({
    data: labels.map((label, i) => ({ issueId, label, sortOrder: i })),
  });
}

const issueInclude = {
  assignee: true,
  reports: { include: { report: { include: { supervisor: true } } } },
  comments: { include: { author: true }, orderBy: { createdAt: "asc" as const } },
  timeline: { orderBy: { createdAt: "asc" as const } },
  checklist: { orderBy: { sortOrder: "asc" as const } },
  attachments: true,
};

export type IssueWithRelations = NonNullable<Awaited<ReturnType<typeof getIssueById>>>;

export async function getIssueById(id: string) {
  return prisma.issue.findUnique({ where: { id }, include: issueInclude });
}

export async function listIssues(where: Record<string, unknown> = {}) {
  return prisma.issue.findMany({
    where,
    include: {
      assignee: true,
      reports: { include: { report: { include: { supervisor: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function mapIssueToTicket(issue: NonNullable<Awaited<ReturnType<typeof getIssueById>>>) {
  const reporter = issue.reports[0]?.report?.supervisor;
  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    description: issue.description ?? undefined,
    status: issue.status as IssueStatus,
    priority: issue.priority as IssuePriority,
    governorate: issue.governorate,
    issueType: issue.category,
    category: issue.category,
    team: issue.team,
    assigneeId: issue.assigneeId ?? undefined,
    assigneeName: issue.assignee?.name,
    reporterId: reporter?.id,
    reporterName: reporter?.name,
    enumeratorsAffected: issue.enumeratorsAffected,
    slaTargetAt: issue.slaTargetAt?.toISOString(),
    resolutionNote: issue.resolutionNote ?? undefined,
    rootCause: issue.rootCause ?? undefined,
    closeReason: issue.closeReason ?? undefined,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    comments: issue.comments.map((c) => ({
      id: c.id,
      content: c.content,
      ticketId: issue.id,
      authorId: c.authorId,
      authorName: c.author.name,
      createdAt: c.createdAt.toISOString(),
    })),
    timeline: issue.timeline.map((t) => ({
      id: t.id,
      action: t.action,
      details: t.details ?? undefined,
      ticketId: issue.id,
      createdAt: t.createdAt.toISOString(),
    })),
    checklist: issue.checklist.map((c) => ({
      id: c.id,
      label: c.label,
      completed: c.completed,
      order: c.sortOrder,
    })),
    attachments: issue.attachments.map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
      ticketId: issue.id,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export function mapIssueListItem(
  issue: Awaited<ReturnType<typeof listIssues>>[number]
) {
  const reporter = issue.reports[0]?.report?.supervisor;
  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    description: issue.description ?? undefined,
    status: issue.status,
    priority: issue.priority,
    governorate: issue.governorate,
    issueType: issue.category,
    category: issue.category,
    team: issue.team,
    assigneeId: issue.assigneeId ?? undefined,
    assigneeName: issue.assignee?.name,
    reporterName: reporter?.name,
    enumeratorsAffected: issue.enumeratorsAffected,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
  };
}

export const DEVELOPER_ALLOWED_STATUSES: IssueStatus[] = [
  "WAITING_DEPLOYMENT",
  "READY_FOR_TESTING",
];

export const MANAGER_ONLY_STATUSES: IssueStatus[] = ["CLOSED", "RETURNED", "ASSIGNED", "RECEIVED"];

export function statusLabel(status: IssueStatus): string {
  const labels: Record<IssueStatus, string> = {
    RECEIVED: "مستلمة",
    ASSIGNED: "معيّنة",
    IN_PROGRESS: "قيد المعالجة",
    NEED_INFO: "تحتاج معلومات",
    WAITING_DEPLOYMENT: "بانتظار النشر",
    READY_FOR_TESTING: "جاهزة للاختبار",
    RETURNED: "مُعادّة",
    CLOSED: "مغلقة",
  };
  return labels[status] ?? status;
}
