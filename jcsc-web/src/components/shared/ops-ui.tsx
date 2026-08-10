"use client";

import Link from "next/link";
import { Check, ChevronLeft, CircleDot, Wrench, CheckCircle2, Archive, MapPin, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseStatus, SimpleCaseStatus } from "@/lib/cases/types";
import {
  SIMPLE_CASE_STATUS_LABELS,
  caseNeedsCoordinatorReview,
  caseNeedsSuperAdminReview,
  caseNeedsClassifyAssign,
} from "@/lib/cases/types";

/* ─── Status colors ─── */
export const STATUS_STYLES: Record<
  SimpleCaseStatus,
  { bg: string; text: string; border: string; dot: string }
> = {
  NEW: {
    bg: "bg-sky-50 dark:bg-sky-950/40",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-800",
    dot: "bg-sky-500",
  },
  IN_PROGRESS: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-800 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  SOLVED: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-800 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  CLOSED: {
    bg: "bg-slate-100 dark:bg-slate-800/40",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
  },
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: SimpleCaseStatus;
  label: string;
  className?: string;
}) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold",
        s.bg,
        s.text,
        s.border,
        className
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", s.dot)} />
      {label}
    </span>
  );
}

/* ─── KPI tile ─── */
export function KpiTile({
  label,
  value,
  href,
  icon: Icon,
  accent = "primary",
  urgent,
  active,
  onClick,
}: {
  label: string;
  value: number;
  href: string;
  icon: React.ElementType;
  accent?: "primary" | "sky" | "amber" | "emerald" | "slate";
  urgent?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  const accents = {
    primary: "from-emerald-500/15 via-teal-500/8 to-cyan-500/5 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40",
    sky: "from-sky-500/15 via-blue-500/8 to-indigo-500/5 text-sky-700 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/40",
    amber: "from-amber-500/15 via-orange-500/8 to-yellow-500/5 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40",
    emerald: "from-emerald-500/15 via-green-500/8 to-lime-500/5 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40",
    slate: "from-slate-500/15 via-gray-500/8 to-zinc-500/5 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/40",
  };

  const iconBg = {
    primary: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    slate: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  };

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group kpi-shine flex flex-col gap-4 rounded-2xl border bg-gradient-to-br p-5 md:p-6 transition-all duration-300",
        "hover:shadow-card-hover hover:-translate-y-1.5 hover:scale-[1.02]",
        accents[accent],
        urgent && value > 0 && "ring-2 ring-red-400/60 shadow-glow animate-pulse-soft",
        active && "ring-2 ring-primary/50 shadow-md scale-[1.02]"
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "rounded-2xl p-3 shadow-sm ring-1 ring-black/[0.04] transition-transform group-hover:scale-110",
            iconBg[accent]
          )}
        >
          <Icon className="h-7 w-7" strokeWidth={2} />
        </div>
        {urgent && value > 0 && (
          <span className="rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-3 py-1 text-[11px] font-black text-white shadow-md">
            عاجل
          </span>
        )}
      </div>
      <div>
        <p className="text-4xl md:text-5xl font-black tabular-nums tracking-tight leading-none">
          {value}
        </p>
        <p className="text-sm font-bold mt-2 opacity-80 leading-snug">{label}</p>
      </div>
    </Link>
  );
}

/* ─── Page hero ─── */
export function PageHero({
  title,
  subtitle,
  children,
  variant = "default",
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  variant?: "default" | "urgent" | "calm";
}) {
  const variants = {
    default: "from-emerald-500/10 via-teal-500/5 to-cyan-500/5 border-emerald-200/40 dark:border-emerald-800/30",
    urgent: "from-red-500/10 via-orange-500/5 to-amber-500/5 border-red-200/40 dark:border-red-800/30",
    calm: "from-emerald-500/10 via-green-500/5 to-transparent border-emerald-200/40 dark:border-emerald-800/30",
  };

  return (
    <div
      className={cn(
        "glass-card border-2 bg-gradient-to-l p-6 md:p-8 relative overflow-hidden",
        variants[variant]
      )}
    >
      <div className="absolute -top-16 -start-16 h-40 w-40 rounded-full bg-brand-gradient opacity-[0.12] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -end-10 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />
      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-[1.75rem] font-black text-foreground tracking-tight leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl font-medium leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {children && (
          <div className="flex flex-wrap gap-2.5 items-center">{children}</div>
        )}
      </div>
    </div>
  );
}

