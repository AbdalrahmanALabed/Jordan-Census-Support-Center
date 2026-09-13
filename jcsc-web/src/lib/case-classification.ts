import type { CaseType, CaseSeverity } from "@/lib/cases/types";
import type { ReportClassification } from "@/lib/reports";
import type { IssuePriority } from "@/lib/types";
import { PRIORITY_LABELS } from "@/lib/types";

/** الأولوية */
export const PRIORITY_FIELD_LABEL = "الأولوية";

/** الخطورة */
export const SEVERITY_FIELD_LABEL = "الخطورة";

export const SEVERITY_LABELS: Record<CaseSeverity, string> = {
  CRITICAL: "حرجة",
  HIGH: "عالية",
  MEDIUM: "متوسطة",
  LOW: "منخفضة",
};

/** تصنيف البلاغ/الحالة — يختاره السوبر أدمن عند المراجعة */
export const REPORT_CLASSIFY_OPTIONS: { type: CaseType; label: string }[] = [
  { type: "BUG", label: "BUG" },
  { type: "INCIDENT", label: "مشاكل جهاز" },
  { type: "TRAINING_ISSUE", label: "مشكلة في تدريب الباحث" },
  { type: "FEATURE_REQUEST", label: "تحسينات" },
];

/** تصنيف منسق الدعم — System Bug */
export const COORDINATOR_SYSTEM_BUG_LABEL = "System Bug — عطل في النظام";

/** فئات «ليست مشكلة — عطل فني خارج التطبيق» */
export type NotAppIssueCategory = "infrastructure" | "connectivity" | "device" | "operational";

export const NOT_APP_ISSUE_CATEGORIES: { id: NotAppIssueCategory; label: string }[] = [
  { id: "infrastructure", label: "البنية التحتية — MDM والإدارة" },
  { id: "connectivity", label: "الاتصال والشبكة" },
  { id: "device", label: "الجهاز والإعدادات" },
  { id: "operational", label: "تشغيل، مستخدم، وإدارية" },
];

export type NotAppTechnicalIssueId =
  | "MDM"
  | "NETWORK"
  | "DEVICE_SETTINGS"
  | "STORAGE"
  | "BATTERY"
  | "OS_UPDATE"
  | "SIM_DATA"
  | "GPS"
  | "PERMISSIONS"
  | "VPN"
  | "APP_CONFLICT"
  | "PHYSICAL"
  | "TRAINING"
  | "USER_ERROR"
  | "DUPLICATE"
  | "INQUIRY"
  | "FEATURE";

