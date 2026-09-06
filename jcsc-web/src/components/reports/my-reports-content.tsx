"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ClipboardList,
  Search,
  MapPin,
  Layers,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Filter,
  ChevronLeft,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHero, EmptyState, KpiTile } from "@/components/shared/ops-ui";
import { getSupervisorReports } from "@/lib/services/reports";
import { getCases } from "@/lib/services/cases";
import { useEffectiveUser, useAuthReady } from "@/hooks/use-effective-user";
import { isSupervisorRole, isSupportCoordinatorRole } from "@/lib/reports";
import { REPORT_STATUS_LABELS, type ReportStatus, type FieldReport } from "@/lib/reports";
import {
  CASE_STATUS_LABELS,
  simpleStatusLabel,
  toSimpleCaseStatus,
  type Case,
  type CaseStatus,
} from "@/lib/cases";
import { CENSUS_SYSTEM_LABELS, type CensusSystem } from "@/lib/types";
import { cn, formatDate, formatRelativeDate } from "@/lib/utils";

type ReportStatusFilter = "ALL" | "PENDING" | "CONVERTED_TO_TICKET" | "REJECTED" | "CLOSED";
type CaseStatusFilter = "ALL" | "OPEN" | "IN_PROGRESS" | "CLOSED";

const REPORT_STATUS_TONE: Partial<Record<ReportStatus, string>> = {
  NEW: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200/60",
  UNDER_REVIEW: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200/60",
  WAITING_CLASSIFICATION: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200/60",
  CONVERTED_TO_TICKET: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200/60",
  REJECTED: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-200/60",
  CLOSED: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-200/60",
};

const CASE_STATUS_TONE: Partial<Record<CaseStatus, string>> = {
  OPEN: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200/60",
  UNDER_REVIEW: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200/60",
  AWAITING_APPROVAL: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200/60",
  IN_PROGRESS: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200/60",
  WAITING_DEPLOYMENT: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200/60",
  READY_FOR_TESTING: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200/60",
  RESOLVED: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-200/60",
  CLOSED: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-200/60",
  MERGED: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-200/60",
};

const REPORT_FILTER_OPTIONS: { value: ReportStatusFilter; label: string }[] = [
  { value: "ALL", label: "الكل" },
  { value: "PENDING", label: "قيد المراجعة" },
  { value: "CONVERTED_TO_TICKET", label: "مقبولة" },
  { value: "REJECTED", label: "مرفوضة" },
  { value: "CLOSED", label: "مغلقة" },
];

const CASE_FILTER_OPTIONS: { value: CaseStatusFilter; label: string }[] = [
  { value: "ALL", label: "الكل" },
  { value: "OPEN", label: "بانتظار التصنيف" },
  { value: "IN_PROGRESS", label: "قيد المعالجة" },
  { value: "CLOSED", label: "مغلقة" },
];

function systemLabel(value?: string) {
  if (!value) return null;
  return CENSUS_SYSTEM_LABELS[value as CensusSystem] ?? value;
}

function matchesReportFilter(report: FieldReport, filter: ReportStatusFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "PENDING") {
    return ["NEW", "UNDER_REVIEW", "WAITING_CLASSIFICATION"].includes(report.status);
  }
  return report.status === filter;
}

function matchesCaseFilter(caseItem: Case, filter: CaseStatusFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "OPEN") return caseItem.status === "OPEN";
  if (filter === "IN_PROGRESS") {
    const simple = toSimpleCaseStatus(caseItem.status);
    return simple === "IN_PROGRESS" || simple === "SOLVED";
  }
  return toSimpleCaseStatus(caseItem.status) === "CLOSED";
}

function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span
      className={cn(
        "rounded-lg border px-2.5 py-1 text-xs font-black shrink-0",
        REPORT_STATUS_TONE[status] ?? "bg-muted text-muted-foreground border-border"
      )}
    >
      {REPORT_STATUS_LABELS[status]}
    </span>
  );
}

function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span
      className={cn(
        "rounded-lg border px-2.5 py-1 text-xs font-black shrink-0",
        CASE_STATUS_TONE[status] ?? "bg-muted text-muted-foreground border-border"
      )}
    >
      {CASE_STATUS_LABELS[status]}
    </span>
  );
}

