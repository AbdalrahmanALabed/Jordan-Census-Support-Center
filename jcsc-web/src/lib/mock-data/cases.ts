import type {
  Case,
  CaseComment,
  CaseTimelineEvent,
  CaseDecision,
  CaseAttachment,
} from "@/lib/cases/types";

const hoursAgo = (h: number) =>
  new Date(Date.now() - h * 3600000).toISOString();
const daysAgo = (d: number) =>
  new Date(Date.now() - d * 86400000).toISOString();

export const mockCases: Case[] = [
  {
    id: "case1",
    number: "CASE-2026-001",
    title: "فشل تسجيل الدخول بعد التحديث",
    description: "مستخدمون في إربد لا يستطيعون الدخول بعد تحديث التطبيق",
    caseType: "BUG",
    status: "IN_PROGRESS",
    priority: "CRITICAL",
    severity: "CRITICAL",
    sourceReportId: "rpt1",
    sourceReportNumber: "RPT-2026-001",
    linkedIssueId: "t1",
    linkedIssueNumber: "ISS-2026-001",
    affectedUsers: 45,
    affectedGovernorates: ["إربد"],
    affectedSystem: "تطبيق الميدان",
    suggestedTeam: "Developer",
    assignedTeam: "دعم L1",
    assignedDeveloperId: "u5",
    assignedDeveloperName: "خالد الشمري",
    deploymentStatus: "NOT_STARTED",
    testingStatus: "NOT_STARTED",
    createdBy: "u2",
    createdByName: "سارة العمري",
    governorate: "إربد",
    createdAt: hoursAgo(5),
    updatedAt: hoursAgo(1),
  },
  {
    id: "case2",
    number: "CASE-2026-002",
    title: "المستخدمون لا يعرفون استخدام الاستبيان",
    description: "مشرف معان: المستخدمون يحتاجون تدريب على الاستبيان الجديد",
    caseType: "TRAINING_ISSUE",
    status: "RESOLVED",
    priority: "LOW",
    severity: "LOW",
    sourceReportId: "rpt7",
    sourceReportNumber: "RPT-2026-007",
    affectedUsers: 12,
    affectedGovernorates: ["معان"],
    affectedSystem: "الاستبيان",
    resolutionType: "تدريب",
    resolutionNotes: "تم إرسال دليل PDF + جلسة تدريب عبر WhatsApp للمشرf",
    timeSpentMinutes: 25,
    solvedBy: "u2",
    solvedByName: "سارة العمري",
    knowledgeValue: "HIGH",
    knowledgeArticleTitle: "دليل الاستبيان للمشرfين",
    createdBy: "u2",
    createdByName: "سارة العمري",
    governorate: "معان",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: "case3",
    number: "CASE-2026-003",
    title: "فشل الاتصال بقاعدة البيانات",
    description: "خطأ في الاتصال بقاعدة البيانات المركزية",
    caseType: "BUG",
    status: "WAITING_DEPLOYMENT",
    priority: "CRITICAL",
    severity: "CRITICAL",
    linkedIssueId: "t8",
    linkedIssueNumber: "ISS-2026-008",
    affectedUsers: 200,
    affectedGovernorates: ["عمان", "إربد", "الزرقاء"],
    affectedSystem: "قاعدة البيانات",
    suggestedTeam: "Database",
    assignedTeam: "قاعدة البيانات",
    assignedDeveloperId: "u6",
    assignedDeveloperName: "نور الدين",
    deploymentStatus: "QUEUED",
    testingStatus: "NOT_STARTED",
    createdBy: "u2",
    createdByName: "سارة العمري",
    governorate: "عمان",
    createdAt: hoursAgo(8),
    updatedAt: hoursAgo(2),
  },
  {
    id: "case4",
    number: "CASE-2026-004",
    title: "Runtime freezes — Zarqa",
    description: "Application freezes during data entry in Zarqa",
    caseType: "BUG",
    status: "AWAITING_APPROVAL",
    priority: "HIGH",
    severity: "HIGH",
    sourceReportId: "rpt3",
    sourceReportNumber: "RPT-2026-003",
    affectedUsers: 8,
    affectedGovernorates: ["الزرقاء"],
    affectedSystem: "تطبيق الميدان",
    suggestedTeam: "Developer",
    createdBy: "u9",
    createdByName: "يوسf المرعي",
    governorate: "الزرقاء",
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(3),
  },
  {
    id: "case5",
    number: "CASE-2026-005",
    title: "مهمة: تحديث دليل GPS للمشرfين",
    caseType: "TASK",
    status: "OPEN",
    priority: "MEDIUM",
    severity: "LOW",
    description: "إعداد دليل GPS محدّث قبل بداية الأسبوع الثاني",
    affectedUsers: 0,
    affectedGovernorates: ["عمان"],
    affectedSystem: "GPS",
    assignedTeam: "APK",
    createdBy: "u2",
    createdByName: "سارة العمري",
    governorate: "عمان",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];

export const mockCaseComments: CaseComment[] = [
  {
    id: "cc1",
    caseId: "case1",
    content: "تم التحقق — المشكلة في endpoint المصادقة",
    authorId: "u5",
    authorName: "خالد الشمري",
    isInternal: true,
    createdAt: hoursAgo(2),
  },
];

export const mockCaseTimeline: CaseTimelineEvent[] = [
  { id: "ct1", caseId: "case1", action: "إنشاء الحالة", actorName: "سارة العمري", createdAt: hoursAgo(5) },
  { id: "ct2", caseId: "case1", action: "تحويل من بلاغ", details: "RPT-2026-001", actorName: "سارة العمري", createdAt: hoursAgo(4) },
  { id: "ct3", caseId: "case1", action: "تعيين مطور", details: "خالد الشمري", actorName: "سارة العمري", createdAt: hoursAgo(3) },
  { id: "ct4", caseId: "case2", action: "حل فوري", details: "تدريب — بدون مطور", actorName: "سارة العمري", createdAt: daysAgo(1) },
];

export const mockCaseDecisions: CaseDecision[] = [
  {
    id: "cd1",
    caseId: "case2",
    decision: "NOT_A_BUG",
    reason: "مشكلة تدريب — تم حلها فوراً",
    decidedBy: "سارة العمري",
    decidedAt: daysAgo(1),
  },
  {
    id: "cd2",
    caseId: "case4",
    decision: "PENDING_APPROVAL",
    reason: "بانتظار موافقة مدير العمليات للتحويل لمسألة",
    decidedBy: "سارة العمري",
    decidedAt: hoursAgo(3),
  },
];

export const mockCaseAttachments: CaseAttachment[] = [
  {
    id: "ca1",
    caseId: "case1",
    name: "login-error.png",
    kind: "image",
    url: "/placeholder.png",
    size: "245 KB",
    uploadedBy: "يوسf المرعي",
    createdAt: hoursAgo(5),
  },
  {
    id: "ca2",
    caseId: "case1",
    name: "auth-log.txt",
    kind: "log",
    url: "/placeholder.log",
    size: "12 KB",
    uploadedBy: "يوسf المرعي",
    createdAt: hoursAgo(5),
  },
];

export const mockAuditLog = [
  { id: "al1", action: "CREATE", entityType: "Case", entityId: "case1", details: "CASE-2026-001", userName: "سارة العمري", createdAt: hoursAgo(5) },
  { id: "al2", action: "CONVERT", entityType: "Report", entityId: "rpt1", details: "RPT-2026-001 → CASE-2026-001", userName: "سارة العمري", createdAt: hoursAgo(4) },
  { id: "al3", action: "ASSIGN", entityType: "Case", entityId: "case1", details: "خالد الشمري", userName: "سارة العمري", createdAt: hoursAgo(3) },
  { id: "al4", action: "STATUS_CHANGE", entityType: "Issue", entityId: "t8", details: "WAITING_DEPLOYMENT", userName: "نور الدين", createdAt: hoursAgo(2) },
  { id: "al5", action: "RESOLVE", entityType: "Case", entityId: "case2", details: "تدريb — 25 دقيقة", userName: "سارة العمري", createdAt: daysAgo(1) },
  { id: "al6", action: "LOGIN", entityType: "User", entityId: "u2", userName: "سارة العمري", createdAt: hoursAgo(0.5) },
];

export const mockEmailTemplates = [
  { id: "et1", key: "report_received", name: "بلاغ جديد وارد", subject: "بلاغ ميداني جديد — {{reportNumber}}", body: "تم استلام بلاغ من {{supervisorName}} في {{governorate}}.\n\n{{observation}}" },
  { id: "et2", key: "case_assigned", name: "تعيين حالة", subject: "تم تعيين حالة {{caseNumber}} لك", body: "مرحباً {{assigneeName}},\n\nتم تعيين الحالة {{caseNumber}}: {{title}}" },
  { id: "et3", key: "sla_breach", name: "تجاوز SLA", subject: "تجاوز SLA — {{caseNumber}}", body: "الحالة {{caseNumber}} تجاوزت وقت الاستجابة المحدد." },
  { id: "et6", key: "developer_fix_escalation", name: "تصعيد — لم يُحل الخلل", subject: "تصعيد — {{caseNumber}} لم يُحل خلال {{hours}} ساعة", body: "مرحباً {{managerName}},\n\nالمطور {{developerName}} لم يُغلق الخلل التقني خلال {{hours}} ساعة.\n\nالحالة: {{caseNumber}}\n{{title}}\n\nيرجى المتابعة مع الفريق." },
  { id: "et4", key: "case_closed", name: "إغلاق حالة", subject: "تم إغلاق {{caseNumber}}", body: "تم إغلاق الحالة {{caseNumber}} بواسطة {{closedBy}}.\n\n{{resolutionNotes}}" },
  { id: "et5", key: "shift_handover", name: "تسليم وردية", subject: "تسليم وردية — {{shiftDate}}", body: "{{fromUser}} → {{toUser}}\n\n{{notes}}" },
];

export const mockShiftHandoversMutable: Array<{
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  shiftDate: string;
  summary: string;
  openTickets: number;
  criticalTickets: number;
  openCases: number;
  notes: string;
  createdAt: string;
}> = [
  {
    id: "sh1",
    fromUserId: "u3",
    fromUserName: "محمد النجار",
    toUserId: "u4",
    toUserName: "ليلى الحسن",
    shiftDate: "2026-08-01",
    summary: "وردية مساء",
    openTickets: 5,
    criticalTickets: 2,
    openCases: 8,
    notes: "مسألة ISS-2026-001 تحتاج متابعة عاجلة.",
    createdAt: daysAgo(1),
  },
];