/** أعطال فنية لا علاقة للتطبيق بها — يختارها السوبر أدمن عند «ليست مشكلة» */
export const NOT_APP_TECHNICAL_ISSUE_OPTIONS: {
  id: NotAppTechnicalIssueId;
  label: string;
  hint: string;
  classification: ReportClassification;
  category: NotAppIssueCategory;
}[] = [
  {
    id: "MDM",
    label: "مشاكل MDM / إدارة الأجهزة",
    hint: "تسجيل الجهاز، سياسات MDM، أو قيود الإدارة عن بُعد",
    classification: "CONFIGURATION_ISSUE",
    category: "infrastructure",
  },
  {
    id: "NETWORK",
    label: "مشاكل شبكة الاتصال",
    hint: "Wi-Fi، 4G/5G، ضعف إشارة، أو انقطاع البيانات",
    classification: "CONFIGURATION_ISSUE",
    category: "connectivity",
  },
  {
    id: "VPN",
    label: "VPN أو Proxy",
    hint: "VPN مؤسسي، proxy، أو جدار ناري يحجب الاتصال",
    classification: "CONFIGURATION_ISSUE",
    category: "connectivity",
  },
  {
    id: "SIM_DATA",
    label: "شريحة SIM أو باقة البيانات",
    hint: "SIM غير مفعّلة، باقة منتهية، أو إعداد APN خاطئ",
    classification: "CONFIGURATION_ISSUE",
    category: "connectivity",
  },
  {
    id: "DEVICE_SETTINGS",
    label: "مشاكل إعدادات الجهاز",
    hint: "تاريخ/وقت، لغة، وضع الطيران، أو إعدادات نظام خاطئة",
    classification: "CONFIGURATION_ISSUE",
    category: "device",
  },
  {
    id: "STORAGE",
    label: "مساحة تخزين ممتلئة",
    hint: "الذاكرة ممتلئة تمنع التحديث، التحميل، أو التثبيت",
    classification: "CONFIGURATION_ISSUE",
    category: "device",
  },
  {
    id: "BATTERY",
    label: "بطارية أو شحن",
    hint: "جهاز لا يشحن، ينطفئ سريعاً، أو يتوقف أثناء العمل",
    classification: "CONFIGURATION_ISSUE",
    category: "device",
  },
  {
    id: "OS_UPDATE",
    label: "نظام التشغيل أو التحديثات",
    hint: "إصدار Android/iOS قديم، تحديث معلّق، أو فشل التحديث",
    classification: "CONFIGURATION_ISSUE",
    category: "device",
  },
  {
    id: "GPS",
    label: "GPS / تحديد الموقع",
    hint: "الموقع معطّل على الجهاز أو دقة GPS ضعيفة",
    classification: "CONFIGURATION_ISSUE",
    category: "device",
  },
  {
    id: "PERMISSIONS",
    label: "صلاحيات الجهاز",
    hint: "كamera، ميكrofon، تخزين، أو موقع غير ممنوح للتطبيق",
    classification: "CONFIGURATION_ISSUE",
    category: "device",
  },
  {
    id: "APP_CONFLICT",
    label: "تعارض تطبيقات أخرى",
    hint: "تطبيق آخر على الجهاز يتداخل مع عمل التعداد",
    classification: "OUT_OF_SCOPE",
    category: "device",
  },
  {
    id: "PHYSICAL",
    label: "تلف مادي للجهاز",
    hint: "شاشة مكسورة، زر معطّل، أو عطل hardware",
    classification: "CONFIGURATION_ISSUE",
    category: "device",
  },
  {
    id: "TRAINING",
    label: "مشكلة في تدريب الباحث",
    hint: "نقص معرفة أو خطأ استخدام — يحتاج توعية أو تدريب",
    classification: "TRAINING_ISSUE",
    category: "operational",
  },
  {
    id: "USER_ERROR",
    label: "خطأ مستخدم",
    hint: "إدخال خاطئ أو إجراء غير صحيح من الباحث",
    classification: "USER_MISTAKE",
    category: "operational",
  },
  {
    id: "INQUIRY",
    label: "استفسار",
    hint: "سؤال أو طلب توضيح — لا يتطلب إصلاحاً تقنياً",
    classification: "QUESTION",
    category: "operational",
  },
  {
    id: "DUPLICATE",
    label: "بلاغ مكرر",
    hint: "نفس المشكلة مُبلَّغ عنها مسبقاً",
    classification: "DUPLICATE",
    category: "operational",
  },
  {
    id: "FEATURE",
    label: "طلب تحسين",
    hint: "اقتراح تطوير — وليس عطلاً تقنياً في التطبيق",
    classification: "FEATURE_REQUEST",
    category: "operational",
  },
];

export function getNotAppIssueById(id: NotAppTechnicalIssueId) {
  return NOT_APP_TECHNICAL_ISSUE_OPTIONS.find((o) => o.id === id);
}

/** «ليست مشكلة» — تعليق اختياري فقط */
export function buildSimpleNotProblemReason(extraNote?: string): {
  classification: ReportClassification;
  reason: string;
} {
  const note = extraNote?.trim();
  return {
    classification: "USER_MISTAKE",
    reason: note ? `ليست مشكلة — ${note}` : "ليست مشكلة — لا تحتاج متابعة",
  };
}

/** نص السبب المخزّن في السجل والإشعار */
export function buildNotProblemReason(
  issueId: NotAppTechnicalIssueId,
  extraNote?: string
): { classification: ReportClassification; reason: string } {
  const issue = getNotAppIssueById(issueId);
  if (!issue) {
    return { classification: "CONFIGURATION_ISSUE", reason: extraNote?.trim() || "ليست مشكلة تقنية" };
  }
  const note = extraNote?.trim();
  const reason = note ? `${issue.label} — ${note}` : `${issue.label} — ${issue.hint}`;
  return { classification: issue.classification, reason };
}

