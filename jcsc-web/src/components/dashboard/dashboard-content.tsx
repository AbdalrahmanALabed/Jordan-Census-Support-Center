"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Ticket,
  AlertTriangle,
  TrendingUp,
  Bell,
  BarChart3,
  Flame,
  ArrowUp,
  Minus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  KpiTile,
  SectionCard,
  QuickRow,
  EmptyState,
} from "@/components/shared/ops-ui";
import { PriorityBadge, StatusBadge } from "@/components/shared/status-badges";
import {
  getDashboardStats,
  getRecentTickets,
  getNotifications,
} from "@/lib/services";
import { formatRelativeDate, cn } from "@/lib/utils";

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 h-72 rounded-2xl skeleton-shimmer" />
        <div className="h-72 rounded-2xl skeleton-shimmer" />
      </div>
    </div>
  );
}

export function DashboardContent() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });
  const { data: recentTickets } = useQuery({
    queryKey: ["recent-tickets"],
    queryFn: () => getRecentTickets(5),
  });
  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });

  if (statsLoading || !stats) return <DashboardSkeleton />;

  const topCategories = stats.topCategories ?? stats.topIssues ?? [];
  const maxCategoryCount = Math.max(...topCategories.map((c) => c.count), 1);
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div dir="rtl" className="space-y-6 text-start">
      {/* Priority KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiTile
          label="مسائل مفتوحة"
          value={stats.openIssues ?? stats.openTickets ?? 0}
          href="/issues"
          icon={Ticket}
          accent="primary"
        />
        <KpiTile
          label="حرجة"
          value={stats.critical}
          href="/issues"
          icon={Flame}
          accent="amber"
          urgent={stats.critical > 0}
        />
        <KpiTile
          label="عالية"
          value={stats.high}
          href="/issues"
          icon={AlertTriangle}
          accent="amber"
        />
        <KpiTile
          label="متوسطة"
          value={stats.medium}
          href="/issues"
          icon={Minus}
          accent="sky"
        />
        <KpiTile
          label="منخفضة"
          value={stats.low}
          href="/issues"
          icon={ArrowUp}
          accent="slate"
        />
        <KpiTile
          label="مشاكل اليوم"
          value={stats.todayIssues}
          href="/issues"
          icon={TrendingUp}
          accent="emerald"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Weekly chart */}
        <div className="lg:col-span-2 rounded-2xl border-2 bg-card overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 border-b border-border/60 bg-muted/20 px-5 py-4">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-black">المشاكل خلال الأسبوع</h3>
              <p className="text-xs text-muted-foreground mt-0.5">عدد البلاغات اليومية</p>
            </div>
          </div>
          <div className="p-5 md:p-6">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "2px solid hsl(var(--border))",
                    borderRadius: "12px",
                    direction: "rtl",
                    textAlign: "right",
                  }}
                  formatter={(value: number) => [`${value} حالة`, "العدد"]}
                  labelFormatter={(label) => `يوم ${label}`}
                />
                <Bar
                  dataKey="count"
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(160 84% 39%)" />
                    <stop offset="100%" stopColor="hsl(180 70% 45%)" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top categories */}
        <div className="rounded-2xl border-2 bg-card overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 border-b border-border/60 bg-muted/20 px-5 py-4">
            <div className="rounded-xl bg-amber-500/10 p-2.5">
              <Flame className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-black">أكثر المشاكل تكراراً</h3>
              <p className="text-xs text-muted-foreground mt-0.5">حسب النوع</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">لا بيانات بعد</p>
            ) : (
              topCategories.map((issue, i) => {
                const pct = Math.round((issue.count / maxCategoryCount) * 100);
                return (
                  <div key={issue.type} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black",
                            i === 0
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {i + 1}
                        </span>
                        <span className="text-sm font-bold truncate">{issue.type}</span>
                      </div>
                      <Badge variant="secondary" className="font-black tabular-nums shrink-0">
                        {issue.count}
                      </Badge>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-brand-gradient rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 6)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="آخر التذاكر"
          count={recentTickets?.length ?? 0}
          href="/issues"
          icon={Ticket}
          emptyText="لا تذاكر حديثة"
        >
          {recentTickets?.map((ticket) => (
            <QuickRow
              key={ticket.id}
              href={`/issues/${ticket.id}`}
              primary={ticket.title}
              secondary={`${ticket.number} · ${formatRelativeDate(ticket.updatedAt)}`}
              badge={
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </div>
              }
            />
          ))}
        </SectionCard>

        <SectionCard
          title="الإشعارات"
          count={unreadCount}
          href="/notifications"
          icon={Bell}
          emptyText="لا إشعارات جديدة"
        >
          {notifications?.length === 0 ? null : (
            notifications?.slice(0, 5).map((n) => (
              <Link
                key={n.id}
                href="/notifications"
                className={cn(
                  "block rounded-xl border-2 p-4 transition-all hover:border-primary/25 hover:shadow-sm",
                  !n.isRead
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-card/80"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {formatRelativeDate(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary mt-1" />
                  )}
                </div>
              </Link>
            ))
          )}
          {(notifications?.length ?? 0) === 0 && (
            <EmptyState
              icon={Bell}
              title="لا إشعارات"
              description="ستظهر هنا عند وصول تحديثات جديدة"
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
