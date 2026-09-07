"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  UsersRound,
  FolderKanban,
  UserPlus,
  ChevronLeft,
  Activity,
  CircleDot,
  ShieldCheck,
  MapPin,
  Clock,
  UserCog,
  Sparkles,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  KpiTile,
  PageHero,
  SectionCard,
  StatusBadge,
  AlertBanner,
} from "@/components/shared/ops-ui";
import { getSupportSupervisorDashboard } from "@/lib/services/support-supervisor-dashboard";
import type { SupportSupervisorDashboardData } from "@/lib/services/support-supervisor-dashboard";
import { simpleStatusLabel } from "@/lib/cases";
import { cn, formatRelativeDate } from "@/lib/utils";
import { useUserStore } from "@/stores/user-store";
import type { CaseStatus, SimpleCaseStatus } from "@/lib/cases/types";

type TeamMember = SupportSupervisorDashboardData["team"][number];
type TeamCase = SupportSupervisorDashboardData["recentCases"][number];

const ROLE_AVATAR: Record<string, string> = {
  SUPPORT_COORDINATOR: "bg-gradient-to-br from-cyan-500 to-teal-600 text-white",
  FIELD_OPERATIONS_COORDINATOR: "bg-gradient-to-br from-orange-500 to-amber-600 text-white",
  SUPERVISOR: "bg-gradient-to-br from-sky-500 to-blue-600 text-white",
};

function DashboardSkeleton() {
  return (
    <div className="content-container space-y-6 animate-fade-in-up pb-10">
      <div className="h-40 rounded-2xl skeleton-shimmer" />
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8 h-96 rounded-2xl skeleton-shimmer" />
        <div className="xl:col-span-4 h-96 rounded-2xl skeleton-shimmer" />
      </div>
    </div>
  );
}

