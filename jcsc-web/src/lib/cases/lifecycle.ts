import type { CaseStatus, CaseTimelineEvent } from "@/lib/cases/types";
import { CASE_STATUS_LABELS, CASE_TYPE_LABELS } from "@/lib/cases/types";
import {
  parseStatusChangeDetails,
  stripTimelineMeta,
} from "@/lib/cases/timeline-log";

export type LifecycleEventKind =
  | "created"
  | "status_change"
  | "assignment"
  | "reassign"
  | "classification"
  | "escalation"
  | "resolution"
  | "closure"
  | "return"
  | "comment"
  | "merge"
  | "other";

export interface ParsedLifecycleEvent {
  id: string;
  kind: LifecycleEventKind;
  title: string;
  narrative: string;
  description?: string;
  actorName?: string;
  actorRole?: string;
  createdAt: string;
  fromStatus?: CaseStatus;
  toStatus?: CaseStatus;
  assigneeName?: string;
  reassignFrom?: string;
  reassignTo?: string;
  raw: CaseTimelineEvent;
}

const ACTION_KIND_MAP: Record<string, LifecycleEventKind> = {
  "حالة جديدة من الميدان": "created",
  "إنشاء خلل": "created",
  "إنشاء يدوي": "created",
  "تغيير الحالة": "status_change",
  "تصنيف الحالة": "classification",
  "قبول وتصنيف": "classification",
  "تصعيد System Bug — منسق الدعم": "escalation",
  "تصعيد — تجاوز مهلة المعالجة": "escalation",
  "إسناد": "assignment",
  "إسناد للمعني": "assignment",
  "تعيين مطور": "assignment",
  "إعادة إسناد": "reassign",
  "تم الحل": "resolution",
  "حل فوري": "resolution",
  "موافقة كخلل": "classification",
  "إغلاق الحالة": "closure",
  "ليست مشكلة — إغلاق": "closure",
  "إرجاع للمطور": "return",
  "إرجاع للسوبر أدمن": "return",
  "دمج حالات": "merge",
  تعليق: "comment",
  "ملاحظة داخلية": "comment",
  "بدء المعالجة": "other",
  "قبول الحالة": "other",
};

const LEGACY_STATUS_HINTS: Partial<
  Record<string, { to: CaseStatus; from?: CaseStatus }>
> = {
  "تصعيد System Bug — منسق الدعم": { from: "OPEN", to: "AWAITING_APPROVAL" },
  "إغلاق الحالة": { to: "CLOSED" },
  "ليست مشكلة — إغلاق": { from: "OPEN", to: "CLOSED" },
  "تم الحل": { to: "RESOLVED" },
  "حل فوري": { to: "RESOLVED" },
  "إرجاع للمطور": { to: "IN_PROGRESS" },
  "إرجاع للسوبر أدمن": { to: "AWAITING_APPROVAL" },
  "دمج حالات": { to: "MERGED" },
};

function inferKind(action: string): LifecycleEventKind {
  return ACTION_KIND_MAP[action] ?? "other";
}

function statusLabel(status: CaseStatus): string {
  return CASE_STATUS_LABELS[status] ?? status;
}

function caseTypeLabel(raw?: string): string | undefined {
  if (!raw) return undefined;
  const key = raw.trim() as keyof typeof CASE_TYPE_LABELS;
  return CASE_TYPE_LABELS[key] ?? raw;
}

function parseAssignmentName(details?: string): string | undefined {
  if (!details) return undefined;
  const [firstLine] = details.split("\n");
  const name = firstLine.split(" — ")[0]?.split(" (")[0]?.trim();
  return name || undefined;
}

function parseLegacyReassign(details?: string): {
  from?: string;
  to?: string;
  reason?: string;
} {
  if (!details) return {};
  const match = details.match(/^من (.+?) إلى (.+?)(?: — (.+))?$/);
  if (match) {
    return {
      from: match[1].trim(),
      to: match[2].trim(),
      reason: match[3]?.trim(),
    };
  }
  return {};
}