/** @deprecated — استخدم NOT_APP_TECHNICAL_ISSUE_OPTIONS */
export const QUICK_CLASSIFY_NOT_PROBLEM: Partial<
  Record<CaseType, { classification: ReportClassification; reason: string }>
> = {
  INCIDENT: {
    classification: "CONFIGURATION_ISSUE",
    reason: "مشاكل جهاز — ليست مشكلة تقنية في التطبيق",
  },
  TRAINING_ISSUE: {
    classification: "TRAINING_ISSUE",
    reason: "مشكلة في تدريب الباحث — ليست مشكلة تقنية",
  },
  FEATURE_REQUEST: {
    classification: "FEATURE_REQUEST",
    reason: "تحسينات — ليست مشكلة تقنية",
  },
};

/** «ليست مشكلة» حسب نوع الحالة المختار + تعليق اختياري */
export function buildCaseTypeNotProblemReason(
  caseType: CaseType,
  extraNote?: string
): { classification: ReportClassification; reason: string } {
  const quick = QUICK_CLASSIFY_NOT_PROBLEM[caseType];
  if (quick) {
    const note = extraNote?.trim();
    return {
      classification: quick.classification,
      reason: note ? `${quick.reason} — ${note}` : quick.reason,
    };
  }
  return buildSimpleNotProblemReason(extraNote);
}

/** اقتراح افتراضي عند اختيار نوع غير BUG في المعالجة السريعة */
export function suggestNotAppIssueForCaseType(type: CaseType): NotAppTechnicalIssueId {
  switch (type) {
    case "INCIDENT":
      return "DEVICE_SETTINGS";
    case "TRAINING_ISSUE":
      return "TRAINING";
    case "FEATURE_REQUEST":
      return "FEATURE";
    default:
      return "MDM";
  }
}

export function isQuickBugClassify(type: CaseType): boolean {
  return type === "BUG";
}

/** @deprecated — استخدم NOT_APP_TECHNICAL_ISSUE_OPTIONS */
export const NOT_PROBLEM_CLASSIFY_OPTIONS: {
  classification: ReportClassification;
  caseType: CaseType;
  label: string;
  hint: string;
}[] = NOT_APP_TECHNICAL_ISSUE_OPTIONS.map((o) => ({
  classification: o.classification,
  caseType:
    o.classification === "TRAINING_ISSUE"
      ? "TRAINING_ISSUE"
      : o.classification === "FEATURE_REQUEST"
        ? "FEATURE_REQUEST"
        : o.classification === "CONFIGURATION_ISSUE"
          ? "INCIDENT"
          : "QUESTION",
  label: o.label,
  hint: o.hint,
}));
/** أولويات السوبر أدمن — عالية، متوسطة، منخفضة فقط */
export const ADMIN_DASHBOARD_PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export type AdminDashboardPriority = (typeof ADMIN_DASHBOARD_PRIORITIES)[number];

/** تحويل «حرجة» القديمة إلى «عالية» للعرض والإحصاء */
export function normalizeAdminPriority(priority: IssuePriority): AdminDashboardPriority {
  return priority === "CRITICAL" ? "HIGH" : priority;
}

export function adminPriorityLabel(priority: IssuePriority): string {
  return PRIORITY_LABELS[normalizeAdminPriority(priority)];
}

/** أولويات السوبر أدمن — بدون «حرجة» */
export const ADMIN_PRIORITY_OPTIONS = ADMIN_DASHBOARD_PRIORITIES.map(
  (key) => [key, PRIORITY_LABELS[key]] as [IssuePriority, string]
);

/** خيارات الخطورة — بدون «حرجة» */
export const SEVERITY_OPTIONS = (
  Object.entries(SEVERITY_LABELS) as [CaseSeverity, string][]
).filter(([key]) => key !== "CRITICAL");

export function normalizeAdminSeverity(severity: CaseSeverity): CaseSeverity {
  return severity === "CRITICAL" ? "HIGH" : severity;
}
