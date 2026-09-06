"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Inbox,
  Wrench,
  CheckCircle2,
  Archive,
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
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  KpiTile,
  PageHero,
  SectionCard,
  QuickRow,
  StatusBadge,
} from "@/components/shared/ops-ui";
import { getOperationsDashboard } from "@/lib/services/attention-dashboard";
import { simpleStatusLabel, toSimpleCaseStatus, type Case } from "@/lib/cases";
import { formatRelativeDate, cn } from "@/lib/utils";
import { useUserStore } from "@/stores/user-store";

const WORKFLOW_STEPS = [
  {
    key: "review",
    label: "System Bug",
    icon: Bug,
    statKey: "waitingReview" as const,
    href: "/cases?status=AWAITING_APPROVAL",
  },
  {
    key: "dev",
    label: "المطورين",
    icon: Wrench,
    statKey: "assignedToDevelopers" as const,
    href: "/cases?simpleStatus=IN_PROGRESS",
  },
  {
    key: "solved",
    label: "محلول",
    icon: CheckCircle2,
    statKey: "solvedAwaitingClose" as const,
    href: "/cases?simpleStatus=SOLVED",
  },
  {
    key: "closed",
    label: "مغلق اليوم",
    icon: Archive,
    statKey: "closedToday" as const,
    href: "/cases?simpleStatus=CLOSED",
  },
] as const;

function DashboardSkeleton() {
  return (
    <div className="content-container space-y-6 animate-fade-in-up pb-8">
      <div className="h-36 rounded-2xl skeleton-shimmer" />
      <div className="h-24 rounded-2xl skeleton-shimmer" />
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
      <div className="h-64 rounded-2xl skeleton-shimmer" />
    </div>
  );
}

