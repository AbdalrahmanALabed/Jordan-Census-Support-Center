import type {
  TicketChecklistItem,
  TicketAIAnalysis,
  SimilarTicket,
  Playbook,
  ShiftHandover,
  EscalationNotification,
} from "@/lib/operations";

const hoursAgo = (h: number) =>
  new Date(Date.now() - h * 3600000).toISOString();
const daysAgo = (d: number) =>
  new Date(Date.now() - d * 86400000).toISOString();

export const mockPlaybooks: Playbook[] = [
  {
    id: "pb1",
    title: "حل مشاكل تسجيل الدخول",
    issueType: "تسجيل الدخول",
    steps: [
      "اسأل المستخدم عن آخر تحديث للتطبيق",
      "اطلب إعادة تشغيل التطبيق",
      "تحقق من حالة الخادم",
      "امسح ذاكرة التطبيق إذا لزم",
      "صعّد إلى L2 إذا استمرت المشكلة",
    ],
    estimatedMinutes: 15,
    team: "دعم L1",
  },
  {
    id: "pb2",
    title: "إصلاح مشاكل المزامنة",
    issueType: "مزامنة البيانات",
    steps: [
      "تحقق من آخر وقت Sync",
      "افحص قوة الإشارة ومساحة التخزين",
      "أعد تشغيل الجهاز",
      "راجع سجلات المزامنة",
      "صعّد إلى قاعدة البيانات إذا فشلت",
    ],
    estimatedMinutes: 20,
    team: "دعم L2",
  },
  {
    id: "pb3",
    title: "معايرة GPS",
    issueType: "GPS",
    steps: [
      "تأكد من تفعيل GPS",
      "اطلب من المستخدم الوقوف في مكان مفتوح",
      "جرّب معايرة الموقع",
      "Escalate to APK team if the issue persists",
    ],
    estimatedMinutes: 10,
    team: "APK",
  },
  {
    id: "pb4",
    title: "استكشاف توقف التطبيق",
    issueType: "تطبيق الميدان",
    steps: [
      "اسأل عن نوع الجهاز وإصدار النظام",
      "امسح الذاكرة المؤقتة",
      "أعد تشغيل الجهاز",
      "أعد تثبيت التطبيق إذا لزم",
    ],
    estimatedMinutes: 25,
    team: "التطوير",
  },
  {
    id: "pb5",
    title: "صيانة أجهزة Tablet",
    issueType: "الأجهزة",
    steps: [
      "فحص مستوى الشحن",
      "تحديث نظام التشغيل",
      "فحص الشاشة والأزرار",
      "استبدال الجهاز إذا كان معطوباً",
    ],
    estimatedMinutes: 30,
    team: "دعم L1",
  },
];

export const mockChecklists: TicketChecklistItem[] = [
  { id: "cl1", ticketId: "t1", label: "التحقق من اتصال الإنترنت", completed: true, order: 1 },
  { id: "cl2", ticketId: "t1", label: "إعادة تشغيل التطبيق", completed: true, order: 2 },
  { id: "cl3", ticketId: "t1", label: "مسح ذاكرة التطبيق", completed: false, order: 3 },
  { id: "cl4", ticketId: "t1", label: "التأكد من صحة بيانات الدخول", completed: false, order: 4 },
  { id: "cl5", ticketId: "t2", label: "فحص قوة الإشارة", completed: true, order: 1 },
  { id: "cl6", ticketId: "t2", label: "التأكد من مساحة التخزين", completed: false, order: 2 },
];

