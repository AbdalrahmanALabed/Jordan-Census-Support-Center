"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Bug, Wrench, Rocket, CheckCircle2, Archive, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  KpiTile,
  PageHero,
  SectionCard,
  QuickRow,
  StatusBadge,
} from "@/components/shared/ops-ui";
import { getDeveloperDashboard } from "@/lib/services/attention-dashboard";
import { simpleStatusLabel, toSimpleCaseStatus } from "@/lib/cases";
import { formatRelativeDate } from "@/lib/utils";
import { getSpecialtyLabel } from "@/lib/developer-specialties";
import { useUserStore } from "@/stores/user-store";
import { PRIORITY_LABELS } from "@/lib/types";

export function DeveloperDashboardContent() {
  const { currentUser } = useUserStore();
  const devId = currentUser?.id ?? "";
  const devName = currentUser?.name ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["developer-dashboard", devId],
    queryFn: () => getDeveloperDashboard(devId, devName),
    enabled: Boolean(devId),
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalAttention = data.stats.assigned + data.stats.deployment;

  return (
    <div className="content-container space-y-8">
      <PageHero
        title="أعطالي"
        subtitle={
          totalAttention === 0
            ? `✓ لا أعطال معلّقة — ${getSpecialtyLabel({ role: currentUser?.role ?? "DEVELOPER", team: currentUser?.team ?? undefined })}`
            : `${totalAttention} عطل يحتاج عملك · ${getSpecialtyLabel({ role: currentUser?.role ?? "DEVELOPER", team: currentUser?.team ?? undefined })}`
        }
        variant={totalAttention > 0 ? "urgent" : "calm"}
      >
        <Button asChild size="lg">
          <Link href="/cases">
            <Bug className="h-5 w-5" />
            كل أعطالي
          </Link>
        </Button>
      </PageHero>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="قيد المعالجة"
          value={data.stats.assigned}
          href="/cases?simpleStatus=IN_PROGRESS"
          icon={Wrench}
          accent="amber"
          urgent
        />
        <KpiTile
          label="بانتظار نشر"
          value={data.stats.deployment}
          href="/cases?simpleStatus=IN_PROGRESS"
          icon={Rocket}
          accent="sky"
        />
        <KpiTile
          label="بانتظار المدير"
          value={data.stats.solvedPending}
          href="/cases?simpleStatus=SOLVED"
          icon={CheckCircle2}
          accent="emerald"
        />
        <KpiTile
          label="أُغلقت اليوم"
          value={data.stats.solvedToday}
          href="/cases?simpleStatus=CLOSED"
          icon={Archive}
          accent="slate"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="قيد المعالجة"
          count={data.assignedToMe.length}
          href="/cases?simpleStatus=IN_PROGRESS"
          icon={Wrench}
          emptyText="لا أعطال معلّقة"
        >
          {data.assignedToMe.slice(0, 5).map((c) => (
            <QuickRow
              key={c.id}
              href={`/cases/${c.id}`}
              primary={c.title}
              secondary={`${c.number} · ${PRIORITY_LABELS[c.priority]}`}
              badge={
                <StatusBadge
                  status={toSimpleCaseStatus(c.status)}
                  label={simpleStatusLabel(c.status)}
                />
              }
            />
          ))}
        </SectionCard>

        <SectionCard
          title="آخر النشاطات"
          count={data.latestActivities.length}
          icon={Clock}
          emptyText="لا نشاطات"
        >
          {data.latestActivities.slice(0, 5).map((a) => (
            <Link
              key={a.id}
              href={`/cases/${a.caseId}`}
              className="block rounded-xl border bg-background p-4 hover:bg-accent/40"
            >
              <p className="font-bold">{a.action}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatRelativeDate(a.createdAt)}
              </p>
            </Link>
          ))}
        </SectionCard>
      </div>
    </div>
  );
}