function WorkflowPipeline({
  stats,
  totalOpen,
}: {
  stats: Record<(typeof WORKFLOW_STEPS)[number]["statKey"], number>;
  totalOpen: number;
}) {
  return (
    <div className="rounded-2xl border-2 bg-card p-5 md:p-6 shadow-sm overflow-x-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-black">مسار معالجة الحالات</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalOpen} حالة مفتوحة إجمالاً — اضغط على أي مرحلة للانتقال
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="font-bold shrink-0">
          <Link href="/cases">
            <Layers className="h-4 w-4" />
            كل الحالات
          </Link>
        </Button>
      </div>
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

function PriorityAlert({
  waitingReview,
  highOpen,
}: {
  waitingReview: number;
  highOpen: number;
}) {
  if (waitingReview === 0 && highOpen === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {waitingReview > 0 && (
        <Link
          href="/cases?status=AWAITING_APPROVAL"
          className="flex items-center gap-4 rounded-2xl border-2 border-violet-300/60 bg-gradient-to-l from-violet-500/10 via-card to-primary/5 p-4 md:p-5 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <Bug className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0 text-start">
            <p className="font-black">{waitingReview} للمراجعة والإسناد</p>
            <p className="text-xs text-muted-foreground mt-0.5">System Bug من منسق الدعم</p>
          </div>
          <ChevronLeft className="h-5 w-5 text-muted-foreground shrink-0" />
        </Link>
      )}
      {highOpen > 0 && (
        <Link
          href="/cases"
          className="flex items-center gap-4 rounded-2xl border-2 border-amber-300/70 bg-gradient-to-l from-amber-500/10 via-card to-orange-500/5 p-4 md:p-5 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
            <Flame className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0 text-start">
            <p className="font-black">{highOpen} أولوية عالية</p>
            <p className="text-xs text-muted-foreground mt-0.5">حالات مفتوحة تحتاج متابعة</p>
          </div>
          <ChevronLeft className="h-5 w-5 text-muted-foreground shrink-0" />
        </Link>
      )}
    </div>
  );
}

function WeeklyTrendChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="rounded-2xl border-2 bg-card overflow-hidden shadow-sm h-full">
      <div className="flex items-center gap-3 border-b border-border/60 bg-muted/20 px-5 py-4">
        <div className="rounded-xl bg-primary/10 p-2.5">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-black">حالات جديدة — 7 أيام</h3>
          <p className="text-xs text-muted-foreground mt-0.5">نشاط الإنشاء اليومي</p>
        </div>
      </div>
      <div className="p-5">
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

function InsightPanel({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 bg-card overflow-hidden shadow-sm h-full">
      <div className="flex items-center gap-3 border-b border-border/60 bg-muted/20 px-5 py-4">
        <div className="rounded-xl bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-black">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
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

function CaseQueueList({
  cases,
  emptyText,
  renderSecondary,
  badge,
}: {
  cases: Case[];
  emptyText: string;
  renderSecondary?: (c: Case) => string;
  badge?: (c: Case) => React.ReactNode;
}) {
  if (cases.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-10 rounded-xl border-2 border-dashed">
        {emptyText}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {cases.slice(0, 6).map((c) => (
        <QuickRow
          key={c.id}
          href={`/cases/${c.id}`}
          primary={c.title}
          secondary={renderSecondary ? renderSecondary(c) : c.number}
          badge={badge?.(c)}
        />
      ))}
    </div>
  );
}

export function OperationsDashboardContent() {
  const { currentUser } = useUserStore();
  const adminName = currentUser?.name?.split(" ")[0] ?? "";
  const [queueTab, setQueueTab] = useState("review");

  const { data, isLoading } = useQuery({
    queryKey: ["operations-dashboard"],
    queryFn: getOperationsDashboard,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) return <DashboardSkeleton />;

  const { stats } = data;
  const needsAction = stats.waitingReview + stats.solvedAwaitingClose;

  return (
    <div dir="rtl" className="content-container space-y-6 pb-8 text-start">
      {/* ── ترحيب + إجراءات سريعة ── */}
      <PageHero
        title={adminName ? `مرحباً ${adminName}` : "لوحة السوبر أدمن"}
        subtitle={
          needsAction > 0
            ? `${needsAction} ${needsAction === 1 ? "حالة" : "حالات"} تحتاج قرارك · ${stats.totalOpen} مفتوحة`
            : `${stats.totalOpen} حالة مفتوحة — الوضع مستقر`
        }
        variant={needsAction > 0 || stats.highOpen > 0 ? "urgent" : "calm"}
      >
        <Button asChild size="lg">
          <Link href="/cases/create">
            <PlusCircle className="h-5 w-5" />
            حالة جديدة
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/cases?status=AWAITING_APPROVAL">مراجعة System Bug</Link>
        </Button>
      </PageHero>

      {/* ── مسار العمل (بديل عن صف KPIs المكرر) ── */}
      <WorkflowPipeline stats={stats} totalOpen={stats.totalOpen} />

      {/* ── تنبيهات مركّزة (واحدة لكل نوع) ── */}
      <PriorityAlert
        waitingReview={stats.waitingReview}
        highOpen={stats.highOpen}
      />

      {/* ── مؤشرات مختصرة — بدون تكرار مسار العمل ── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        <KpiTile label="عالية" value={stats.highOpen} href="/cases" icon={AlertTriangle} accent="amber" urgent={stats.highOpen > 0} />
        <KpiTile label="متوسطة" value={stats.mediumOpen} href="/cases" icon={Minus} accent="sky" />
        <KpiTile label="منخفضة" value={stats.lowOpen} href="/cases" icon={ArrowDown} accent="slate" />
        <KpiTile label="جديدة اليوم" value={stats.createdToday} href="/cases" icon={CalendarPlus} accent="sky" />
        <KpiTile label="بدون إسناد" value={stats.unassigned} href="/cases?simpleStatus=IN_PROGRESS" icon={UserX} accent="amber" urgent={stats.unassigned > 0} />
        <KpiTile label="بانتظار نشر" value={stats.waitingDeployment} href="/cases?simpleStatus=IN_PROGRESS" icon={Rocket} accent="sky" />
        <KpiTile label="أعطال مفتوحة" value={stats.bugsOpen} href="/cases" icon={Bug} accent="primary" urgent={stats.bugsOpen > 0} />
      </div>

      {/* ── قوائم الحالات (تبويب واحد بدل 4 بطاقات منفصلة) ── */}
      <div className="rounded-2xl border-2 bg-card shadow-sm overflow-hidden">
        <Tabs value={queueTab} onValueChange={setQueueTab} dir="rtl">
          <div className="border-b border-border/60 bg-muted/20 px-4 pt-4 pb-0">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Inbox className="h-5 w-5 text-primary" />
              <h3 className="text-base font-black">قوائم العمل</h3>
            </div>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-1 bg-transparent p-0">
              <TabsTrigger value="review" className="gap-2 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-t-xl rounded-b-none border border-transparent data-[state=active]:border-border data-[state=active]:border-b-card">
                <Bug className="h-4 w-4" />
                للمراجعة
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-black tabular-nums">
                  {data.waitingReview.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="dev" className="gap-2 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-t-xl rounded-b-none border border-transparent data-[state=active]:border-border data-[state=active]:border-b-card">
                <Wrench className="h-4 w-4" />
                المطورين
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-black tabular-nums">
                  {data.assignedToDevelopers.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="solved" className="gap-2 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-t-xl rounded-b-none border border-transparent data-[state=active]:border-border data-[state=active]:border-b-card">
                <CheckCircle2 className="h-4 w-4" />
                محلولة
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-black tabular-nums">
                  {data.solvedAwaitingClose.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="closed" className="gap-2 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-t-xl rounded-b-none border border-transparent data-[state=active]:border-border data-[state=active]:border-b-card">
                <Archive className="h-4 w-4" />
                مغلقة اليوم
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-black tabular-nums">
                  {data.closedToday.length}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-5">
            <TabsContent value="review" className="mt-0">
              <CaseQueueList
                cases={data.waitingReview}
                emptyText="لا حالات System Bug بانتظار المراجعة — ممتاز!"
                badge={() => <StatusBadge status="IN_PROGRESS" label="System Bug" />}
              />
            </TabsContent>
            <TabsContent value="dev" className="mt-0">
              <CaseQueueList
                cases={data.assignedToDevelopers}
                emptyText="لا حالات معيّنة للمطورين حالياً"
                renderSecondary={(c) =>
                  `${c.assignedDeveloperName ?? "—"} · ${simpleStatusLabel(c.status)}`
                }
              />
            </TabsContent>
            <TabsContent value="solved" className="mt-0">
              <CaseQueueList
                cases={data.solvedAwaitingClose}
                emptyText="لا حالات محلولة بانتظار تأكيدك"
                badge={() => <StatusBadge status="SOLVED" label="محلول" />}
              />
            </TabsContent>
            <TabsContent value="closed" className="mt-0">
              <CaseQueueList
                cases={data.closedToday}
                emptyText="لم تُغلق حالات اليوم بعد"
                renderSecondary={(c) => formatRelativeDate(c.updatedAt)}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* ── تحليلات — صف واحد مدمج ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <WeeklyTrendChart data={data.weeklyTrend} />
        </div>

        {data.topIssueToday && (
          <div className="rounded-2xl border-2 bg-card overflow-hidden shadow-sm flex flex-col">
            <div className="flex items-center gap-3 border-b border-border/60 bg-muted/20 px-5 py-4">
              <div className="rounded-xl bg-amber-500/10 p-2.5">
                <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-black">أكثر مشكلة اليوم</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{data.topIssueToday.label}</p>
              </div>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <p className="text-4xl font-black text-primary tabular-nums">{data.topIssueToday.count}</p>
              <p className="text-sm text-muted-foreground mt-2">حالة اليوم</p>
            </div>
          </div>
        )}

        {data.byTeam.length > 0 && (
          <InsightPanel title="حمل الفرق" subtitle="حالات مفتوحة لكل فريق" icon={UsersRound}>
            <div className="space-y-3">
              {data.byTeam.slice(0, 5).map(({ label, count }) => {
                const maxTeam = data.byTeam[0]?.count ?? 1;
                const pct = Math.round((count / maxTeam) * 100);
                return (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-1 gap-2">
                      <span className="font-bold text-sm truncate">{label}</span>
                      <span className="text-sm font-black text-primary tabular-nums shrink-0">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-brand-gradient rounded-full" style={{ width: `${Math.max(pct, 6)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </InsightPanel>
        )}
      </div>

      {data.byType.length > 0 && (
        <InsightPanel title="توزيع أنواع الحالات" subtitle="نسبة كل نوع" icon={BarChart3}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.byType.map(({ label, count }) => {
              const total = data.byType.reduce((s, t) => s + t.count, 0);
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={label} className="rounded-xl border-2 p-3 bg-muted/10">
                  <div className="flex justify-between items-center gap-2 mb-2">
                    <span className="font-bold text-sm truncate">{label}</span>
                    <span className="text-lg font-black text-primary tabular-nums">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-brand-gradient rounded-full" style={{ width: `${Math.max(pct, 8)}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">{pct}%</p>
                </div>
              );
            })}
          </div>
        </InsightPanel>
      )}

      {/* ── آخر النشاطات ── */}
      <SectionCard
        title="آخر النشاطات"
        count={data.latestActivities.length}
        href="/cases"
        icon={Activity}
        emptyText="لا نشاطات بعد"
      >
        <div className="space-y-2">
          {data.latestActivities.slice(0, 5).map((a) => (
            <ActivityItem
              key={a.id}
              action={a.action}
              details={a.details}
              caseNumber={a.caseNumber}
              actorName={a.actorName}
              createdAt={a.createdAt}
              caseId={a.caseId}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