export const mockAIAnalysis: Record<string, TicketAIAnalysis> = {
  t1: {
    ticketId: "t1",
    summary: "المستخدم لا يستطيع تسجيل الدخول بعد تحديث التطبيق. المشكلة حرجة وتؤثر على العمل.",
    suggestedSolution: "جرّب إعادة تشغيل التطبيق ثم امسح الذاكرة المؤقتة. إذا استمرت المشكلة، أعد تثبيت التطبيق.",
    recommendedTeam: "دعم L1",
    slaHours: 1,
    slaDeadline: hoursAgo(-1),
    escalationPath: ["دعم L1", "دعم L2", "مدير الدعم"],
    confidence: 0.92,
  },
  t2: {
    ticketId: "t2",
    summary: "تأخر مزامنة البيانات في إربد منذ 3 ساعات. قد يؤثر على دقة البيانات.",
    suggestedSolution: "تحقق من الإشارة ومساحة التخزين، ثم أعد تشغيل الجهاز.",
    recommendedTeam: "دعم L2",
    slaHours: 4,
    slaDeadline: hoursAgo(-4),
    escalationPath: ["دعم L2", "قاعدة البيانات", "مدير الدعم"],
    confidence: 0.88,
  },
};

export const mockSimilarTickets: Record<string, SimilarTicket[]> = {
  t1: [
    { id: "t10", number: "ISS-2026-010", title: "تسجيل دخول متكرر - عجلون", similarity: 0.91, status: "ASSIGNED" },
    { id: "t6", number: "ISS-2026-006", title: "خطأ في الاستبيان - معان", similarity: 0.72, status: "READY_FOR_TESTING", resolvedAt: daysAgo(1) },
  ],
  t2: [
    { id: "t8", number: "ISS-2026-008", title: "فشل الاتصال بقاعدة البيانات", similarity: 0.85, status: "WAITING_DEPLOYMENT" },
  ],
};

export const mockShiftHandovers: ShiftHandover[] = [
  {
    id: "sh1",
    fromUserName: "سارة العمري",
    toUserName: "محمد النجار",
    shiftDate: new Date().toISOString().split("T")[0],
    summary: "3 تذاكر حرجة مفتوحة، 2 بانتظار المزامنة",
    openTickets: 8,
    criticalTickets: 3,
    pendingEscalations: 1,
    notes: "مسألة ISS-2026-001 تحتاج متابعة عاجلة. مستخدمون في إربد يواجهون مشاكل Sync.",
    createdAt: hoursAgo(8),
  },
  {
    id: "sh2",
    fromUserName: "محمد النجار",
    toUserName: "ليلى الحسن",
    shiftDate: daysAgo(1).split("T")[0],
    summary: "وردية هادئة، تم حل 5 تذاكر",
    openTickets: 5,
    criticalTickets: 1,
    pendingEscalations: 0,
    notes: "لا توجد تصعيدات معلقة.",
    createdAt: daysAgo(1),
  },
];

export const mockEscalationNotifications: EscalationNotification[] = [
  {
    id: "en1",
    title: "تصعيد تلقائي — SLA متجاوز",
    message: "ISS-2026-001 تجاوزت وقت الاستجابة المحدد",
    isRead: false,
    userId: "u2",
    createdAt: hoursAgo(0.5),
    level: "critical",
    ticketNumber: "ISS-2026-001",
    actionRequired: true,
  },
  {
    id: "en2",
    title: "تذكرة مكررة محتملة",
    message: "تم رصد بلاغ مشابه لـ ISS-2026-010",
    isRead: false,
    userId: "u3",
    createdAt: hoursAgo(1),
    level: "warning",
    ticketNumber: "ISS-2026-001",
    actionRequired: false,
  },
  {
    id: "en3",
    title: "اقتراح حل من قاعدة المعرفة",
    message: "مقال معرفي مطابق متاح: حل مشكلة تسجيل الدخول",
    isRead: true,
    userId: "u3",
    createdAt: hoursAgo(2),
    level: "info",
    actionRequired: false,
  },
  {
    id: "en4",
    title: "تسليم وردية",
    message: "سارة العمري سلّمت الوردية — 3 تذاكر حرجة",
    isRead: false,
    userId: "u3",
    createdAt: hoursAgo(8),
    level: "warning",
    actionRequired: true,
  },
];