/* ─── Alert banner ─── */
export function AlertBanner({
  icon: Icon,
  title,
  description,
  tone = "sky",
  action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  tone?: "sky" | "amber" | "emerald" | "red";
  action?: React.ReactNode;
}) {
  const tones = {
    sky: {
      border: "border-sky-300/70 dark:border-sky-700/50",
      bg: "from-sky-500/12 via-card to-emerald-500/8",
      icon: "bg-gradient-to-br from-sky-500 to-cyan-600 shadow-sky-500/30",
      title: "text-sky-900 dark:text-sky-100",
    },
    amber: {
      border: "border-amber-300/70 dark:border-amber-700/50",
      bg: "from-amber-500/12 via-card to-orange-500/8",
      icon: "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30",
      title: "text-amber-900 dark:text-amber-100",
    },
    emerald: {
      border: "border-emerald-300/70 dark:border-emerald-700/50",
      bg: "from-emerald-500/12 via-card to-teal-500/8",
      icon: "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30",
      title: "text-emerald-900 dark:text-emerald-100",
    },
    red: {
      border: "border-red-300/70 dark:border-red-700/50",
      bg: "from-red-500/10 via-card to-orange-500/8",
      icon: "bg-gradient-to-br from-red-500 to-orange-600 shadow-red-500/30",
      title: "text-red-900 dark:text-red-100",
    },
  };
  const t = tones[tone];

  return (
    <div
      className={cn(
        "rounded-2xl border-2 bg-gradient-to-l p-5 md:p-6 flex flex-wrap items-center gap-4 shadow-md",
        t.border,
        t.bg
      )}
    >
      <div
        className={cn(
          "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg",
          t.icon
        )}
      >
        <Icon className="h-7 w-7" />
      </div>
      <div className="flex-1 min-w-[200px]">
        <p className={cn("text-xl font-black", t.title)}>{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 font-medium">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/* ─── Workflow step card (case review flow) ─── */
type WorkflowTone = "sky" | "amber" | "emerald" | "violet";

const WORKFLOW_TONES: Record<
  WorkflowTone,
  { border: string; header: string; icon: string; glow: string }
> = {
  sky: {
    border: "border-sky-300/70 dark:border-sky-700/50",
    header: "border-sky-200/60 bg-sky-500/10 dark:bg-sky-950/40",
    icon: "bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-500/30",
    glow: "from-sky-400/20 via-transparent to-emerald-400/10",
  },
  amber: {
    border: "border-amber-300/70 dark:border-amber-700/50",
    header: "border-amber-200/60 bg-amber-500/10 dark:bg-amber-950/40",
    icon: "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30",
    glow: "from-amber-400/20 via-transparent to-violet-400/10",
  },
  emerald: {
    border: "border-emerald-300/70 dark:border-emerald-700/50",
    header: "border-emerald-200/60 bg-emerald-500/10 dark:bg-emerald-950/40",
    icon: "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30",
    glow: "from-emerald-400/20 via-transparent to-cyan-400/10",
  },
  violet: {
    border: "border-violet-300/70 dark:border-violet-700/50",
    header: "border-violet-200/60 bg-violet-500/10 dark:bg-violet-950/40",
    icon: "bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/30",
    glow: "from-violet-400/20 via-transparent to-fuchsia-400/10",
  },
};

export function WorkflowStepCard({
  step,
  title,
  subtitle,
  icon: Icon,
  tone = "sky",
  children,
  className,
}: {
  step: number;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  tone?: WorkflowTone;
  children: React.ReactNode;
  className?: string;
}) {
  const t = WORKFLOW_TONES[tone];

  return (
    <div
      className={cn(
        "workflow-panel relative overflow-hidden rounded-2xl border-2 shadow-xl",
        t.border,
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
          t.glow
        )}
      />
      <div className={cn("relative border-b px-5 py-4 flex items-center gap-3", t.header)}>
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-lg",
            t.icon
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-white/70 dark:bg-white/10 px-2.5 py-0.5 text-xs font-black text-foreground">
              الخطوة {step}
            </span>
            <p className="font-black text-lg">{title}</p>
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5 font-medium">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="relative p-5 md:p-6">{children}</div>
    </div>
  );
}

/* ─── Case workflow progress bar ─── */
const WORKFLOW_STEPS = [
  { id: 1, label: "قبول الحالة" },
  { id: 2, label: "تصنيف وإسناد" },
  { id: 3, label: "المعالجة" },
] as const;

function workflowStepState(
  status: CaseStatus,
  stepId: number
): "done" | "active" | "upcoming" {
  if (stepId === 1) {
    if (caseNeedsCoordinatorReview(status)) return "active";
    if (caseNeedsSuperAdminReview(status)) return "active";
    if (caseNeedsClassifyAssign(status)) return "done";
    return "done";
  }
  if (stepId === 2) {
    if (caseNeedsCoordinatorReview(status)) return "upcoming";
    if (caseNeedsSuperAdminReview(status)) return "active";
    if (caseNeedsClassifyAssign(status)) return "active";
    return "done";
  }
  // step 3
  if (
    caseNeedsCoordinatorReview(status) ||
    caseNeedsSuperAdminReview(status) ||
    caseNeedsClassifyAssign(status)
  ) {
    return "upcoming";
  }
  if (["IN_PROGRESS", "WAITING_DEPLOYMENT", "READY_FOR_TESTING"].includes(status)) return "active";
  if (status === "RESOLVED") return "done";
  return status === "CLOSED" || status === "MERGED" ? "done" : "active";
}

export function CaseWorkflowProgress({ status }: { status: CaseStatus }) {
  return (
    <div className="glass-card border-2 p-4 md:p-5">
      <p className="text-xs font-bold text-muted-foreground mb-4 tracking-wide">
        مسار معالجة الحالة
      </p>
      <div className="flex items-start gap-0">
        {WORKFLOW_STEPS.map((step, i) => {
          const state = workflowStepState(status, step.id);
          const isLast = i === WORKFLOW_STEPS.length - 1;

          return (
            <div key={step.id} className={cn("flex items-start", !isLast && "flex-1")}>
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-black transition-all",
                    state === "done" &&
                      "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/30",
                    state === "active" &&
                      "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110 animate-pulse-soft",
                    state === "upcoming" &&
                      "border-muted-foreground/25 bg-muted/50 text-muted-foreground"
                  )}
                >
                  {state === "done" ? <Check className="h-5 w-5" /> : step.id}
                </div>
                <p
                  className={cn(
                    "text-xs font-bold text-center max-w-[5.5rem] leading-tight",
                    state === "active" && "text-primary",
                    state === "done" && "text-emerald-700 dark:text-emerald-400",
                    state === "upcoming" && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 mt-5 rounded-full transition-colors",
                    state === "done" ? "bg-emerald-400" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Filter section ─── */
export function FilterSection({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5 text-start">
      <div className="flex items-center gap-2">
        {Icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="text-sm font-black text-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
}

type FilterOption<T extends string> = {
  value: T;
  label: string;
  icon?: React.ElementType;
};

/* ─── Filter pills ─── */
export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  allLabel = "الكل",
  variant = "pills",
  label,
  icon,
}: {
  options: FilterOption<T>[];
  value: T | "ALL";
  onChange: (v: T | "ALL") => void;
  allLabel?: string;
  variant?: "pills" | "segmented" | "chips";
  label?: string;
  icon?: React.ElementType;
}) {
  const isActive = (v: T | "ALL") => value === v;

  const pillClass = (active: boolean) =>
    cn(
      "text-sm font-bold transition-all duration-200",
      variant === "chips"
        ? cn(
            "shrink-0 rounded-lg border px-3.5 py-2",
            active
              ? "border-primary bg-primary/10 text-primary shadow-sm"
              : "border-border/60 bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
          )
        : cn(
            "rounded-full border-2 px-5 py-2.5",
            active
              ? "bg-brand-gradient text-white border-transparent shadow-glow"
              : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:border-border"
          )
    );

  const segmentedControl = (
    <div className="flex w-full gap-1 overflow-x-auto rounded-xl border-2 bg-muted/25 p-1 scrollbar-none">
      <button
        type="button"
        onClick={() => onChange("ALL" as T | "ALL")}
        className={cn(
          "flex min-w-[4.5rem] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-bold transition-all whitespace-nowrap",
          isActive("ALL")
            ? "bg-background text-foreground shadow-sm ring-1 ring-border"
            : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
        )}
      >
        {allLabel}
      </button>
      {options.map((opt) => {
        const OptIcon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex min-w-[5rem] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-bold transition-all whitespace-nowrap",
              isActive(opt.value)
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
            )}
          >
            {OptIcon && <OptIcon className="h-4 w-4 shrink-0 opacity-80" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  const pillsControl =
    variant === "chips" ? (
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        <button type="button" onClick={() => onChange("ALL" as T | "ALL")} className={pillClass(isActive("ALL"))}>
          {allLabel}
        </button>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={pillClass(isActive(opt.value))}
          >
            {opt.label}
          </button>
        ))}
      </div>
    ) : (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange("ALL" as T | "ALL")} className={pillClass(isActive("ALL"))}>
          {allLabel}
        </button>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={pillClass(isActive(opt.value))}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );

  const control = variant === "segmented" ? segmentedControl : pillsControl;

  if (label) {
    return (
      <FilterSection label={label} icon={icon}>
        {control}
      </FilterSection>
    );
  }

  return control;
}

/* ─── Case row ─── */
const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-amber-500",
  LOW: "bg-slate-400",
};

const PRIORITY_RING: Record<string, string> = {
  CRITICAL: "ring-red-500/30",
  HIGH: "ring-orange-500/30",
  MEDIUM: "ring-amber-500/30",
  LOW: "ring-slate-400/20",
};

const STATUS_ICON: Record<SimpleCaseStatus, React.ElementType> = {
  NEW: CircleDot,
  IN_PROGRESS: Wrench,
  SOLVED: CheckCircle2,
  CLOSED: Archive,
};

export function StatusFilterNav<T extends string>({
  options,
  value,
  onChange,
  totalCount,
  allLabel = "الكل",
}: {
  options: { value: T; label: string; icon?: React.ElementType; count: number }[];
  value: T | "ALL";
  onChange: (v: T | "ALL") => void;
  totalCount: number;
  allLabel?: string;
}) {
  const items: { value: T | "ALL"; label: string; icon?: React.ElementType; count: number }[] = [
    { value: "ALL", label: allLabel, count: totalCount },
    ...options,
  ];

  return (
    <nav className="space-y-1" aria-label="فلتر الحالة">
      {items.map((item) => {
        const active = value === item.value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all",
              active
                ? "bg-brand-gradient text-white shadow-md shadow-primary/20"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {Icon && (
              <Icon className={cn("h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-70")} />
            )}
            <span className="flex-1 text-start">{item.label}</span>
            <span
              className={cn(
                "rounded-lg px-2 py-0.5 text-xs font-black tabular-nums min-w-[1.75rem] text-center",
                active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}
            >
              {item.count}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function CaseRow({
  number,
  title,
  description,
  typeLabel,
  status,
  statusLabel,
  priorityLabel,
  priority,
  updatedAt,
  href,
  needsReview,
  systemLabel,
  readOnly,
  footer,
  governorate,
  assigneeLabel,
  affectedUsers,
}: {
  number: string;
  title: string;
  description?: string;
  typeLabel: string;
  status: SimpleCaseStatus;
  statusLabel: string;
  priorityLabel: string;
  priority?: string;
  updatedAt: string;
  href: string;
  needsReview?: boolean;
  systemLabel?: string;
  readOnly?: boolean;
  footer?: React.ReactNode;
  governorate?: string;
  assigneeLabel?: string;
  affectedUsers?: number;
}) {
  const s = STATUS_STYLES[status];
  const StatusIcon = STATUS_ICON[status];
  const priorityRing = PRIORITY_RING[priority ?? ""] ?? "ring-slate-400/20";

  return (
    <div
      className={cn(
        "group/row rounded-2xl transition-all duration-300",
        needsReview && "ring-2 ring-sky-400/50 shadow-lg shadow-sky-500/10",
        readOnly && "opacity-85"
      )}
    >
      <Link href={href} className="block">
        <div
          className={cn(
            "relative flex overflow-hidden rounded-2xl border-2 bg-card transition-all duration-300",
            "hover:shadow-card-hover hover:border-primary/25 hover:-translate-y-0.5",
            needsReview
              ? "border-sky-300/70 bg-gradient-to-l from-sky-50/80 via-card to-card dark:from-sky-950/30"
              : "border-border/60",
            priority && priority !== "LOW" && priorityRing,
            priority && priority !== "LOW" && "ring-1"
          )}
        >
          {/* Status column */}
          <div
            className={cn(
              "hidden sm:flex w-[4.5rem] shrink-0 flex-col items-center justify-center gap-1.5 border-e py-4",
              s.bg,
              s.border
            )}
          >
            <StatusIcon className={cn("h-5 w-5", s.text)} strokeWidth={2.5} />
            <span className={cn("text-[9px] font-black uppercase tracking-wide text-center px-1 leading-tight", s.text)}>
              {statusLabel.split(" ")[0]}
            </span>
          </div>

          {/* Mobile status strip */}
          <div className={cn("sm:hidden w-1.5 shrink-0", s.dot, needsReview && "w-2 animate-pulse-soft")} />

          <div className="flex flex-1 items-center gap-3 p-4 min-w-0">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px] font-bold text-muted-foreground">{number}</span>
                {systemLabel && (
                  <span className="rounded-md bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 text-[9px] font-black uppercase">
                    {systemLabel}
                  </span>
                )}
                {needsReview && (
                  <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[9px] font-black text-white animate-pulse-soft">
                    مراجعة
                  </span>
                )}
                {readOnly && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-black text-muted-foreground">
                    معاينة
                  </span>
                )}
                <span className="rounded-md bg-muted/80 px-2 py-0.5 text-[10px] font-bold">{typeLabel}</span>
                <span className="sm:hidden ms-auto">
                  <StatusBadge status={status} label={statusLabel} className="text-[10px] px-2 py-0.5" />
                </span>
              </div>

              <p className="text-base md:text-[1.05rem] font-black line-clamp-1 group-hover/row:text-primary transition-colors leading-snug">
                {title}
              </p>

              {description && (
                <p className="text-sm text-muted-foreground line-clamp-1 leading-relaxed hidden md:block">
                  {description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {governorate && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {governorate}
                  </span>
                )}
                {affectedUsers !== undefined && affectedUsers > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {affectedUsers}
                  </span>
                )}
                {assigneeLabel && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 text-primary px-2 py-0.5 text-[10px] font-black">
                    <User className="h-3 w-3" />
                    {assigneeLabel}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground ms-auto sm:ms-0">
                  <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[priority ?? ""] ?? "bg-slate-400")} />
                  {priorityLabel}
                  <span className="text-muted-foreground/50">·</span>
                  {updatedAt}
                </span>
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-end gap-2 shrink-0 ps-2">
              <StatusBadge status={status} label={statusLabel} className="text-xs px-2.5 py-0.5" />
              <ChevronLeft className="h-5 w-5 text-muted-foreground/40 group-hover/row:text-primary group-hover/row:translate-x-[-2px] transition-all" />
            </div>
          </div>
        </div>
      </Link>

      {footer && (
        <div className="rounded-b-2xl border-x-2 border-b-2 border-border/60 bg-muted/25 px-4 py-3 -mt-1">
          {footer}
        </div>
      )}
    </div>
  );
}

/* ─── Empty state ─── */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-brand-gradient-soft py-16 px-6 text-center">
      <div className="rounded-2xl bg-brand-gradient p-5 mb-5 shadow-glow">
        <Icon className="h-10 w-10 text-white" />
      </div>
      <p className="text-xl font-black">{title}</p>
      {description && <p className="text-muted-foreground mt-2 max-w-md font-medium">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ─── Section card ─── */
export function SectionCard({
  title,
  count,
  href,
  icon: Icon,
  children,
  emptyText,
}: {
  title: string;
  count: number;
  href?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  emptyText?: string;
}) {
  return (
    <div className="glass-card border overflow-hidden shadow-card">
      <div className="flex items-center justify-between border-b bg-gradient-to-l from-muted/30 to-transparent px-5 py-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/20">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          )}
          <h3 className="text-base font-black tracking-tight">{title}</h3>
          {count > 0 && (
            <span className="rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-2.5 py-0.5 text-xs font-black text-white shadow-sm min-w-[1.5rem] text-center">
              {count}
            </span>
          )}
        </div>
        {href && count > 0 && (
          <Link
            href={href}
            className="text-sm font-bold text-primary hover:text-primary/80 transition-colors"
          >
            عرض الكل ←
          </Link>
        )}
      </div>
      <div className="p-4 space-y-2">
        {count === 0 && emptyText ? (
          <p className="text-muted-foreground text-center py-6">{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/* ─── Quick row inside sections ─── */
export function QuickRow({
  href,
  primary,
  secondary,
  badge,
}: {
  href: string;
  primary: string;
  secondary?: string;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border bg-card/80 p-4 hover:bg-accent/40 hover:border-primary/25 hover:shadow-sm transition-all duration-200"
    >
      <div className="min-w-0">
        <p className="font-bold truncate">{primary}</p>
        {secondary && <p className="text-sm text-muted-foreground truncate mt-0.5">{secondary}</p>}
      </div>
      {badge}
    </Link>
  );
}

export { SIMPLE_CASE_STATUS_LABELS };
