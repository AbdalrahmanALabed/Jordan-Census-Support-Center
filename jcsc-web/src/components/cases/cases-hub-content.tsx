"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  FolderKanban,
  PlusCircle,
  Inbox,
  CircleDot,
  Wrench,
  CheckCircle2,
  Archive,
  Rocket,
  Layers,
  Users,
  X,
  Eye,
  SlidersHorizontal,
  ArrowLeft,
  ClipboardCheck,
  ArrowUpRight,
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
import {
  FilterPills,
  CaseRow,
  EmptyState,
  AlertBanner,
  KpiTile,
  StatusFilterNav,
  FilterSection,
} from "@/components/shared/ops-ui";
import { getCases } from "@/lib/services/cases";
import { getDeveloperDashboard } from "@/lib/services/attention-dashboard";
import {
  CASE_TYPE_LABELS,
  CASE_STATUS_LABELS,
  SIMPLE_CASE_STATUS_LABELS,
  OPERATIONAL_CASE_TYPES,
  caseNeedsCoordinatorReview,
  caseNeedsSuperAdminReview,
  simpleStatusLabel,
  toSimpleCaseStatus,
  caseStatusesForSimple,
  type CaseType,
  type SimpleCaseStatus,
  type Case,
} from "@/lib/cases";
import { PRIORITY_LABELS } from "@/lib/types";
import { cn, formatRelativeDate } from "@/lib/utils";
import { getSpecialtyLabelFromTeam, getSpecialtyLabel } from "@/lib/developer-specialties";
import {
  SYSTEM_PREFIX_FILTER_OPTIONS,
  SPECIALTY_FILTER_OPTIONS,
  computeCaseStatusKpis,
  getSystemBadgeLabel,
  matchesSpecialtyFilter,
  matchesSystemPrefixFilter,
  type SpecialtyFilter,
  type SystemPrefixFilter,
} from "@/lib/case-filters";
import { useEffectiveUser, useAuthReady } from "@/hooks/use-effective-user";
import { useUserStore } from "@/stores/user-store";
import { isSupervisorRole } from "@/lib/reports";
import { canManageCases, isDeveloperRole, isSupportCoordinatorRole, isSupportSupervisorRole } from "@/lib/permissions";

const COORDINATOR_STATUS_FILTERS = [
  { value: "OPEN", label: "بانتظار التصنيف", icon: Inbox },
  { value: "AWAITING_APPROVAL", label: "مُصعّدة", icon: ArrowUpRight },
  { value: "CLOSED", label: "مغلقة", icon: Archive },
] as const;

function isAssignedToUser(c: Case, userId?: string, userName?: string): boolean {
  return (
    c.assignedDeveloperId === userId ||
    (!!userName && c.assignedDeveloperName === userName)
  );
}

function matchesCaseListFilters(
  c: Case,
  opts: {
    search: string;
    caseType: CaseType | "ALL";
    simpleStatus: SimpleCaseStatus | "ALL";
    rawStatus: string | "ALL";
    systemPrefix: SystemPrefixFilter;
    specialtyFilter: SpecialtyFilter;
  }
): boolean {
  const q = opts.search.trim().toLowerCase();
  if (
    q &&
    !c.number.toLowerCase().includes(q) &&
    !c.title.toLowerCase().includes(q) &&
    !(c.description?.toLowerCase().includes(q) ?? false)
  ) {
    return false;
  }
  if (opts.caseType !== "ALL" && c.caseType !== opts.caseType) return false;
  if (opts.rawStatus !== "ALL") {
    if (c.status !== opts.rawStatus) return false;
  } else if (opts.simpleStatus !== "ALL") {
    if (!caseStatusesForSimple(opts.simpleStatus).includes(c.status)) return false;
  }
  if (!matchesSystemPrefixFilter(c, opts.systemPrefix)) return false;
  if (!matchesSpecialtyFilter(c, opts.specialtyFilter)) return false;
  return true;
}

