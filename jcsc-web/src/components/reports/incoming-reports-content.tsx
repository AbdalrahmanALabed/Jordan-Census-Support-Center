"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  ClipboardList,
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  Archive,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getReports } from "@/lib/services/reports";
import {
  REPORT_STATUS_LABELS,
  type FieldReport,
  type ReportStatus,
} from "@/lib/reports";
import { GOVERNORATES, CENSUS_SYSTEMS, CENSUS_SYSTEM_LABELS, type CensusSystem } from "@/lib/types";
import { useUserStore } from "@/stores/user-store";
import { formatRelativeDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ReportClassifyDialog,
  canReviewReport,
} from "@/components/reports/report-classify-dialog";
import {
  EmptyState,
  FilterSection,
  ReportRow,
} from "@/components/shared/ops-ui";

const STATUS_VARIANT: Record<
  ReportStatus,
  "info" | "warning" | "success" | "critical" | "secondary"
> = {
  NEW: "critical",
  UNDER_REVIEW: "warning",
  WAITING_CLASSIFICATION: "info",
  CONVERTED_TO_TICKET: "success",
  REJECTED: "secondary",
  CLOSED: "secondary",
};

const STATUS_FILTERS: {
  key: ReportStatus | "ALL";
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  accent: string;
}[] = [
  { key: "ALL", label: "كل البلاغات", shortLabel: "الكل", icon: ClipboardList, accent: "from-slate-500/15 to-zinc-500/5 border-slate-200/60" },
  { key: "NEW", label: REPORT_STATUS_LABELS.NEW, shortLabel: "جديد", icon: Inbox, accent: "from-red-500/15 to-orange-500/5 border-red-200/60" },
  { key: "UNDER_REVIEW", label: REPORT_STATUS_LABELS.UNDER_REVIEW, shortLabel: "مراجعة", icon: Clock, accent: "from-amber-500/15 to-yellow-500/5 border-amber-200/60" },
  { key: "WAITING_CLASSIFICATION", label: REPORT_STATUS_LABELS.WAITING_CLASSIFICATION, shortLabel: "بانتظار", icon: ClipboardList, accent: "from-sky-500/15 to-blue-500/5 border-sky-200/60" },
  { key: "CONVERTED_TO_TICKET", label: REPORT_STATUS_LABELS.CONVERTED_TO_TICKET, shortLabel: "مُحوّل", icon: CheckCircle2, accent: "from-emerald-500/15 to-green-500/5 border-emerald-200/60" },
  { key: "REJECTED", label: REPORT_STATUS_LABELS.REJECTED, shortLabel: "مرفوض", icon: XCircle, accent: "from-slate-500/15 to-gray-500/5 border-slate-200/60" },
  { key: "CLOSED", label: REPORT_STATUS_LABELS.CLOSED, shortLabel: "مغلق", icon: Archive, accent: "from-slate-500/15 to-zinc-500/5 border-slate-200/60" },
];

function decisionMeta(report: FieldReport) {
  if (report.managerDecision === "CONFIRMED_PROBLEM") {
    return { label: "مشكلة", variant: "success" as const };
  }
  if (report.managerDecision === "NOT_A_PROBLEM") {
    return { label: "ليست مشكلة", variant: "secondary" as const };
  }
  return undefined;
}