function inferActorRole(action: string, actorName?: string): string | undefined {
  if (action.includes("منسق") || actorName?.includes("منسق")) return "منسق الدعم";
  if (
    actorName === "Super Admin" ||
    actorName?.includes("أدمن") ||
    actorName?.includes("Admin")
  ) {
    return "سوبر أدمن";
  }
  if (action === "حالة جديدة من الميدان" || actorName?.includes("دعم فني") || actorName?.includes("دعم المراكز")) {
    return "الدعم الفني المراكز";
  }
  if (
    action === "تم الحل" ||
    action === "بدء المعالجة" ||
    action === "إعادة إسناد"
  ) {
    return "مطور";
  }
  return undefined;
}

function actorPhrase(name?: string, role?: string): string {
  const who = name?.trim() || "مستخدم";
  return role ? `${who} (${role})` : who;
}

function buildNarrative(event: Omit<ParsedLifecycleEvent, "narrative">): string {
  const who = actorPhrase(event.actorName, event.actorRole);

  switch (event.kind) {
    case "created":
      return `${who} أنشأ البلاغ من الميدان`;
    case "escalation":
      return `${who} صنّف البلاغ كـ System Bug وأرسله لمراجعة السوبر أدمن`;
    case "classification":
      return event.description
        ? `${who} صنّف البلاغ: ${event.description}`
        : `${who} صنّف البلاغ`;
    case "assignment":
      return `${who} أُسند البلاغ إلى ${event.assigneeName ?? "المعني"}`;
    case "reassign":
      if (event.reassignFrom && event.reassignTo) {
        return `${who} حوّل البلاغ من ${event.reassignFrom} إلى ${event.reassignTo}`;
      }
      return `${who} أعاد إسناد البلاغ`;
    case "status_change":
      if (event.fromStatus && event.toStatus) {
        return `${who} غيّر حالة البلاغ من «${statusLabel(event.fromStatus)}» إلى «${statusLabel(event.toStatus)}»`;
      }
      return `${who} غيّر حالة البلاغ`;
    case "resolution":
      if (event.toStatus === "WAITING_DEPLOYMENT") {
        return `${who} أنهى المعالجة — البلاغ بانتظار النشر`;
      }
      return `${who} أنهى حل البلاغ`;
    case "closure":
      return event.description
        ? `${who} أغلق البلاغ — ${event.description}`
        : `${who} أغلق البلاغ`;
    case "return":
      if (event.raw.action === "إرجاع للمطور") {
        return event.description
          ? `${who} أرجع البلاغ للمطور — ${event.description}`
          : `${who} أرجع البلاغ للمطور`;
      }
      return event.description
        ? `${who} أرجع البلاغ للسوبر أدمن — ${event.description}`
        : `${who} أرجع البلاغ للسوبر أدمن`;
    case "merge":
      return `${who} دمج بلاغات مكررة في هذا البلاغ`;
    case "comment":
      return event.raw.action === "ملاحظة داخلية"
        ? `${who} أضاف ملاحظة داخلية`
        : `${who} أضاف تعليقاً`;
    default:
      return event.description
        ? `${who} — ${event.raw.action}: ${event.description}`
        : `${who} — ${event.raw.action}`;
  }
}