function sortCases(cases: Case[], prioritizeReview: boolean, forCoordinator = false): Case[] {
  return [...cases].sort((a, b) => {
    if (prioritizeReview) {
      const needs = forCoordinator ? caseNeedsCoordinatorReview : caseNeedsSuperAdminReview;
      const aR = needs(a.status) ? 1 : 0;
      const bR = needs(b.status) ? 1 : 0;
      if (aR !== bR) return bR - aR;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function CasesListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex overflow-hidden rounded-2xl border-2 bg-card">
          <div className="hidden sm:block w-[4.5rem] bg-muted shrink-0" />
          <div className="w-1.5 sm:hidden bg-muted shrink-0" />
          <div className="flex-1 p-4 space-y-3">
            <div className="h-3 w-28 bg-muted rounded" />
            <div className="h-5 w-2/3 bg-muted rounded" />
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-muted rounded-lg" />
              <div className="h-5 w-20 bg-muted rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActiveFilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
    >
      {label}
      <X className="h-3 w-3 opacity-70" />
    </button>
  );
}

function SectionBlock({
  title,
  count,
  muted,
  icon: Icon,
  children,
}: {
  title: string;
  count: number;
  muted?: boolean;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl px-1",
          muted && "opacity-80"
        )}
      >
        {Icon && (
          <div className={cn("rounded-lg p-2", muted ? "bg-muted" : "bg-primary/10")}>
            <Icon className={cn("h-4 w-4", muted ? "text-muted-foreground" : "text-primary")} />
          </div>
        )}
        <h2 className={cn("text-base font-black flex-1", muted && "text-muted-foreground")}>
          {title}
        </h2>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-black tabular-nums",
            muted ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
          )}
        >
          {count}
        </span>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