export function IncomingReportsContent() {
  const router = useRouter();
  const { currentUser, hasPermission } = useUserStore();
  const userId = currentUser?.id ?? "";
  const canReviewAll = hasPermission("review_reports");
  const [status, setStatus] = useState<ReportStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [governorate, setGovernorate] = useState("ALL");
  const [systemFilter, setSystemFilter] = useState<CensusSystem | "ALL">("ALL");
  const [reviewReport, setReviewReport] = useState<FieldReport | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const openReview = (report: FieldReport) => {
    if (canReviewAll && canReviewReport(report)) {
      setReviewReport(report);
    } else {
      router.push(`/reports/${report.id}`);
    }
  };

  const { data: allReportsForCounts } = useQuery({
    queryKey: ["reports", "counts", search, governorate, systemFilter, userId, canReviewAll],
    queryFn: async () => {
      if (!canReviewAll) return [];
      let list = await getReports({ status: "ALL", search, governorate });
      if (systemFilter !== "ALL") {
        list = list.filter((r) => r.affectedSystem === systemFilter);
      }
      return list;
    },
    enabled: canReviewAll,
  });

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports", "list", status, search, governorate, systemFilter, userId, canReviewAll],
    queryFn: async () => {
      if (!canReviewAll) return [];
      let list = await getReports({ status, search, governorate });
      if (systemFilter !== "ALL") {
        list = list.filter((r) => r.affectedSystem === systemFilter);
      }
      return list;
    },
    enabled: canReviewAll,
  });

  const statusCounts = useMemo(() => {
    const all = allReportsForCounts ?? [];
    const counts: Record<ReportStatus | "ALL", number> = {
      ALL: all.length,
      NEW: 0,
      UNDER_REVIEW: 0,
      WAITING_CLASSIFICATION: 0,
      CONVERTED_TO_TICKET: 0,
      REJECTED: 0,
      CLOSED: 0,
    };
    for (const r of all) counts[r.status]++;
    return counts;
  }, [allReportsForCounts]);

  const pendingReviewCount = useMemo(
    () => (allReportsForCounts ?? []).filter((r) => canReviewReport(r)).length,
    [allReportsForCounts]
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    status !== "ALL" ||
    governorate !== "ALL" ||
    systemFilter !== "ALL";

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setGovernorate("ALL");
    setSystemFilter("ALL");
  };

  const filtersPanel = (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث في الملاحظات..."
          className="h-10 rounded-xl bg-muted/40 ps-9 border-0 ring-1 ring-border/60"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <FilterSection label="الحالة" icon={ClipboardList}>
        <Select value={status} onValueChange={(v) => setStatus(v as ReportStatus | "ALL")}>
          <SelectTrigger className="h-10 w-full rounded-xl bg-muted/40 border-0 ring-1 ring-border/60">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="ALL">كل الحالات</SelectItem>
            {Object.entries(REPORT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSection>

      <FilterSection label="النظام">
        <Select value={systemFilter} onValueChange={(v) => setSystemFilter(v as CensusSystem | "ALL")}>
          <SelectTrigger className="h-10 w-full rounded-xl bg-muted/40 border-0 ring-1 ring-border/60">
            <SelectValue placeholder="النظام" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="ALL">كل الأنظمة</SelectItem>
            {CENSUS_SYSTEMS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSection>

      <FilterSection label="المحافظة">
        <Select value={governorate} onValueChange={setGovernorate}>
          <SelectTrigger className="h-10 w-full rounded-xl bg-muted/40 border-0 ring-1 ring-border/60">
            <SelectValue placeholder="المحافظة" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="ALL">كل المحافظات</SelectItem>
            {GOVERNORATES.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSection>

      {hasActiveFilters && (
        <Button variant="outline" size="sm" className="w-full font-bold gap-2" onClick={clearFilters}>
          <X className="h-3.5 w-3.5" />
          مسح الفلاتر
        </Button>
      )}
    </div>
  );

  return (
    <div className="content-container pb-10 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border-2 bg-gradient-to-l from-orange-500/10 via-card to-amber-500/5 p-6 md:p-8">
        <div className="absolute -top-12 -start-12 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="relative space-y-2">
          <p className="text-xs font-bold text-primary uppercase tracking-widest">مركز الدعم</p>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">تصنيف البلاغات</h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl font-medium leading-relaxed">
            راجع بلاغات دعم المراكز — صنّف كعطل تقني مع الإسناد، أو أغلقها إذا لم تكن مشكلة في النظام
          </p>
          {pendingReviewCount > 0 && (
            <p className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 text-sky-800 dark:text-sky-200 border border-sky-300/50 px-3 py-1 text-xs font-bold">
              {pendingReviewCount} {pendingReviewCount === 1 ? "بلاغ" : "بلاغات"} بانتظار مراجعتك
            </p>
          )}
        </div>
      </div>

      {/* Status KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-2.5 md:gap-3">
        {STATUS_FILTERS.map(({ key, label, shortLabel, icon: Icon, accent }) => {
          const active = status === key;
          const count = statusCounts[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-2xl border-2 bg-gradient-to-br p-3 md:p-4 text-start transition-all min-h-[5.5rem]",
                accent,
                active ? "ring-2 ring-primary/40 shadow-md scale-[1.02]" : "hover:shadow-sm hover:-translate-y-0.5"
              )}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <Icon className="h-4 w-4 shrink-0 opacity-80" />
                <span className="text-xl md:text-2xl font-black tabular-nums leading-none">{count}</span>
              </div>
              <span className="text-[11px] md:text-xs font-bold leading-snug line-clamp-2">
                <span className="md:hidden">{shortLabel}</span>
                <span className="hidden md:inline">{label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile filters */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          className="w-full h-11 font-bold gap-2 rounded-xl border-2"
          onClick={() => setMobileFiltersOpen((o) => !o)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          الفلاتر
          {hasActiveFilters && (
            <span className="rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-black">
              !
            </span>
          )}
        </Button>
        {mobileFiltersOpen && (
          <div className="mt-3 rounded-2xl border-2 bg-card p-4 shadow-sm">{filtersPanel}</div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr] items-start">
        <aside className="hidden lg:block sticky top-20 rounded-2xl border-2 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border/60">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <span className="text-sm font-black">الفلاتر</span>
          </div>
          {filtersPanel}
        </aside>

        <main className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/30 border border-border/50 px-4 py-3">
            <span className="text-sm font-black tabular-nums">{reports?.length ?? 0} نتيجة</span>
            {hasActiveFilters && (
              <Button size="sm" variant="outline" className="font-bold gap-1.5 h-8" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" />
                مسح الفلاتر
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-36 rounded-2xl border-2 bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : !reports?.length ? (
            <EmptyState
              icon={ClipboardList}
              title="لا توجد بلاغات"
              description={hasActiveFilters ? "جرّب تغيير الفلاتر أو مسحها" : "لم تصل بلاغات بعد"}
              action={
                hasActiveFilters ? (
                  <Button size="lg" variant="outline" className="font-bold" onClick={clearFilters}>
                    مسح الفلاتر
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {reports.map((r) => {
                const decision = decisionMeta(r);
                const systemLabel = r.affectedSystem
                  ? CENSUS_SYSTEM_LABELS[r.affectedSystem as CensusSystem] ?? r.affectedSystem
                  : undefined;
                const reviewable = canReviewAll && canReviewReport(r);

                return (
                  <ReportRow
                    key={r.id}
                    number={r.number}
                    observation={r.observation}
                    supervisorName={r.supervisorName}
                    systemLabel={systemLabel}
                    governorate={r.governorate}
                    statusLabel={REPORT_STATUS_LABELS[r.status]}
                    statusVariant={STATUS_VARIANT[r.status]}
                    decisionLabel={decision?.label}
                    decisionVariant={decision?.variant}
                    attachmentsCount={r.attachments.length}
                    similarCount={r.similarReportIds?.length ?? 0}
                    updatedAt={formatRelativeDate(r.createdAt)}
                    href={`/reports/${r.id}`}
                    canReview={reviewable}
                    onReview={() => openReview(r)}
                  />
                );
              })}
            </div>
          )}
        </main>
      </div>

      {reviewReport && (
        <ReportClassifyDialog
          report={reviewReport}
          open={Boolean(reviewReport)}
          onOpenChange={(open) => {
            if (!open) setReviewReport(null);
          }}
          startAtReview
        />
      )}
    </div>
  );
}
