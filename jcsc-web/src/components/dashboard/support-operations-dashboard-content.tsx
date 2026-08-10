"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Inbox,
  Clock,
  Play,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Layers,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PageHero,
  KpiTile,
  SectionCard,
  QuickRow,
  AlertBanner,
} from "@/components/shared/ops-ui";
import { PriorityBadge, IssueStatusBadge } from "@/components/shared/status-badges";
import { getOperationsStats, getRecentIssues } from "@/lib/services/issues";
import { LIFECYCLE_PHASES } from "@/lib/operations/lifecycle";
import { ISSUE_STATUS_LABELS } from "@/lib/types";
import { formatRelativeDate, cn } from "@/lib/utils";

const PIPELINE_CONFIG = [
  { key: "received", statKey: "received" as const, label: ISSUE_STATUS_LABELS.RECEIVED, icon: Inbox, accent: "sky" as const, href: "/issues" },
  { key: "assigned", statKey: "assigned" as const, label: ISSUE_STATUS_LABELS.ASSIGNED, icon: Clock, accent: "amber" as const, href: "/issues" },
  { key: "inProgress", statKey: "inProgress" as const, label: ISSUE_STATUS_LABELS.IN_PROGRESS, icon: Play, accent: "primary" as const, href: "/issues" },
  { key: "needInfo", statKey: "needInfo" as const, label: ISSUE_STATUS_LABELS.NEED_INFO, icon: AlertTriangle, accent: "amber" as const, href: "/issues" },
  { key: "waitingDeployment", statKey: "waitingDeployment" as const, label: ISSUE_STATUS_LABELS.WAITING_DEPLOYMENT, icon: Layers, accent: "sky" as const, href: "/issues" },
  { key: "readyForTesting", statKey: "readyForTesting" as const, label: ISSUE_STATUS_LABELS.READY_FOR_TESTING, icon: CheckCircle, accent: "emerald" as const, href: "/issues" },
  { key: "returned", statKey: "returned" as const, label: ISSUE_STATUS_LABELS.RETURNED, icon: RotateCcw, accent: "amber" as const, href: "/issues" },
  { key: "closed", statKey: "closed" as const, label: ISSUE_STATUS_LABELS.CLOSED, icon: CheckCircle, accent: "slate" as const, href: "/issues" },
] as const;

function DashboardSkeleton() {
  return (
    <div className="content-container space-y-6 pb-8 animate-fade-in-up">
      <div className="h-36 rounded-2xl skeleton-shimmer" />
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
      <div className="h-64 rounded-2xl skeleton-shimmer" />
    </div>
  );
}

