"use client";

import {
  ArrowLeft,
  CircleDot,
  Clock,
  GitMerge,
  History,
  MessageSquare,
  RotateCcw,
  Tag,
  UserPlus,
  Zap,
  XCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { CaseStatus, CaseTimelineEvent } from "@/lib/cases/types";
import { CASE_STATUS_LABELS } from "@/lib/cases/types";
import {
  parseCaseLifecycle,
  getLifecycleSummary,
  LIFECYCLE_KIND_LABELS,
  type LifecycleEventKind,
  type ParsedLifecycleEvent,
} from "@/lib/cases/lifecycle";

const KIND_ICONS: Record<LifecycleEventKind, React.ElementType> = {
  created: CircleDot,
  status_change: ArrowLeft,
  assignment: UserPlus,
  reassign: UserPlus,
  classification: Tag,
  escalation: AlertTriangle,
  resolution: CheckCircle2,
  closure: XCircle,
  return: RotateCcw,
  comment: MessageSquare,
  merge: GitMerge,
  other: History,
};

const KIND_STYLES: Record<
  LifecycleEventKind,
  { ring: string; bg: string; icon: string; badge: string }
> = {
  created: {
    ring: "border-blue-500",
    bg: "bg-blue-500/10",
    icon: "text-blue-600",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  status_change: {
    ring: "border-violet-500",
    bg: "bg-violet-500/10",
    icon: "text-violet-600",
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  },
  assignment: {
    ring: "border-cyan-500",
    bg: "bg-cyan-500/10",
    icon: "text-cyan-600",
    badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  },
  reassign: {
    ring: "border-teal-500",
    bg: "bg-teal-500/10",
    icon: "text-teal-600",
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  },
  classification: {
    ring: "border-amber-500",
    bg: "bg-amber-500/10",
    icon: "text-amber-600",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  escalation: {
    ring: "border-orange-500",
    bg: "bg-orange-500/10",
    icon: "text-orange-600",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  },
  resolution: {
    ring: "border-emerald-500",
    bg: "bg-emerald-500/10",
    icon: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  closure: {
    ring: "border-slate-500",
    bg: "bg-slate-500/10",
    icon: "text-slate-600",
    badge: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  },
  return: {
    ring: "border-rose-500",
    bg: "bg-rose-500/10",
    icon: "text-rose-600",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  },
  comment: {
    ring: "border-muted-foreground/40",
    bg: "bg-muted/40",
    icon: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
  },
  merge: {
    ring: "border-indigo-500",
    bg: "bg-indigo-500/10",
    icon: "text-indigo-600",
    badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  },
  other: {
    ring: "border-border",
    bg: "bg-muted/30",
    icon: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
  },
};

function StatusPill({ status }: { status: CaseStatus }) {
  return (
    <span className="inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-black">
      {CASE_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function LifecycleEventCard({ event }: { event: ParsedLifecycleEvent }) {
  const styles = KIND_STYLES[event.kind];
  const Icon = KIND_ICONS[event.kind];

  return (
    <div className={cn("rounded-xl border-2 p-4 md:p-5", styles.bg, "border-border/60")}>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-card",
            styles.ring
          )}
        >
          <Icon className={cn("h-4 w-4", styles.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-black tracking-wide",
                styles.badge
              )}
            >
              {LIFECYCLE_KIND_LABELS[event.kind]}
            </span>
          </div>

          <p className="font-black text-base leading-relaxed">{event.narrative}</p>

          {(event.fromStatus || event.toStatus) &&
            event.kind !== "assignment" &&
            event.kind !== "reassign" && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {event.fromStatus && <StatusPill status={event.fromStatus} />}
                {event.fromStatus && event.toStatus && (
                  <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                )}
                {event.toStatus && <StatusPill status={event.toStatus} />}
              </div>
            )}

          {event.description &&
            !event.narrative.includes(event.description) &&
            event.kind !== "closure" &&
            event.kind !== "return" && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            )}

          <p className="text-sm font-bold text-primary mt-3 flex items-center gap-1.5">
            <Clock className="h-4 w-4 shrink-0" />
            {formatDate(event.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CaseLifecycleTimeline({ events }: { events: CaseTimelineEvent[] }) {
  const parsed = parseCaseLifecycle(events);
  const summary = getLifecycleSummary(events);

  if (!parsed.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/20 py-14 text-center">
        <History className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="font-bold text-muted-foreground">لا أحداث في السجل بعد</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          سيظهر هنا من أنشأ البلاغ، من صنّفه، من أُسند إليه، وكل تغيير مع التاريخ والوقت
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 bg-gradient-to-l from-primary/5 to-transparent p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="font-black">ملخص السجل</h3>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-xl bg-card border px-3 py-1.5 font-bold">
            {summary.totalSteps} خطوة
          </span>
          {summary.assignments > 0 && (
            <span className="rounded-xl bg-cyan-100 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 px-3 py-1.5 font-bold">
              {summary.assignments} إسناد/تحويل
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border-2 bg-card p-5 md:p-6">
        <ol className="relative space-y-4">
          {parsed.map((event, i) => {
            const isLast = i === parsed.length - 1;
            const Icon = KIND_ICONS[event.kind];
            return (
              <li key={event.id} className="relative flex gap-4">
                {!isLast && (
                  <span
                    className="absolute start-[17px] top-10 bottom-0 w-0.5 bg-border"
                    aria-hidden
                  />
                )}
                <div
                  className={cn(
                    "relative z-10 mt-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-card",
                    KIND_STYLES[event.kind].ring
                  )}
                >
                  <Icon className={cn("h-4 w-4", KIND_STYLES[event.kind].icon)} />
                </div>
                <div className="min-w-0 flex-1 pb-2">
                  <LifecycleEventCard event={event} />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