function TeamMemberCard({
  member,
  maxOpen,
}: {
  member: TeamMember;
  maxOpen: number;
}) {
  const loadPct = maxOpen > 0 ? Math.round((member.openCount / maxOpen) * 100) : 0;
  const avatarClass =
    ROLE_AVATAR[member.role] ?? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white";

  return (
    <Link
      href="/users"
      className={cn(
        "group relative overflow-hidden rounded-2xl border-2 bg-card p-4 transition-all duration-300",
        "hover:border-teal-400/40 hover:shadow-lg hover:-translate-y-0.5",
        !member.isActive && "opacity-60"
      )}
    >
      <div className="pointer-events-none absolute -top-8 -start-8 h-24 w-24 rounded-full bg-teal-500/10 blur-2xl opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start gap-3">
        <Avatar className="h-12 w-12 ring-2 ring-background shadow-md">
          <AvatarFallback className={cn("text-sm font-black", avatarClass)}>
            {member.name.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-black truncate leading-tight">{member.name}</p>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{member.email}</p>
            </div>
            {!member.isActive && (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">
                موقوف
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-lg bg-teal-500/12 px-2 py-0.5 text-[11px] font-bold text-teal-700 dark:text-teal-300 ring-1 ring-teal-500/20">
              {member.roleLabel}
            </span>
            {member.governorate && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {member.governorate}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="relative mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-muted-foreground">البلاغات المفتوحة</span>
          <span className="tabular-nums">
            <span className={cn(member.openCount > 0 && "text-amber-600 dark:text-amber-400")}>
              {member.openCount}
            </span>
            <span className="text-muted-foreground"> / {member.caseCount}</span>
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted/80">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              member.openCount > 0
                ? "bg-gradient-to-l from-amber-500 to-orange-400"
                : "bg-gradient-to-l from-emerald-500 to-teal-400"
            )}
            style={{ width: `${Math.max(loadPct, member.openCount > 0 ? 8 : member.caseCount > 0 ? 100 : 0)}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

function TeamCaseRow({ caseItem }: { caseItem: TeamCase }) {
  return (
    <Link
      href={`/cases/${caseItem.id}`}
      className="group flex flex-col gap-3 rounded-2xl border-2 bg-card/80 p-4 transition-all duration-200 hover:border-teal-400/35 hover:bg-teal-500/[0.03] hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-muted px-2.5 py-0.5 text-xs font-black tabular-nums">
            {caseItem.number}
          </span>
          {caseItem.governorate && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {caseItem.governorate}
            </span>
          )}
        </div>
        <p className="font-black text-sm leading-relaxed line-clamp-2 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
          {caseItem.title}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500/10 px-2 py-0.5 text-teal-700 dark:text-teal-300">
            <UsersRound className="h-3.5 w-3.5" />
            {caseItem.createdByName}
            {caseItem.createdByRole && (
              <span className="font-medium opacity-75">· {caseItem.createdByRole}</span>
            )}
          </span>
          <span title={caseItem.updatedAt}>
            <Clock className="inline h-3.5 w-3.5 me-1 -mt-0.5" />
            {formatRelativeDate(caseItem.updatedAt)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge
          status={caseItem.simpleStatus as SimpleCaseStatus}
          label={simpleStatusLabel(caseItem.status as CaseStatus)}
        />
        <ChevronLeft className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

function StatusOverview({
  stats,
}: {
  stats: SupportSupervisorDashboardData["stats"];
}) {
  const closed = Math.max(stats.totalCases - stats.openCases, 0);
  const newCases = Math.max(stats.openCases - stats.inProgress, 0);

  const items = [
    { label: "جديدة / مفتوحة", value: newCases, tone: "bg-sky-500", text: "text-sky-700 dark:text-sky-300" },
    { label: "قيد المعالجة", value: stats.inProgress, tone: "bg-amber-500", text: "text-amber-700 dark:text-amber-300" },
    { label: "مغلقة", value: closed, tone: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300" },
  ];

  return (
    <div className="rounded-2xl border-2 bg-gradient-to-l from-teal-500/8 via-card to-emerald-500/5 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        <h3 className="text-sm font-black">توزيع حالات الفريق</h3>
        <span className="ms-auto text-xs font-bold text-muted-foreground tabular-nums">
          {stats.totalCases} إجمالي
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border bg-card/80 p-3 text-center"
          >
            <p className={cn("text-2xl font-black tabular-nums", item.text)}>{item.value}</p>
            <p className="text-[11px] font-bold text-muted-foreground mt-1">{item.label}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", item.tone)}
                style={{
                  width: stats.totalCases > 0 ? `${Math.round((item.value / stats.totalCases) * 100)}%` : "0%",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SupportSupervisorDashboardContent() {
  const { currentUser } = useUserStore();
  const firstName = currentUser?.name?.split(" ")[0] ?? "";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["support-supervisor-dashboard"],
    queryFn: getSupportSupervisorDashboard,
    refetchInterval: 60_000,
  });

  const sortedTeam = useMemo(
    () => (data ? [...data.team].sort((a, b) => b.openCount - a.openCount || b.caseCount - a.caseCount) : []),
    [data]
  );

  const maxOpen = useMemo(
    () => Math.max(...(sortedTeam.map((m) => m.openCount) ?? [0]), 1),
    [sortedTeam]
  );

  const coordinators = useMemo(
    () =>
      sortedTeam.filter(
        (m) => m.role === "SUPPORT_COORDINATOR" || m.role === "FIELD_OPERATIONS_COORDINATOR"
      ).length,
    [sortedTeam]
  );

  const fieldSupport = useMemo(
    () => sortedTeam.filter((m) => m.role === "SUPERVISOR").length,
    [sortedTeam]
  );

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <div className="content-container py-16 text-center space-y-4">
        <p className="text-lg font-black text-destructive">تعذّر تحميل لوحة مشرف الدعم</p>
        <p className="text-sm text-muted-foreground">تحقق من الاتصال ثم أعد المحاولة</p>
        <Button onClick={() => refetch()} className="font-bold">
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  const { stats, recentCases } = data;
  const hasTeam = stats.teamSize > 0;
  const hasOpenCases = stats.openCases > 0;

  return (
    <div dir="rtl" className="content-container space-y-6 pb-10 text-start">
      <PageHero
        title={firstName ? `مرحباً ${firstName}` : "مشرف الدعم"}
        subtitle={
          !hasTeam
            ? "ابدأ ببناء فريقك — أضف منسقي الدعم ودعم المراكز وتابع بلاغاتهم من مكان واحد"
            : hasOpenCases
              ? `${stats.teamSize} ${stats.teamSize === 1 ? "عضو" : "أعضاء"} · ${stats.openCases} حالة مفتوحة تحتاج متابعة`
              : `${stats.teamSize} ${stats.teamSize === 1 ? "عضو" : "أعضاء"} · كل الحالات تحت السيطرة`
        }
        variant={hasOpenCases ? "urgent" : "calm"}
      >
        <Button asChild size="lg" className="font-black shadow-md">
          <Link href="/users?tab=add">
            <UserPlus className="h-5 w-5" />
            إضافة عضو
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="font-bold">
          <Link href="/cases">
            <FolderKanban className="h-5 w-5" />
            حالات الفريق
          </Link>
        </Button>
      </PageHero>

      {!hasTeam && (
        <AlertBanner
          icon={Sparkles}
          tone="emerald"
          title="فريقك فارغ — ابدأ الآن"
          description="أنشئ حسابات لمنسقي الدعم ودعم المراكز، وحدّد صلاحياتهم، ثم تابع بلاغاتهم من هذه اللوحة."
          action={
            <Button asChild size="lg" className="font-black shrink-0">
              <Link href="/users?tab=add">
                <UserPlus className="h-5 w-5" />
                إضافة أول عضو
              </Link>
            </Button>
          }
        />
      )}

      {hasTeam && hasOpenCases && (
        <AlertBanner
          icon={Activity}
          tone="amber"
          title={`${stats.openCases} ${stats.openCases === 1 ? "حالة مفتوحة" : "حالات مفتوحة"} في فريقك`}
          description={`${stats.newToday} جديدة اليوم · ${stats.inProgress} قيد المعالجة — راجع التوزيع وتابع الأعضاء الأكثر تحمّلاً`}
          action={
            <Button asChild variant="secondary" size="lg" className="font-bold shrink-0">
              <Link href="/cases">
                مراجعة الحالات
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
      )}

      {hasTeam && !hasOpenCases && stats.totalCases > 0 && (
        <AlertBanner
          icon={CheckCircle2}
          tone="emerald"
          title="أداء ممتاز — لا حالات مفتوحة"
          description={`${stats.totalCases} ${stats.totalCases === 1 ? "بلاغ" : "بلاغ"} أُغلقت أو حُلّت — فريقك يعمل بكفاءة`}
        />
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="أفراد الفريق"
          value={stats.teamSize}
          href="/users"
          icon={UsersRound}
          accent="primary"
        />
        <KpiTile
          label="حالات مفتوحة"
          value={stats.openCases}
          href="/cases"
          icon={FolderKanban}
          accent="amber"
          urgent={stats.openCases > 0}
        />
        <KpiTile
          label="جديدة اليوم"
          value={stats.newToday}
          href="/cases"
          icon={Activity}
          accent="sky"
        />
        <KpiTile
          label="قيد المعالجة"
          value={stats.inProgress}
          href="/cases?simpleStatus=IN_PROGRESS"
          icon={CircleDot}
          accent="emerald"
        />
      </div>

      {hasTeam && stats.totalCases > 0 && <StatusOverview stats={stats} />}

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/users?tab=add"
          className="group flex items-center gap-4 rounded-2xl border-2 border-teal-300/60 bg-gradient-to-l from-teal-500/10 via-card to-emerald-500/5 p-4 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg group-hover:scale-105 transition-transform">
            <UserPlus className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm">إضافة عضو</p>
            <p className="text-xs text-muted-foreground mt-0.5">منسق أو دعم مراكز</p>
          </div>
        </Link>
        <Link
          href="/users"
          className="group flex items-center gap-4 rounded-2xl border-2 border-cyan-300/60 bg-gradient-to-l from-cyan-500/10 via-card to-sky-500/5 p-4 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-lg group-hover:scale-105 transition-transform">
            <UserCog className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm">إدارة الصلاحيات</p>
            <p className="text-xs text-muted-foreground mt-0.5">تخصيص صلاحيات الفريق</p>
          </div>
        </Link>
        <Link
          href="/cases"
          className="group flex items-center gap-4 rounded-2xl border-2 border-amber-300/60 bg-gradient-to-l from-amber-500/10 via-card to-orange-500/5 p-4 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg group-hover:scale-105 transition-transform">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm">متابعة البلاغات</p>
            <p className="text-xs text-muted-foreground mt-0.5">كل حالات فريقك</p>
          </div>
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <SectionCard
            title="حالات الفريق"
            count={recentCases.length}
            href="/cases"
            icon={FolderKanban}
            emptyText="لا توجد حالات من فريقك بعد — ستظهر هنا عند إنشاء البلاغات"
          >
            {recentCases.slice(0, 8).map((c) => (
              <TeamCaseRow key={c.id} caseItem={c} />
            ))}
          </SectionCard>
        </div>

        <div className="xl:col-span-4 space-y-4">
          <div className="rounded-2xl border-2 bg-card shadow-sm overflow-hidden xl:sticky xl:top-4">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-gradient-to-l from-teal-500/12 via-card to-cyan-500/5 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/15 ring-1 ring-teal-500/25">
                  <UsersRound className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h3 className="text-base font-black">فريقك</h3>
                  <p className="text-[11px] text-muted-foreground font-bold mt-0.5">
                    {coordinators} منسق · {fieldSupport} دعم مراكز
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
                {stats.activeTeam} نشط
              </span>
            </div>
            <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
              {!hasTeam ? (
                <div className="rounded-xl border-2 border-dashed p-6 text-center">
                  <UsersRound className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm font-bold text-muted-foreground">لا يوجد أعضاء بعد</p>
                  <Button asChild size="sm" className="mt-3 font-bold">
                    <Link href="/users?tab=add">إضافة عضو</Link>
                  </Button>
                </div>
              ) : (
                sortedTeam.map((member) => (
                  <TeamMemberCard key={member.id} member={member} maxOpen={maxOpen} />
                ))
              )}
            </div>
            {hasTeam && (
              <div className="border-t border-border/60 px-5 py-3 bg-muted/20">
                <Link
                  href="/users"
                  className="text-sm font-bold text-teal-600 dark:text-teal-400 inline-flex items-center gap-1 hover:underline"
                >
                  إدارة الفريق
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