export function SupportOperationsDashboardContent() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["operations-stats"],
    queryFn: getOperationsStats,
  });

  const { data: recentIssues } = useQuery({
    queryKey: ["recent-issues"],
    queryFn: () => getRecentIssues(8),
  });

  if (statsLoading || !stats) return <DashboardSkeleton />;

  const totalActive =
    stats.received +
    stats.assigned +
    stats.inProgress +
    stats.needInfo +
    stats.waitingDeployment +
    stats.readyForTesting;

  return (
    <div dir="rtl" className="content-container space-y-6 pb-10 text-start">
      <PageHero
        title="لوحة عمليات الدعم"
        subtitle={
          stats.slaBreached > 0
            ? `${stats.slaBreached} مسألة تجاوزت SLA — تحتاج متابعة فورية`
            : `${totalActive} مسألة نشطة في خط الإنتاج`
        }
        variant={stats.slaBreached > 0 ? "urgent" : "default"}
      >
        <Button asChild size="lg">
          <Link href="/issues">
            <Inbox className="h-5 w-5" />
            كل المسائل
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/queues">
            <Layers className="h-5 w-5" />
            طوابير الفرق
          </Link>
        </Button>
      </PageHero>

      {stats.slaBreached > 0 && (
        <AlertBanner
          icon={Flame}
          tone="red"
          title={`${stats.slaBreached} مسألة تجاوزت SLA`}
          description="هذه المسائل تحتاج متابعة فورية قبل تجاوز الموعد النهائي"
          action={
            <Button asChild size="sm" variant="destructive">
              <Link href="/issues">عرض المسائل</Link>
            </Button>
          }
        />
      )}

      {/* Lifecycle overview */}
      <div className="rounded-2xl border-2 bg-card overflow-hidden shadow-sm">
        <div className="border-b border-border/60 bg-muted/20 px-5 py-4">
          <h3 className="text-base font-black">دورة عمليات الدعم</h3>
          <p className="text-xs text-muted-foreground mt-0.5">من الاستلام إلى الإغلاق</p>
        </div>
        <div className="p-5 md:p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LIFECYCLE_PHASES.map((phase, i) => (
              <div
                key={phase.phase}
                className="relative rounded-xl border-2 bg-gradient-to-br from-muted/20 to-transparent p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-black">
                    {i + 1}
                  </span>
                  <p className="text-sm font-black text-primary">{phase.label}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{phase.description}</p>
                <div className="flex flex-wrap gap-1">
                  {phase.steps.map((s) => (
                    <span
                      key={s.key}
                      className="rounded-md border bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
                    >
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline KPIs — active */}
      <div className="space-y-3">
        <div className="text-start">
          <h3 className="text-sm font-black">مسار المعالجة — نشط</h3>
          <p className="text-xs text-muted-foreground mt-0.5">المسائل في مراحل العمل</p>
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {PIPELINE_CONFIG.slice(0, 6).map(({ key, statKey, label, icon, accent, href }) => (
            <KpiTile
              key={key}
              label={label}
              value={stats[statKey]}
              href={href}
              icon={icon}
              accent={accent}
              urgent={statKey === "received" && stats.received > 0}
            />
          ))}
        </div>
      </div>

      {/* Pipeline KPIs — closed / returned */}
      <div className="space-y-3">
        <div className="text-start">
          <h3 className="text-sm font-black">مؤشرات إضافية</h3>
          <p className="text-xs text-muted-foreground mt-0.5">مُرتجعة، مغلقة، وSLA</p>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {PIPELINE_CONFIG.slice(6).map(({ key, statKey, label, icon, accent, href }) => (
            <KpiTile key={key} label={label} value={stats[statKey]} href={href} icon={icon} accent={accent} />
          ))}
          <KpiTile
            label="تجاوز SLA"
            value={stats.slaBreached}
            href="/issues"
            icon={Flame}
            accent="amber"
            urgent={stats.slaBreached > 0}
          />
          <KpiTile
            label="إجمالي نشط"
            value={totalActive}
            href="/issues"
            icon={Layers}
            accent="primary"
          />
        </div>
      </div>

      <SectionCard
        title="آخر المسائل النشطة"
        count={recentIssues?.length ?? 0}
        href="/issues"
        icon={RotateCcw}
        emptyText="لا مسائل نشطة حالياً"
      >
        {recentIssues?.map((issue) => (
          <QuickRow
            key={issue.id}
            href={`/issues/${issue.id}`}
            primary={issue.title}
            secondary={`${issue.number} · ${issue.team} · ${formatRelativeDate(issue.updatedAt)}`}
            badge={
              <div className="flex flex-col items-end gap-1 shrink-0">
                <PriorityBadge priority={issue.priority} />
                <IssueStatusBadge status={issue.status} />
              </div>
            }
          />
        ))}
      </SectionCard>

      {/* Weekly trend mini chart area */}
      {stats.chartData && stats.chartData.length > 0 && (
        <div className="rounded-2xl border-2 bg-card p-5 md:p-6 shadow-sm">
          <h3 className="font-black mb-4">نشاط الأسبوع</h3>
          <div className="flex items-end gap-2 h-24">
            {stats.chartData.map((d, i) => {
              const max = Math.max(...stats.chartData.map((x) => x.count), 1);
              const h = Math.round((d.count / max) * 100);
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <span className="text-xs font-black text-primary tabular-nums">{d.count}</span>
                  <div
                    className={cn(
                      "w-full rounded-t-lg bg-brand-gradient transition-all",
                      i === stats.chartData.length - 1 ? "opacity-100" : "opacity-70"
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
      )}
    </div>
  );
}
