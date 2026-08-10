/**
 * Support Operations Lifecycle — end-to-end flow from field observation to resolution.
 *
 * Phase 1: Field Observation (Report)
 * Phase 2: Manager Review & Classification
 * Phase 3: Issue Execution (Support Operations)
 * Phase 4: Verification & Closure
 */

export type LifecyclePhase =
  | "OBSERVATION"
  | "REVIEW"
  | "EXECUTION"
  | "VERIFICATION";

export const LIFECYCLE_PHASE_LABELS: Record<LifecyclePhase, string> = {
  OBSERVATION: "الملاحظة الميدانية",
  REVIEW: "مراجعة العمليات",
  EXECUTION: "تنفيذ الدعم",
  VERIFICATION: "التحقق والإغلاق",
};

export const LIFECYCLE_PHASES: {
  phase: LifecyclePhase;
  label: string;
  description: string;
  steps: { key: string; label: string }[];
}[] = [
  {
    phase: "OBSERVATION",
    label: "الملاحظة الميدانية",
    description: "المشرف يرسل ملاحظة — ليس تذكرة",
    steps: [{ key: "NEW", label: "بلاغ جديد" }],
  },
  {
    phase: "REVIEW",
    label: "مراجعة العمليات",
    description: "مدير العمليات يقيّم: مشكلة أم لا؟",
    steps: [
      { key: "UNDER_REVIEW", label: "قيد المراجعة" },
      { key: "WAITING_CLASSIFICATION", label: "بانتظار التصنيف" },
      { key: "REJECTED", label: "ليست مشكلة" },
    ],
  },
  {
    phase: "EXECUTION",
    label: "تنفيذ الدعم",
    description: "المسألة تُعيَّن وتُعالَج عبر الفرق",
    steps: [
      { key: "RECEIVED", label: "وارد" },
      { key: "ASSIGNED", label: "معيّن" },
      { key: "IN_PROGRESS", label: "قيد المعالجة" },
      { key: "NEED_INFO", label: "يحتاج معلومات" },
      { key: "WAITING_DEPLOYMENT", label: "بانتظار النشر" },
    ],
  },
  {
    phase: "VERIFICATION",
    label: "التحقق والإغلاق",
    description: "اختبار الحل واعتماد الإغلاق",
    steps: [
      { key: "READY_FOR_TESTING", label: "جاهز للاختبار" },
      { key: "RETURNED", label: "مُعاد للمعالجة" },
      { key: "CLOSED", label: "مغلق" },
    ],
  },
];

/** Map legacy ticket statuses to operations issue statuses */
export const LEGACY_TICKET_TO_ISSUE: Record<string, string> = {
  OPEN: "RECEIVED",
  IN_PROGRESS: "IN_PROGRESS",
  PENDING: "NEED_INFO",
  RESOLVED: "READY_FOR_TESTING",
  CLOSED: "CLOSED",
};

export const REPORT_TO_ISSUE_TRANSITION = "CONVERTED" as const;