export function parseTimelineEvent(event: CaseTimelineEvent): ParsedLifecycleEvent {
  const kind = inferKind(event.action);
  const meta = stripTimelineMeta(event.details);
  const statusChange = parseStatusChangeDetails(event.details);
  const legacyHint = LEGACY_STATUS_HINTS[event.action];
  const legacyReassign = kind === "reassign" ? parseLegacyReassign(meta.body) : {};

  let fromStatus = statusChange?.from ?? legacyHint?.from;
  let toStatus = statusChange?.to ?? legacyHint?.to;
  let description = statusChange?.note ?? meta.body;
  let assigneeName: string | undefined;
  const reassignFrom = meta.reassignFrom ?? legacyReassign.from;
  const reassignTo = meta.reassignTo ?? legacyReassign.to;
  const actorRole =
    meta.role ?? inferActorRole(event.action, event.actorName);

  if (kind === "assignment") {
    assigneeName = parseAssignmentName(meta.body);
    description = meta.body?.split("\n").slice(1).join("\n").trim() || undefined;
  }

  if (kind === "reassign") {
    if (!reassignFrom || !reassignTo) {
      assigneeName = parseAssignmentName(meta.body);
    }
    description =
      meta.body?.split("\n").slice(1).join("\n").trim() ||
      legacyReassign.reason ||
      undefined;
  }

  if (kind === "classification") {
    const typeLabel = caseTypeLabel(meta.body?.split("\n")[0]);
    description = typeLabel ?? meta.body;
  }

  if (kind === "escalation") {
    fromStatus = fromStatus ?? "OPEN";
    toStatus = toStatus ?? "AWAITING_APPROVAL";
    description = statusChange?.note ?? meta.body;
  }

  if (kind === "created") {
    description = meta.body;
  }

  if (kind === "resolution") {
    description = meta.body;
    if (meta.body?.includes("يتطلب نشر")) {
      toStatus = toStatus ?? "WAITING_DEPLOYMENT";
    } else {
      toStatus = toStatus ?? "RESOLVED";
    }
  }

  if (kind === "closure") {
    toStatus = toStatus ?? "CLOSED";
    description = meta.body;
  }

  if (kind === "return" || kind === "comment" || kind === "merge") {
    description = meta.body;
  }

  if (description?.startsWith("__status__:")) {
    description = undefined;
  }

  const base: Omit<ParsedLifecycleEvent, "narrative"> = {
    id: event.id,
    kind,
    title: event.action,
    description,
    actorName: event.actorName,
    actorRole,
    createdAt: event.createdAt,
    fromStatus,
    toStatus,
    assigneeName,
    reassignFrom,
    reassignTo,
    raw: event,
  };

  return {
    ...base,
    narrative: buildNarrative(base),
  };
}

/** Hide redundant status rows when another event already explains the same transition */
function shouldHideEvent(
  event: ParsedLifecycleEvent,
  all: ParsedLifecycleEvent[]
): boolean {
  if (event.kind !== "status_change") return false;

  const idx = all.findIndex((e) => e.id === event.id);
  if (idx <= 0) return false;

  const window = all.slice(Math.max(0, idx - 2), idx + 1).filter((e) => e.id !== event.id);
  return window.some(
    (other) =>
      other.toStatus === event.toStatus &&
      Math.abs(
        new Date(other.createdAt).getTime() - new Date(event.createdAt).getTime()
      ) < 5000 &&
      ["escalation", "classification", "assignment", "closure", "resolution", "return", "reassign"].includes(
        other.kind
      )
  );
}

export function parseCaseLifecycle(events: CaseTimelineEvent[]): ParsedLifecycleEvent[] {
  const parsed = events.map(parseTimelineEvent);
  return parsed.filter((e) => !shouldHideEvent(e, parsed));
}

export const LIFECYCLE_KIND_LABELS: Record<LifecycleEventKind, string> = {
  created: "إنشاء",
  status_change: "حالة",
  assignment: "إسناد",
  reassign: "تحويل",
  classification: "تصنيف",
  escalation: "تصعيد",
  resolution: "حل",
  closure: "إغلاق",
  return: "إرجاع",
  comment: "تعليق",
  merge: "دمج",
  other: "حدث",
};

export function getLifecycleSummary(events: CaseTimelineEvent[]): {
  totalSteps: number;
  assignments: number;
  statusChanges: number;
  lastEvent?: ParsedLifecycleEvent;
} {
  const parsed = parseCaseLifecycle(events);
  return {
    totalSteps: parsed.length,
    assignments: parsed.filter(
      (e) => e.kind === "assignment" || e.kind === "reassign"
    ).length,
    statusChanges: parsed.filter(
      (e) => e.kind === "status_change" || (e.fromStatus && e.toStatus)
    ).length,
    lastEvent: parsed[parsed.length - 1],
  };
}
