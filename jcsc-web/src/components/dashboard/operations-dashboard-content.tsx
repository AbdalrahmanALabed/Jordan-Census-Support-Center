"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Inbox,
  Wrench,
  CheckCircle2,
  Archive,
  Layers,
  TrendingUp,
  PlusCircle,
  Activity,
  Clock,
  ChevronLeft,
  BarChart3,
  UsersRound,
  Flame,
  AlertTriangle,
  Rocket,
  Bug,
  UserX,
  CalendarPlus,
  Minus,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  KpiTile,
  PageHero,
  SectionCard,
  QuickRow,
  StatusBadge,
  AlertBanner,
} from "@/components/shared/ops-ui";
import { getOperationsDashboard } from "@/lib/services/attention-dashboard";
import { simpleStatusLabel, toSimpleCaseStatus } from "@/lib/cases";
import { formatRelativeDate, cn } from "@/lib/utils";
import { useUserStore } from "@/stores/user-store";

const WORKFLOW_STEPS = [
  { key: "review", label: "System Bug", icon: Bug, statKey: "waitingReview" as const, href: "/cases?status=AWAITING_APPROVAL" },
  { key: "dev", label: "المطورين", icon: Wrench, statKey: "assignedToDevelopers" as const, href: "/cases?simpleStatus=IN_PROGRESS" },
  { key: "solved", label: "محلول", icon: CheckCircle2, statKey: "solvedAwaitingClose" as const, href: "/cases?simpleStatus=SOLVED" },
  { key: "closed", label: "مغلق اليوم", icon: Archive, statKey: "closedToday" as const, href: "/cases?simpleStatus=CLOSED" },
];

function KpiSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="text-start">
        <h3 className="text-sm font-black">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function WorkflowPipeline({
  stats,
}: {
  stats: {
    waitingReview: number;
    assignedToDevelopers: number;
    solvedAwaitingClose: number;
    closedToday: number;
  };
}) {
  return (
    <div className="rounded-2xl border-2 bg-card p-5 md:p-6 shadow-sm overflow-x-auto">
      <p className="text-xs font-bold text-muted-foreground mb-4">مسار معالجة الحالات</p>
      <div className="flex items-center gap-1 min-w-[32rem]">
        {WORKFLOW_STEPS.map((step, i) => {
          const Icon = step.icon;
          const count = stats[step.statKey];
          const isLast = i === WORKFLOW_STEPS.length - 1;
          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <Link
                href={step.href}
                className={cn(
                  "flex flex-col items-center gap-2 flex-1 rounded-xl border-2 p-3 transition-all hover:shadow-md min-w-[5rem]",
                  count > 0
                    ? "border-primary/30 bg-primary/5 hover:border-primary/50"
                    : "border-border bg-muted/15 hover:border-primary/20"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    count > 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-black text-center leading-tight">{step.label}</span>
                <span
                  className={cn(
                    "text-lg font-black tabular-nums",
                    count > 0 ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </Link>
              {!isLast && (
                <ChevronLeft className="h-4 w-4 text-muted-foreground/50 shrink-0 mx-0.5" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyTrendChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="rounded-2xl border-2 bg-card overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 border-b border-border/60 bg-muted/20 px-5 py-4">
        <div className="rounded-xl bg-primary/10 p-2.5">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-black">حالات جديدة — آخر 7 أيام</h3>
          <p className="text-xs text-muted-foreground mt-0.5">عدد الحالات المُنشأة يومياً</p>
        </div>
      </div>
      <div className="p-5 md:p-6">
        <div className="flex items-end gap-2 h-28">
          {data.map((d, i) => {
            const h = Math.round((d.count / max) * 100);
            const isToday = i === data.length - 1;
            return (
              <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <span className="text-xs font-black text-primary tabular-nums">{d.count}</span>
                <div
                  className={cn(
                    "w-full rounded-t-lg bg-brand-gradient transition-all",
                    isToday ? "opacity-100" : "opacity-65"
                  )}
                  style={{ height: `${Math.max(h, 8)}%` }}
                />
                <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                  {d.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({
  action,
  details,
  caseNumber,
  actorName,
  createdAt,
  caseId,
}: {
  action: string;
  details?: string | null;
  caseNumber?: string;
  actorName?: string;
  createdAt: string;
  caseId: string;
}) {
  return (
    <Link
      href={`/cases/${caseId}`}
      className="flex items-start gap-3 rounded-xl border-2 bg-card/80 p-4 hover:border-primary/25 hover:bg-accent/30 transition-all"
    >
      <div className="rounded-lg bg-primary/10 p-2 shrink-0 mt-0.5">
        <Clock className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1 text-start">
        <p className="font-bold text-sm">{action}</p>
        {details && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{details}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1.5">
          {caseNumber && <span className="font-bold">{caseNumber}</span>}
          {caseNumber && actorName && " · "}
          {actorName}
          {" · "}
          {formatRelativeDate(createdAt)}
        </p>
      </div>
    </Link>
  );
}

export function OperationsDashboardContent() {
  const { currentUser } = useUserStore();
  const adminName = currentUser?.name?.split(" ")[0] ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["operations-dashboard"],
    queryFn: getOperationsDashboard,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="content-container space-y-6 animate-fade-in-up pb-8">
        <div className="h-36 rounded-2xl skeleton-shimmer" />
        <div className="h-24 rounded-2xl skeleton-shimmer" />
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl skeleton-shimmer" />
          ))}
        </div>
        <div className="h-40 rounded-2xl skeleton-shimmer" />
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl skeleton-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const { stats } = data;
  const totalAttention =
    stats.waitingReview + stats.assignedToDevelopers + stats.solvedAwaitingClose;
  const urgentCount = stats.criticalOpen + stats.highOpen;

  return (
    <div dir="rtl" className="content-container space-y-6 pb-8 text-start">
      <PageHero
        title={adminName ? `مرحباً ${adminName}` : "لوحة السوبر أدمن"}
        subtitle={
          totalAttention === 0
            ? `${stats.totalOpen} حالة مفتوحة — لا شيء عاجل`
            : `${totalAttention} ${totalAttention === 1 ? "حالة" : "حالات"} تحتاج قرارك · ${urgentCount} عاجلة`
        }
        variant={totalAttention > 0 || urgentCount > 0 ? "urgent" : "calm"}
      >
        <Button asChild size="lg">
          <Link href="/cases/create">
            <PlusCircle className="h-5 w-5" />
            حالة جديدة
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/cases">كل الحالات</Link>
        </Button>
      </PageHero>

      {totalAttention > 0 && (
        <Link
          href="/cases?status=AWAITING_APPROVAL"
          className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-amber-300/70 bg-gradient-to-l from-amber-500/12 via-card to-red-500/8 p-5 md:p-6 shadow-md hover:shadow-lg transition-all hover:border-amber-400/80"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
            <Inbox className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-xl font-black text-amber-900 dark:text-amber-100">
              {totalAttention} {totalAttention === 1 ? "حالة" : "حالات"} تحتاج قرارك
            </p>
            <p className="text-sm text-muted-foreground mt-1">اضغط لبدء المراجعة فوراً</p>
          </div>
          <span className="rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-black text-white shrink-0">
            ابدأ الآن
          </span>
        </Link>
      )}

      {urgentCount > 0 && (
        <AlertBanner
          icon={Flame}
          tone="red"
          title={`${urgentCount} حالة عاجلة مفتوحة`}
          description={`${stats.criticalOpen} حرجة · ${stats.highOpen} عالية الأولوية`}
        />
      )}

      <WorkflowPipeline stats={stats} />

      {data.escalatedSystemBugs.length > 0 && (
        <Link
          href="/cases?status=AWAITING_APPROVAL"
          className="block rounded-2xl border-2 border-violet-300/60 bg-gradient-to-l from-violet-500/10 via-card to-primary/5 p-5 md:p-6 shadow-sm hover:shadow-md hover:border-violet-400/70 transition-all"
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
              <Bug className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-[200px] text-start">
              <p className="text-lg font-black">بلاغات System Bug — من منسق الدعم</p>
              <p className="text-sm text-muted-foreground mt-1">
                {data.escalatedSystemBugs.length}{" "}
                {data.escalatedSystemBugs.length === 1 ? "حالة" : "حالات"} مُصعّدة للمراجعة والإسناد
              </p>
            </div>
            <ChevronLeft className="h-6 w-6 text-muted-foreground shrink-0" />
          </div>
        </Link>
      )}

      {/* حالة سير العمل */}
      <KpiSection title="حالة سير العمل" description="توزيع الحالات حسب مرحلة المعالجة">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <KpiTile label="System Bug — للمراجعة" value={stats.waitingReview} href="/cases?status=AWAITING_APPROVAL" icon={Bug} accent="sky" urgent={stats.waitingReview > 0} />
          <KpiTile label="عند المطورين" value={stats.assignedToDevelopers} href="/cases?simpleStatus=IN_PROGRESS" icon={Wrench} accent="amber" />
          <KpiTile label="محلولة — بانتظار تأكيد" value={stats.solvedAwaitingClose} href="/cases?simpleStatus=SOLVED" icon={CheckCircle2} accent="emerald" urgent={stats.solvedAwaitingClose > 0} />
          <KpiTile label="مغلقة اليوم" value={stats.closedToday} href="/cases?simpleStatus=CLOSED" icon={Archive} accent="slate" />
          <KpiTile label="مفتوحة (إجمالي)" value={stats.totalOpen} href="/cases" icon={Layers} accent="primary" />
        </div>
      </KpiSection>

      {/* الأولوية */}
      <KpiSection title="مؤشرات الأولوية" description="الحالات المفتوحة حسب درجة الأولوية">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <KpiTile label="حرجة" value={stats.criticalOpen} href="/cases" icon={Flame} accent="amber" urgent={stats.criticalOpen > 0} />
          <KpiTile label="عالية" value={stats.highOpen} href="/cases" icon={AlertTriangle} accent="amber" />
          <KpiTile label="متوسطة" value={stats.mediumOpen} href="/cases" icon={Minus} accent="sky" />
          <KpiTile label="منخفضة" value={stats.lowOpen} href="/cases" icon={ArrowDown} accent="slate" />
        </div>
      </KpiSection>

      {/* تشغيلية */}
      <KpiSection title="مؤشرات تشغيلية" description="نشاط اليوم وحالات خاصة">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <KpiTile label="جديدة اليوم" value={stats.createdToday} href="/cases" icon={CalendarPlus} accent="sky" />
          <KpiTile label="أعطال مفتوحة" value={stats.bugsOpen} href="/cases" icon={Bug} accent="primary" urgent={stats.bugsOpen > 0} />
          <KpiTile label="بانتظار نشر" value={stats.waitingDeployment} href="/cases?simpleStatus=IN_PROGRESS" icon={Rocket} accent="sky" />
          <KpiTile label="بدون إسناد" value={stats.unassigned} href="/cases?simpleStatus=IN_PROGRESS" icon={UserX} accent="amber" urgent={stats.unassigned > 0} />
          <KpiTile label="محلولة اليوم" value={stats.resolvedToday} href="/cases?simpleStatus=SOLVED" icon={CheckCircle2} accent="emerald" />
          <KpiTile label="مغلقة (إجمالي)" value={stats.totalClosed} href="/cases?simpleStatus=CLOSED" icon={Archive} accent="slate" />
        </div>
      </KpiSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <WeeklyTrendChart data={data.weeklyTrend} />

        {data.topIssueToday && (
          <div className="rounded-2xl border-2 bg-card overflow-hidden shadow-sm flex flex-col">
            <div className="flex items-center gap-3 border-b border-border/60 bg-muted/20 px-5 py-4">
              <div className="rounded-xl bg-amber-500/10 p-2.5">
                <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-black">أكثر مشكلة اليوم</h3>
                <p className="text-xs text-muted-foreground mt-0.5">النوع الأكثر تكراراً</p>
              </div>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <p className="text-4xl font-black text-primary tabular-nums">{data.topIssueToday.count}</p>
              <p className="text-lg font-black mt-2">{data.topIssueToday.label}</p>
              <p className="text-sm text-muted-foreground mt-1">حالة اليوم</p>
            </div>
          </div>
        )}
      </div>

      {data.byTeam.length > 0 && (
        <div className="rounded-2xl border-2 bg-card overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 border-b border-border/60 bg-muted/20 px-5 py-4">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <UsersRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-black">حمل الفرق</h3>
              <p className="text-xs text-muted-foreground mt-0.5">الحالات المفتوحة لكل فريق</p>
            </div>
          </div>
          <div className="p-5 md:p-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.byTeam.slice(0, 8).map(({ label, count }) => {
              const maxTeam = data.byTeam[0]?.count ?? 1;
              const pct = Math.round((count / maxTeam) * 100);
              return (
                <div key={label} className="rounded-xl border-2 p-4 bg-muted/10">
                  <div className="flex justify-between items-center mb-2 gap-2">
                    <span className="font-bold text-sm truncate">{label}</span>
                    <span className="text-xl font-black text-primary tabular-nums shrink-0">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-brand-gradient rounded-full" style={{ width: `${Math.max(pct, 6)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.byType.length > 0 && (
        <div className="rounded-2xl border-2 bg-card overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 border-b border-border/60 bg-muted/20 px-5 py-4">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-black">توزيع الحالات حسب النوع</h3>
              <p className="text-xs text-muted-foreground mt-0.5">نسبة كل نوع من إجمالي الحالات</p>
            </div>
          </div>
          <div className="p-5 md:p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.byType.map(({ label, count }) => {
                const total = stats.totalOpen + stats.closedToday + count;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={label} className="rounded-xl border-2 p-4 bg-gradient-to-br from-muted/20 to-transparent hover:border-primary/25 transition-colors">
                    <div className="flex justify-between items-center mb-3 gap-2">
                      <span className="font-bold text-sm truncate">{label}</span>
                      <span className="text-2xl font-black text-primary tabular-nums shrink-0">{count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-brand-gradient rounded-full transition-all duration-500" style={{ width: `${Math.max(pct, 6)}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 tabular-nums">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="System Bug — للمراجعة" count={data.waitingReview.length} href="/cases?status=AWAITING_APPROVAL" icon={Bug} emptyText="لا حالات مُصعّدة — ممتاز!">
          {data.waitingReview.slice(0, 4).map((c) => (
            <QuickRow key={c.id} href={`/cases/${c.id}`} primary={c.title} secondary={c.number} badge={<StatusBadge status={toSimpleCaseStatus(c.status)} label="System Bug" />} />
          ))}
        </SectionCard>
        <SectionCard title="معيّنة للمطورين" count={data.assignedToDevelopers.length} href="/cases?simpleStatus=IN_PROGRESS" icon={Wrench} emptyText="لا حالات معيّنة حالياً">
          {data.assignedToDevelopers.slice(0, 4).map((c) => (
            <QuickRow key={c.id} href={`/cases/${c.id}`} primary={c.title} secondary={`${c.assignedDeveloperName ?? "—"} · ${simpleStatusLabel(c.status)}`} />
          ))}
        </SectionCard>
        <SectionCard title="محلولة — بانتظار تأكيدي" count={data.solvedAwaitingClose.length} href="/cases?simpleStatus=SOLVED" icon={CheckCircle2} emptyText="لا حالات بانتظار الإغلاق">
          {data.solvedAwaitingClose.slice(0, 4).map((c) => (
            <QuickRow key={c.id} href={`/cases/${c.id}`} primary={c.title} secondary={c.number} badge={<StatusBadge status="SOLVED" label="محلول" />} />
          ))}
        </SectionCard>
        <SectionCard title="مغلقة اليوم" count={data.closedToday.length} href="/cases?simpleStatus=CLOSED" icon={Archive} emptyText="لم تُغلق حالات اليوم بعد">
          {data.closedToday.slice(0, 4).map((c) => (
            <QuickRow key={c.id} href={`/cases/${c.id}`} primary={c.title} secondary={formatRelativeDate(c.updatedAt)} />
          ))}
        </SectionCard>
      </div>

      <SectionCard title="آخر النشاطات" count={data.latestActivities.length} href="/cases" icon={Activity} emptyText="لا نشاطات بعد">
        <div className="space-y-2">
          {data.latestActivities.slice(0, 6).map((a) => (
            <ActivityItem key={a.id} action={a.action} details={a.details} caseNumber={a.caseNumber} actorName={a.actorName} createdAt={a.createdAt} caseId={a.caseId} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