export function CasesHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useEffectiveUser();
  const { isLoading: authLoading } = useAuthReady();
  const { hasPermission } = useUserStore();
  const isSupervisor = isSupervisorRole(user?.role);
  const isCoordinator = isSupportCoordinatorRole(user?.role);
  const isSupportSupervisor = isSupportSupervisorRole(user?.role);
  const canReviewCases =
    !isCoordinator &&
    (canManageCases(user) ||
      hasPermission("classify_reports") ||
      hasPermission("manage_issues"));
  const isDev = isDeveloperRole(user?.role ?? "");
  const isAdminListView =
    canReviewCases && !isDev && !isCoordinator && !isSupervisor;

  const urlSimpleStatus = searchParams.get("simpleStatus");
  const urlStatus = searchParams.get("status");

  const simpleStatus = useMemo((): SimpleCaseStatus | "ALL" => {
    if (urlStatus) return "ALL";
    if (urlSimpleStatus && urlSimpleStatus in SIMPLE_CASE_STATUS_LABELS) {
      return urlSimpleStatus as SimpleCaseStatus;
    }
    return "ALL";
  }, [urlSimpleStatus, urlStatus]);

  const rawStatus = useMemo((): string | "ALL" => {
    if (urlStatus) return urlStatus;
    if (isCoordinator && !urlSimpleStatus) return "OPEN";
    return "ALL";
  }, [urlStatus, urlSimpleStatus, isCoordinator]);

  const [search, setSearch] = useState("");
  const [caseType, setCaseType] = useState<CaseType | "ALL">("ALL");
  const [systemPrefix, setSystemPrefix] = useState<SystemPrefixFilter>("ALL");
  const [specialtyFilter, setSpecialtyFilter] = useState<SpecialtyFilter>("ALL");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setSearch("");
    setCaseType("ALL");
    setSystemPrefix("ALL");
    setSpecialtyFilter("ALL");
  }, [urlSimpleStatus, urlStatus]);

  const { data: rawCases, isLoading } = useQuery({
    queryKey: isAdminListView
      ? ["cases", "admin-all", user?.id, user?.role]
      : ["cases", search, caseType, simpleStatus, rawStatus, isSupervisor, user?.id, user?.role],
    queryFn: () =>
      isAdminListView
        ? getCases({})
        : getCases({
            search,
            caseType: isDev ? "BUG" : caseType,
            simpleStatus: rawStatus !== "ALL" ? undefined : simpleStatus,
            status:
              rawStatus !== "ALL"
                ? (rawStatus as import("@/lib/cases/types").CaseStatus)
                : undefined,
            mine: isSupervisor ? true : undefined,
          }),
    enabled: !!user?.role && !authLoading,
  });

  const { data: devDashboard } = useQuery({
    queryKey: ["developer-dashboard", user?.id],
    queryFn: () => getDeveloperDashboard(user?.id ?? "", user?.name),
    enabled: isDev && Boolean(user?.id),
    refetchInterval: 60_000,
  });

  const roleFiltered = useMemo(() => {
    if (!rawCases) return [];
    if (isSupervisor) return rawCases;
    if (isDev) {
      return rawCases.filter(
        (c) => c.caseType === "BUG" && Boolean(c.assignedDeveloperId)
      );
    }
    return rawCases;
  }, [rawCases, isSupervisor, isDev]);

  const kpis = useMemo(() => computeCaseStatusKpis(roleFiltered), [roleFiltered]);

  const filterOpts = useMemo(
    () => ({ search, caseType, simpleStatus, rawStatus, systemPrefix, specialtyFilter }),
    [search, caseType, simpleStatus, rawStatus, systemPrefix, specialtyFilter]
  );

  const filteredCases = useMemo(() => {
    if (isAdminListView) {
      return roleFiltered.filter((c) => matchesCaseListFilters(c, filterOpts));
    }
    return roleFiltered.filter(
      (c) =>
        matchesSystemPrefixFilter(c, systemPrefix) &&
        matchesSpecialtyFilter(c, specialtyFilter)
    );
  }, [roleFiltered, isAdminListView, filterOpts, systemPrefix, specialtyFilter]);

  const sortedCases = useMemo(
    () => sortCases(filteredCases, (canReviewCases || isCoordinator) && !isDev, isCoordinator),
    [filteredCases, canReviewCases, isCoordinator, isDev]
  );

  const devMineCases = useMemo(() => {
    if (!isDev || !user?.id) return [];
    return sortCases(
      filteredCases.filter((c) => isAssignedToUser(c, user.id, user.name)),
      false
    );
  }, [filteredCases, isDev, user]);

  const devOtherCases = useMemo(() => {
    if (!isDev || !user?.id) return [];
    return sortCases(
      filteredCases.filter((c) => !isAssignedToUser(c, user.id, user.name)),
      false
    );
  }, [filteredCases, isDev, user]);

  const coordinatorPendingCases = useMemo(() => {
    if (!isCoordinator) return [];
    return sortedCases.filter((c) => caseNeedsCoordinatorReview(c.status));
  }, [sortedCases, isCoordinator]);

  const coordinatorOtherCases = useMemo(() => {
    if (!isCoordinator) return [];
    return sortedCases.filter((c) => !caseNeedsCoordinatorReview(c.status));
  }, [sortedCases, isCoordinator]);

  const coordinatorStats = useMemo(() => {
    if (!isCoordinator) return null;
    const today = new Date().toDateString();
    return {
      pending: coordinatorPendingCases.length,
      escalatedToday: roleFiltered.filter(
        (c) => c.status === "AWAITING_APPROVAL" && new Date(c.updatedAt).toDateString() === today
      ).length,
      closedToday: roleFiltered.filter(
        (c) =>
          toSimpleCaseStatus(c.status) === "CLOSED" &&
          new Date(c.updatedAt).toDateString() === today
      ).length,
    };
  }, [isCoordinator, coordinatorPendingCases.length, roleFiltered]);

  const hasActiveFilters =
    search.trim() !== "" ||
    (!isCoordinator && caseType !== "ALL") ||
    (!isCoordinator && simpleStatus !== "ALL") ||
    (isCoordinator ? rawStatus !== "OPEN" : rawStatus !== "ALL") ||
    systemPrefix !== "ALL" ||
    (!isCoordinator && specialtyFilter !== "ALL");

  const coordinatorStatusValue =
    rawStatus !== "ALL"
      ? rawStatus
      : simpleStatus !== "ALL"
        ? simpleStatus
        : "ALL";

  const resultCount = isDev && !isSupervisor
    ? devMineCases.length + devOtherCases.length
    : isCoordinator && coordinatorStatusValue === "ALL" && !hasActiveFilters
      ? coordinatorPendingCases.length + coordinatorOtherCases.length
      : sortedCases.length;

  const statusNavOptions = (
    Object.entries(SIMPLE_CASE_STATUS_LABELS) as [SimpleCaseStatus, string][]
  ).map(([value, label]) => ({
    value,
    label,
    count: kpis[value],
    icon:
      value === "NEW"
        ? CircleDot
        : value === "IN_PROGRESS"
          ? Wrench
          : value === "SOLVED"
            ? CheckCircle2
            : Archive,
  }));

  const pendingReviewCount = isCoordinator
    ? coordinatorStats?.pending ?? coordinatorPendingCases.length
    : canReviewCases && !isDev
      ? roleFiltered.filter((c) => caseNeedsSuperAdminReview(c.status)).length
      : 0;

  const clearFilters = () => {
    setSearch("");
    setCaseType("ALL");
    setSystemPrefix("ALL");
    setSpecialtyFilter("ALL");
    router.replace("/cases");
  };

  const setAdminSimpleStatus = (value: SimpleCaseStatus | "ALL") => {
    if (value === "ALL") router.replace("/cases");
    else router.replace(`/cases?simpleStatus=${value}`);
  };

  const showPendingReviewCases = () => {
    router.replace("/cases?status=AWAITING_APPROVAL");
  };

  const setCoordinatorStatusFilter = (value: string) => {
    if (value === "ALL") router.replace("/cases");
    else router.replace(`/cases?status=${value}`);
  };

  const coordinatorStatusCounts = useMemo(() => {
    const base = roleFiltered.filter(
      (c) =>
        matchesSystemPrefixFilter(c, systemPrefix) &&
        (isCoordinator || matchesSpecialtyFilter(c, specialtyFilter))
    );
    return {
      OPEN: base.filter((c) => c.status === "OPEN").length,
      AWAITING_APPROVAL: base.filter((c) => c.status === "AWAITING_APPROVAL").length,
      CLOSED: base.filter((c) => toSimpleCaseStatus(c.status) === "CLOSED").length,
      ALL: base.length,
    };
  }, [roleFiltered, systemPrefix, specialtyFilter, isCoordinator]);

  const getAssigneeLabel = (c: Case) => {
    if (c.assignedDeveloperName) return c.assignedDeveloperName;
    const team = getSpecialtyLabelFromTeam(c.assignedTeam ?? c.assignedDeveloperTeam);
    return team !== "—" ? team : undefined;
  };

  const renderCaseRow = (c: Case, readOnly = false) => {
    const coordinatorPending =
      isCoordinator && !readOnly && caseNeedsCoordinatorReview(c.status);
    const adminReview =
      canReviewCases && !readOnly && caseNeedsSuperAdminReview(c.status);
    const needsReview = coordinatorPending || adminReview;
    const rowReadOnly = readOnly || (isCoordinator && !coordinatorPending);

    return (
      <CaseRow
        key={c.id}
        number={c.number}
        title={c.title}
        description={c.description}
        typeLabel={CASE_TYPE_LABELS[c.caseType]}
        status={toSimpleCaseStatus(c.status)}
        statusLabel={simpleStatusLabel(c.status)}
        priority={c.priority}
        priorityLabel={PRIORITY_LABELS[c.priority]}
        updatedAt={formatRelativeDate(c.updatedAt)}
        href={`/cases/${c.id}`}
        needsReview={needsReview}
        readOnly={rowReadOnly}
        systemLabel={getSystemBadgeLabel(c.number) ?? undefined}
        governorate={c.governorate || undefined}
        affectedUsers={c.affectedUsers}
        assigneeLabel={getAssigneeLabel(c)}
        footer={
          coordinatorPending ? (
            <Button asChild size="sm" className="font-bold gap-1.5">
              <Link href={`/cases/${c.id}`}>
                <ClipboardCheck className="h-4 w-4" />
                تصنيف البلاغ
              </Link>
            </Button>
          ) : undefined
        }
      />
    );
  };

  const devAttention =
    (devDashboard?.stats.assigned ?? 0) + (devDashboard?.stats.deployment ?? 0);

  const pageTitle = isCoordinator
    ? "تصنيف البلاغات"
    : isSupportSupervisor
      ? "حالات الفريق"
    : isSupervisor
      ? "حالاتي"
      : isDev
        ? "أعطالي"
        : "الحالات";

  const coordinatorFiltersPanel = (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث برقم أو عنوان..."
          className="h-10 rounded-xl bg-muted/40 ps-9 border-0 ring-1 ring-border/60"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <FilterSection label="حالة التصنيف" icon={ClipboardCheck}>
        <StatusFilterNav
          options={COORDINATOR_STATUS_FILTERS.map(({ value, label, icon }) => ({
            value,
            label,
            icon,
            count: coordinatorStatusCounts[value as keyof typeof coordinatorStatusCounts],
          }))}
          value={coordinatorStatusValue}
          onChange={(v) => setCoordinatorStatusFilter(v === "ALL" ? "ALL" : v)}
          totalCount={coordinatorStatusCounts.ALL}
        />
      </FilterSection>

      <FilterSection label="النظام" icon={Layers}>
        <FilterPills
          variant="chips"
          options={SYSTEM_PREFIX_FILTER_OPTIONS.filter((o) => o.value !== "ALL").map((o) => ({
            value: o.value,
            label: o.label.split(" · ")[0],
          }))}
          value={systemPrefix}
          onChange={(v) => setSystemPrefix(v as SystemPrefixFilter)}
          allLabel="الكل"
        />
      </FilterSection>

      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          className="w-full font-bold gap-2"
          onClick={clearFilters}
        >
          <X className="h-3.5 w-3.5" />
          مسح الفلاتر
        </Button>
      )}
    </div>
  );

  const filtersPanel = (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث..."
          className="h-10 rounded-xl bg-muted/40 ps-9 border-0 ring-1 ring-border/60"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!isDev && !isCoordinator && (
        <FilterSection label="الحالة" icon={CircleDot}>
          <StatusFilterNav
            options={statusNavOptions}
            value={simpleStatus}
            onChange={setAdminSimpleStatus}
            totalCount={roleFiltered.length}
          />
        </FilterSection>
      )}

      {isDev && (
        <FilterSection label="الحالة" icon={CircleDot}>
          <FilterPills
            variant="segmented"
            options={statusNavOptions.map(({ value, label, icon }) => ({
              value,
              label,
              icon,
            }))}
            value={simpleStatus}
            onChange={setAdminSimpleStatus}
            allLabel="الكل"
          />
        </FilterSection>
      )}

      {!isDev && !isCoordinator && (
        <FilterSection label="نوع الحالة">
          <Select value={caseType} onValueChange={(v) => setCaseType(v as CaseType | "ALL")}>
            <SelectTrigger className="h-10 w-full rounded-xl bg-muted/40 border-0 ring-1 ring-border/60">
              <SelectValue placeholder="نوع الحالة" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="ALL">كل الأنواع</SelectItem>
              {OPERATIONAL_CASE_TYPES.map(({ type, label }) => (
                <SelectItem key={type} value={type}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterSection>
      )}

      <FilterSection label="النظام" icon={Layers}>
        <FilterPills
          variant="chips"
          options={SYSTEM_PREFIX_FILTER_OPTIONS.filter((o) => o.value !== "ALL").map((o) => ({
            value: o.value,
            label: o.label.split(" · ")[0],
          }))}
          value={systemPrefix}
          onChange={(v) => setSystemPrefix(v as SystemPrefixFilter)}
          allLabel="الكل"
        />
      </FilterSection>

      {!isSupervisor && !isDev && !isCoordinator && (
        <FilterSection label="التخصص" icon={Users}>
          <FilterPills
            variant="chips"
            options={SPECIALTY_FILTER_OPTIONS.filter((o) => o.value !== "ALL").map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            value={specialtyFilter}
            onChange={(v) => setSpecialtyFilter(v as SpecialtyFilter)}
            allLabel="الكل"
          />
        </FilterSection>
      )}

      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          className="w-full font-bold gap-2"
          onClick={clearFilters}
        >
          <X className="h-3.5 w-3.5" />
          مسح كل الفلاتر
        </Button>
      )}
    </div>
  );

  const resultsContent = authLoading || isLoading ? (
    <CasesListSkeleton />
  ) : isDev && !isSupervisor ? (
    devMineCases.length + devOtherCases.length === 0 ? (
      <EmptyState
        icon={FolderKanban}
        title="لا توجد حالات"
        description="لم يتم العثور على حالات مسندة بهذه الفلاتر"
      />
    ) : (
      <div className="space-y-8">
        {devMineCases.length > 0 && (
          <SectionBlock title="حالاتي" count={devMineCases.length} icon={Wrench}>
            {devMineCases.map((c) => renderCaseRow(c))}
          </SectionBlock>
        )}
        {devOtherCases.length > 0 && (
          <SectionBlock
            title="حالات الآخرين"
            count={devOtherCases.length}
            icon={Eye}
            muted
          >
            {devOtherCases.map((c) => renderCaseRow(c, true))}
          </SectionBlock>
        )}
      </div>
    )
  ) : isCoordinator ? (
    sortedCases.length === 0 ? (
      <EmptyState
        icon={ClipboardCheck}
        title={
          rawStatus === "OPEN"
            ? "لا بلاغات بانتظار التصنيف"
            : "لا توجد حالات"
        }
        description={
          hasActiveFilters
            ? "جرّب تغيير الفلاتر أو مسحها"
            : rawStatus === "OPEN"
              ? "ستظهر هنا البلاغات الجديدة من دعم المراكز للتصنيف"
              : "لم يتم العثور على حالات بهذه الفلاتر"
        }
        action={
          hasActiveFilters ? (
            <Button size="lg" variant="outline" className="font-bold" onClick={clearFilters}>
              مسح الفلاتر
            </Button>
          ) : rawStatus !== "OPEN" ? (
            <Button
              size="lg"
              className="font-black"
              onClick={() => setCoordinatorStatusFilter("OPEN")}
            >
              عرض بانتظار التصنيف
            </Button>
          ) : undefined
        }
      />
    ) : coordinatorStatusValue === "ALL" && !search.trim() && systemPrefix === "ALL" ? (
      <div className="space-y-8">
        {coordinatorPendingCases.length > 0 && (
          <SectionBlock
            title="بانتظار تصنيفك"
            count={coordinatorPendingCases.length}
            icon={ClipboardCheck}
          >
            {coordinatorPendingCases.map((c) => renderCaseRow(c))}
          </SectionBlock>
        )}
        {coordinatorOtherCases.length > 0 && (
          <SectionBlock
            title="حالات أخرى — معاينة فقط"
            count={coordinatorOtherCases.length}
            icon={Eye}
            muted
          >
            {coordinatorOtherCases.map((c) => renderCaseRow(c, true))}
          </SectionBlock>
        )}
      </div>
    ) : (
      <div className="space-y-2.5">{sortedCases.map((c) => renderCaseRow(c, !caseNeedsCoordinatorReview(c.status)))}</div>
    )
  ) : sortedCases.length === 0 ? (
    <EmptyState
      icon={FolderKanban}
      title="لا توجد حالات"
      description={
        hasActiveFilters && roleFiltered.length > 0
          ? `الفلاتر الحالية تخفي كل النتائج — يوجد ${roleFiltered.length} حالة إجمالاً`
          : hasActiveFilters
            ? "جرّب تغيير الفلاتر أو مسحها"
            : "لم يتم العثور على حالات بعد"
      }
      action={
        hasActiveFilters ? (
          <Button size="lg" variant="outline" className="font-bold" onClick={clearFilters}>
            مسح كل الفلاتر
          </Button>
        ) : canReviewCases && !isDev ? (
          <Button asChild size="lg" className="font-black">
            <Link href="/cases/create">إنشاء بلاغ</Link>
          </Button>
        ) : undefined
      }
    />
  ) : (
    <div className="space-y-2.5">{sortedCases.map((c) => renderCaseRow(c))}</div>
  );

  return (
    <div className="content-container pb-10">
      {/* Header */}
      <div
        className={cn(
          "relative mb-6 overflow-hidden rounded-2xl border-2 p-6 md:p-8",
          isCoordinator
            ? "bg-gradient-to-l from-sky-500/10 via-card to-indigo-500/5"
            : "bg-gradient-to-l from-emerald-500/8 via-card to-cyan-500/5"
        )}
      >
        <div className="absolute -top-12 -start-12 h-32 w-32 rounded-full bg-brand-gradient opacity-10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">
              {isCoordinator ? "منسق الدعم" : "مركز الدعم"}
            </p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">{pageTitle}</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1.5 max-w-xl font-medium">
              {isCoordinator
                ? "صنّف البلاغات الواردة من دعم المراكز — System Bug للسوبر أدمن، أو أغلقها بسبب تقني"
                : isSupportSupervisor
                  ? "كل البلاغات التي أنشأها أفراد فريقك — مع اسم المرسل"
                : isSupervisor
                  ? "تابع حالاتك من الإنشاء حتى الإغلاق"
                  : isDev
                    ? devAttention === 0
                      ? `✓ لا أعطال معلّقة — ${getSpecialtyLabel({ role: user?.role ?? "DEVELOPER", team: user?.team ?? undefined })}`
                      : `${devAttention} عطل يحتاج عملك`
                    : "إدارة ومتابعة جميع البلاغات والحالات"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canReviewCases && !isDev && (
              <Button asChild size="lg" className="font-black shadow-sm bg-brand-gradient border-0">
                <Link href="/cases/create">
                  <PlusCircle className="h-5 w-5" />
                  إنشاء بلاغ
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* KPI strip */}
      {isDev && devDashboard && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
          <KpiTile label="قيد المعالجة" value={devDashboard.stats.assigned} href="/cases?simpleStatus=IN_PROGRESS" icon={Wrench} accent="amber" urgent active={simpleStatus === "IN_PROGRESS"} />
          <KpiTile label="بانتظار نشر" value={devDashboard.stats.deployment} href="/cases?simpleStatus=IN_PROGRESS" icon={Rocket} accent="sky" active={simpleStatus === "IN_PROGRESS"} />
          <KpiTile label="بانتظار المدير" value={devDashboard.stats.solvedPending} href="/cases?simpleStatus=SOLVED" icon={CheckCircle2} accent="emerald" active={simpleStatus === "SOLVED"} />
          <KpiTile label="أُغلقت اليوم" value={devDashboard.stats.solvedToday} href="/cases?simpleStatus=CLOSED" icon={Archive} accent="slate" active={simpleStatus === "CLOSED"} />
        </div>
      )}

      {isCoordinator && coordinatorStats && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 mb-6">
          <KpiTile
            label="بانتظار التصنيف"
            value={coordinatorStats.pending}
            href="/cases?status=OPEN"
            icon={ClipboardCheck}
            accent="sky"
            urgent
            active={coordinatorStatusValue === "OPEN"}
          />
          <KpiTile
            label="مُصعّدة اليوم"
            value={coordinatorStats.escalatedToday}
            href="/cases?status=AWAITING_APPROVAL"
            icon={ArrowUpRight}
            accent="amber"
            active={coordinatorStatusValue === "AWAITING_APPROVAL"}
          />
          <KpiTile
            label="أُغلقت اليوم"
            value={coordinatorStats.closedToday}
            href="/cases?status=CLOSED"
            icon={Archive}
            accent="emerald"
            active={coordinatorStatusValue === "CLOSED"}
          />
        </div>
      )}

      {!isSupervisor && !isDev && !isCoordinator && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
          {statusNavOptions.map(({ value, label, icon, count }) => (
            <KpiTile
              key={value}
              label={label}
              value={count}
              href={`/cases?simpleStatus=${value}`}
              icon={icon}
              accent={
                value === "NEW" ? "sky" : value === "IN_PROGRESS" ? "amber" : value === "SOLVED" ? "emerald" : "slate"
              }
              active={simpleStatus === value}
            />
          ))}
        </div>
      )}

      {pendingReviewCount > 0 && (
        <div className="mb-6">
          <AlertBanner
            icon={isCoordinator ? ClipboardCheck : Inbox}
            tone="sky"
            title={
              isCoordinator
                ? `${pendingReviewCount} ${pendingReviewCount === 1 ? "بلاغ" : "بلاغات"} بانتظار تصنيفك`
                : `${pendingReviewCount} ${pendingReviewCount === 1 ? "حالة" : "حالات"} بانتظار مراجعتك`
            }
            description={
              isCoordinator
                ? "افتح البلاغ وصنّفه: System Bug للسوبر أدمن، أو أغلقه بسبب تقني"
                : "راجع وصنّف — أو أغلق إذا لم تكن مشكلة"
            }
            action={
              isCoordinator ? (
                coordinatorStatusValue !== "OPEN" ? (
                  <Button
                    size="lg"
                    variant="secondary"
                    className="font-bold border-2"
                    onClick={() => setCoordinatorStatusFilter("OPEN")}
                  >
                    عرض بانتظار التصنيف
                  </Button>
                ) : undefined
              ) : rawStatus !== "AWAITING_APPROVAL" ? (
                <Button
                  size="lg"
                  variant="secondary"
                  className="font-bold border-2"
                  onClick={showPendingReviewCases}
                >
                  عرض بانتظار المراجعة
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      {/* Mobile filter toggle */}
      <div className="lg:hidden mb-4">
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
          <div className="mt-3 rounded-2xl border-2 bg-card p-4 shadow-sm">
            {isCoordinator ? coordinatorFiltersPanel : filtersPanel}
          </div>
        )}
      </div>

      {/* Main layout */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr] items-start">
        {/* Sidebar filters — desktop */}
        <aside className="hidden lg:block sticky top-20 rounded-2xl border-2 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border/60">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <span className="text-sm font-black">الفلاتر</span>
          </div>
          {isCoordinator ? coordinatorFiltersPanel : filtersPanel}
        </aside>

        {/* Results column */}
        <main className="min-w-0 space-y-4">
          <div className="flex flex-col gap-2 rounded-xl bg-muted/30 border border-border/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
              <span className="text-sm font-black tabular-nums shrink-0">{resultCount} نتيجة</span>
              {isCoordinator && coordinatorStatusValue !== "ALL" && (
                <span className="text-xs font-bold text-muted-foreground truncate">
                  · {COORDINATOR_STATUS_FILTERS.find((f) => f.value === coordinatorStatusValue)?.label ?? coordinatorStatusValue}
                </span>
              )}
              {!isCoordinator && rawStatus !== "ALL" && (
                <span className="text-xs font-bold text-muted-foreground truncate">
                  · {CASE_STATUS_LABELS[rawStatus as keyof typeof CASE_STATUS_LABELS] ?? rawStatus}
                </span>
              )}
              {!isCoordinator && simpleStatus !== "ALL" && rawStatus === "ALL" && (
                <span className="text-xs font-bold text-muted-foreground truncate">
                  · {SIMPLE_CASE_STATUS_LABELS[simpleStatus]}
                </span>
              )}
            </div>
            {isCoordinator && coordinatorStatusValue === "ALL" && !search.trim() && systemPrefix === "ALL" && (
              <p className="text-[11px] font-medium text-muted-foreground leading-relaxed sm:max-w-xs">
                الحالات خارج «بانتظار التصنيف» للمعاينة فقط
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {hasActiveFilters && (
                <Button
                  size="sm"
                  variant="outline"
                  className="font-bold gap-1.5 h-8"
                  onClick={clearFilters}
                >
                  <X className="h-3.5 w-3.5" />
                  مسح كل الفلاتر
                </Button>
              )}
              {canReviewCases && !isDev && !isCoordinator && (
                <Link
                  href="/cases/create"
                  className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  بلاغ جديد
                </Link>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
              <span className="text-xs font-bold text-primary">فلاتر نشطة</span>
              {search.trim() && (
                <ActiveFilterChip label={`بحث: ${search}`} onRemove={() => setSearch("")} />
              )}
              {caseType !== "ALL" && (
                <ActiveFilterChip
                  label={CASE_TYPE_LABELS[caseType]}
                  onRemove={() => setCaseType("ALL")}
                />
              )}
              {rawStatus !== "ALL" && (
                <ActiveFilterChip
                  label={
                    CASE_STATUS_LABELS[rawStatus as keyof typeof CASE_STATUS_LABELS] ??
                    rawStatus
                  }
                  onRemove={() => router.replace("/cases")}
                />
              )}
              {simpleStatus !== "ALL" && (
                <ActiveFilterChip
                  label={SIMPLE_CASE_STATUS_LABELS[simpleStatus]}
                  onRemove={() => router.replace("/cases")}
                />
              )}
              {systemPrefix !== "ALL" && (
                <ActiveFilterChip
                  label={SYSTEM_PREFIX_FILTER_OPTIONS.find((o) => o.value === systemPrefix)?.label ?? systemPrefix}
                  onRemove={() => setSystemPrefix("ALL")}
                />
              )}
              {specialtyFilter !== "ALL" && (
                <ActiveFilterChip
                  label={SPECIALTY_FILTER_OPTIONS.find((o) => o.value === specialtyFilter)?.label ?? specialtyFilter}
                  onRemove={() => setSpecialtyFilter("ALL")}
                />
              )}
            </div>
          )}

          {resultsContent}
        </main>
      </div>
    </div>
  );
}