function ReportCard({ report }: { report: FieldReport }) {
  const sys = systemLabel(report.affectedSystem);

  return (
    <Link
      href={`/reports/${report.id}`}
      className="group block rounded-2xl border-2 bg-card p-5 md:p-6 shadow-sm transition-all hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-black tabular-nums">
            {report.number}
          </span>
          {sys && (
            <span className="inline-flex items-center gap-1 rounded-lg border bg-muted/30 px-2.5 py-1 text-xs font-bold">
              <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
              {sys}
            </span>
          )}
        </div>
        <ReportStatusBadge status={report.status} />
      </div>
      <p className="mt-3 text-base font-black leading-relaxed line-clamp-3 group-hover:text-primary transition-colors">
        {report.observation}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-muted-foreground">
        {report.governorate && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary/70 shrink-0" />
            {report.governorate}
          </span>
        )}
        {(report.enumeratorsAffected ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary/70 shrink-0" />
            {report.enumeratorsAffected} متأثر
          </span>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-border/60">
        <span className="text-xs text-muted-foreground" title={formatDate(report.createdAt)}>
          <Clock className="inline h-3.5 w-3.5 me-1 -mt-0.5" />
          {formatRelativeDate(report.createdAt)}
        </span>
        <span className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
          عرض التفاصيل
          <ChevronLeft className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

function CaseCard({ caseItem }: { caseItem: Case }) {
  const sys = systemLabel(caseItem.affectedSystem);

  return (
    <Link
      href={`/cases/${caseItem.id}`}
      className="group block rounded-2xl border-2 bg-card p-5 md:p-6 shadow-sm transition-all hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-black tabular-nums">
            {caseItem.sourceReportNumber ?? caseItem.number}
          </span>
          {sys && (
            <span className="inline-flex items-center gap-1 rounded-lg border bg-muted/30 px-2.5 py-1 text-xs font-bold">
              <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
              {sys}
            </span>
          )}
        </div>
        <CaseStatusBadge status={caseItem.status} />
      </div>
      <p className="mt-3 text-base font-black leading-relaxed line-clamp-3 group-hover:text-primary transition-colors">
        {caseItem.title}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-muted-foreground">
        {caseItem.governorate && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary/70 shrink-0" />
            {caseItem.governorate}
          </span>
        )}
        {caseItem.affectedUsers > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary/70 shrink-0" />
            {caseItem.affectedUsers} متأثر
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Wrench className="h-3.5 w-3.5 text-primary/70 shrink-0" />
          {simpleStatusLabel(caseItem.status)}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-border/60">
        <span className="text-xs text-muted-foreground" title={formatDate(caseItem.createdAt)}>
          <Clock className="inline h-3.5 w-3.5 me-1 -mt-0.5" />
          {formatRelativeDate(caseItem.createdAt)}
        </span>
        <span className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
          السجل والتفاصيل
          <ChevronLeft className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
      <div className="h-12 rounded-xl skeleton-shimmer" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
    </div>
  );
}

export function MyReportsContent() {
  const user = useEffectiveUser();
  const { isLoading: authLoading } = useAuthReady();
  const userId = user?.id ?? "";
  const userName = user?.name?.split(" ")[0] ?? "";
  const isSupervisor = isSupervisorRole(user?.role);
  const isCoordinator = isSupportCoordinatorRole(user?.role);
  const useCasesView = isSupervisor || isCoordinator;

  const [search, setSearch] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState<ReportStatusFilter>("ALL");
  const [caseStatusFilter, setCaseStatusFilter] = useState<CaseStatusFilter>("ALL");

  const { data: cases, isLoading: casesLoading } = useQuery({
    queryKey: ["my-cases", userId, user?.role],
    queryFn: () => getCases({ mine: true }),
    enabled: !!userId && useCasesView && !authLoading,
  });

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["my-reports", userId],
    queryFn: () => getSupervisorReports(userId),
    enabled: !!userId && !useCasesView && !authLoading,
  });

  const isLoading = authLoading || (useCasesView ? casesLoading : reportsLoading);
  const allCases = cases ?? [];
  const allReports = reports ?? [];

  const caseStats = useMemo(() => {
    const open = allCases.filter((c) => c.status === "OPEN").length;
    const inProgress = allCases.filter((c) => {
      const s = toSimpleCaseStatus(c.status);
      return s === "IN_PROGRESS" || s === "SOLVED";
    }).length;
    const closed = allCases.filter((c) => toSimpleCaseStatus(c.status) === "CLOSED").length;
    return { total: allCases.length, open, inProgress, closed };
  }, [allCases]);

  const reportStats = useMemo(() => {
    const pending = allReports.filter((r) =>
      ["NEW", "UNDER_REVIEW", "WAITING_CLASSIFICATION"].includes(r.status)
    ).length;
    const accepted = allReports.filter((r) => r.status === "CONVERTED_TO_TICKET").length;
    const rejected = allReports.filter((r) => r.status === "REJECTED").length;
    return { total: allReports.length, pending, accepted, rejected };
  }, [allReports]);

  const filteredCases = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCases
      .filter((c) => matchesCaseFilter(c, caseStatusFilter))
      .filter((c) => {
        if (!q) return true;
        return (
          c.title.toLowerCase().includes(q) ||
          c.number.toLowerCase().includes(q) ||
          (c.sourceReportNumber?.toLowerCase().includes(q) ?? false) ||
          c.governorate.toLowerCase().includes(q) ||
          c.affectedSystem.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allCases, caseStatusFilter, search]);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allReports
      .filter((r) => matchesReportFilter(r, reportStatusFilter))
      .filter((r) => {
        if (!q) return true;
        return (
          r.observation.toLowerCase().includes(q) ||
          r.number.toLowerCase().includes(q) ||
          r.governorate.toLowerCase().includes(q) ||
          (systemLabel(r.affectedSystem)?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allReports, reportStatusFilter, search]);

  const caseFilterCounts = useMemo(
    () => ({
      ALL: allCases.length,
      OPEN: allCases.filter((c) => matchesCaseFilter(c, "OPEN")).length,
      IN_PROGRESS: allCases.filter((c) => matchesCaseFilter(c, "IN_PROGRESS")).length,
      CLOSED: allCases.filter((c) => matchesCaseFilter(c, "CLOSED")).length,
    }),
    [allCases]
  );

  const reportFilterCounts = useMemo(
    () => ({
      ALL: allReports.length,
      PENDING: allReports.filter((r) => matchesReportFilter(r, "PENDING")).length,
      CONVERTED_TO_TICKET: allReports.filter((r) => r.status === "CONVERTED_TO_TICKET").length,
      REJECTED: allReports.filter((r) => r.status === "REJECTED").length,
      CLOSED: allReports.filter((r) => r.status === "CLOSED").length,
    }),
    [allReports]
  );

  const itemCount = useCasesView ? allCases.length : allReports.length;
  const filteredCount = useCasesView ? filteredCases.length : filteredReports.length;

  return (
    <div dir="rtl" className="content-container max-w-4xl space-y-6 pb-10 text-start">
      <PageHero
        title={userName ? `بلاغاتي — ${userName}` : "بلاغاتي"}
        subtitle={
          isSupervisor
            ? "كل بلاغ ترسله يُتابَع هنا كحالة واحدة — اضغط لعرض السجل والمسار الكامل"
            : isCoordinator
              ? "بلاغاتك الشخصية — للتصنيف الوارد من دعم المراكز استخدم «تصنيف البلاغات»"
              : "تابع كل ما أرسلته — الحالة، المراجعة، والنتيجة"
        }
        variant="calm"
      />

      {isLoading ? (
        <ReportsSkeleton />
      ) : itemCount === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="لا توجد بلاغات بعد"
          description={
            isCoordinator
              ? "لم ترسل بلاغات شخصية بعد. البلاغات الواردة من دعم المراكز تظهر في «تصنيف البلاغات»."
              : "أرسل بلاغاً من «إنشاء بلاغ» في الشريط العلوي أو القائمة — سيظهر هنا مع حالته"
          }
        />
      ) : useCasesView ? (
        <>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <KpiTile
              label="إجمالي البلاغات"
              value={caseStats.total}
              href="/reports/my"
              icon={ClipboardList}
              accent="primary"
              active={caseStatusFilter === "ALL"}
              onClick={() => setCaseStatusFilter("ALL")}
            />
            <KpiTile
              label="بانتظار التصنيف"
              value={caseStats.open}
              href="/reports/my"
              icon={Clock}
              accent="sky"
              urgent={caseStats.open > 0}
              active={caseStatusFilter === "OPEN"}
              onClick={() => setCaseStatusFilter("OPEN")}
            />
            <KpiTile
              label="قيد المعالجة"
              value={caseStats.inProgress}
              href="/reports/my"
              icon={CheckCircle2}
              accent="emerald"
              active={caseStatusFilter === "IN_PROGRESS"}
              onClick={() => setCaseStatusFilter("IN_PROGRESS")}
            />
            <KpiTile
              label="مغلقة"
              value={caseStats.closed}
              href="/reports/my"
              icon={XCircle}
              accent="slate"
              active={caseStatusFilter === "CLOSED"}
              onClick={() => setCaseStatusFilter("CLOSED")}
            />
          </div>

          {renderFilters(
            search,
            setSearch,
            CASE_FILTER_OPTIONS,
            caseStatusFilter,
            setCaseStatusFilter,
            caseFilterCounts
          )}

          {filteredCases.length === 0 ? (
            renderEmptyFilters(() => {
              setSearch("");
              setCaseStatusFilter("ALL");
            })
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-bold text-muted-foreground px-1">
                {filteredCount} {filteredCount === 1 ? "بلاغ" : "بلاغات"}
              </p>
              {filteredCases.map((c) => (
                <CaseCard key={c.id} caseItem={c} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <KpiTile
              label="إجمالي البلاغات"
              value={reportStats.total}
              href="/reports/my"
              icon={ClipboardList}
              accent="primary"
              active={reportStatusFilter === "ALL"}
              onClick={() => setReportStatusFilter("ALL")}
            />
            <KpiTile
              label="قيد المراجعة"
              value={reportStats.pending}
              href="/reports/my"
              icon={Clock}
              accent="sky"
              urgent={reportStats.pending > 0}
              active={reportStatusFilter === "PENDING"}
              onClick={() => setReportStatusFilter("PENDING")}
            />
            <KpiTile
              label="مقبولة"
              value={reportStats.accepted}
              href="/reports/my"
              icon={CheckCircle2}
              accent="emerald"
              active={reportStatusFilter === "CONVERTED_TO_TICKET"}
              onClick={() => setReportStatusFilter("CONVERTED_TO_TICKET")}
            />
            <KpiTile
              label="مرفوضة"
              value={reportStats.rejected}
              href="/reports/my"
              icon={XCircle}
              accent="slate"
              active={reportStatusFilter === "REJECTED"}
              onClick={() => setReportStatusFilter("REJECTED")}
            />
          </div>

          {renderFilters(
            search,
            setSearch,
            REPORT_FILTER_OPTIONS,
            reportStatusFilter,
            setReportStatusFilter,
            reportFilterCounts
          )}

          {filteredReports.length === 0 ? (
            renderEmptyFilters(() => {
              setSearch("");
              setReportStatusFilter("ALL");
            })
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-bold text-muted-foreground px-1">
                {filteredCount} {filteredCount === 1 ? "بلاغ" : "بلاغات"}
              </p>
              {filteredReports.map((r) => (
                <ReportCard key={r.id} report={r} />
              ))}
            </div>
          )}
        </>
      )}

      <div className="rounded-xl border-2 border-dashed bg-muted/15 px-5 py-4 text-sm text-muted-foreground leading-relaxed">
        <p className="font-black text-foreground mb-1">ماذا يحدث بعد الإرسال؟</p>
        <p>
          يصل بلاغك لمنسق الدعم للتصنيف — إن كان System Bug يُرسل للسوبر أدمن، وإلا يُغلق بسبب
          تقني.{" "}
          {isSupervisor || isCoordinator
            ? "اضغط أي بلاغ لعرض السجل التفصيلي."
            : "يمكنك متابعة الحالة من هذه الشاشة."}
        </p>
      </div>
    </div>
  );
}

function renderFilters<T extends string>(
  search: string,
  setSearch: (v: string) => void,
  options: { value: T; label: string }[],
  statusFilter: T,
  setStatusFilter: (v: T) => void,
  filterCounts: Record<T, number>
) {
  return (
    <div className="rounded-2xl border-2 bg-card p-4 md:p-5 shadow-sm space-y-4">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث برقم البلاغ، الوصف، المحافظة..."
          className="h-11 ps-10 rounded-xl border-2 text-start"
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        {options.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={cn(
              "rounded-xl border-2 px-3.5 py-2 text-sm font-bold transition-all",
              statusFilter === value
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border bg-muted/20 text-muted-foreground hover:border-primary/30"
            )}
          >
            {label}
            <span className="ms-1.5 tabular-nums opacity-70">({filterCounts[value]})</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function renderEmptyFilters(onReset: () => void) {
  return (
    <EmptyState
      icon={Sparkles}
      title="لا نتائج"
      description="جرّب تغيير الفلتر أو كلمات البحث"
      action={
        <Button variant="outline" size="lg" className="font-bold" onClick={onReset}>
          إعادة ضبط الفلاتر
        </Button>
      }
    />
  );
}
