"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Inbox,
  Bug,
  Archive,
  ChevronLeft,
  ClipboardCheck,
  ArrowUpRight,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  KpiTile,
  PageHero,
  SectionCard,
  QuickRow,
  StatusBadge,
} from "@/components/shared/ops-ui";
import { getCoordinatorDashboard } from "@/lib/services/attention-dashboard";
import { simpleStatusLabel, toSimpleCaseStatus } from "@/lib/cases";
import { useEffectiveUser } from "@/hooks/use-effective-user";

export function CoordinatorDashboardContent() {
  const user = useEffectiveUser();
  const firstName = user?.name?.split(" ")[0] ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["coordinator-dashboard"],
    queryFn: getCoordinatorDashboard,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="content-container space-y-6 pb-8 animate-fade-in-up">
        <div className="h-36 rounded-2xl skeleton-shimmer" />
        <div className="grid gap-3 grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl skeleton-shimmer" />
          ))}
        </div>
        <div className="h-64 rounded-2xl skeleton-shimmer" />
      </div>
    );
  }

  const { stats } = data;

  return (
    <div dir="rtl" className="content-container space-y-6 pb-8 text-start">
      <PageHero
        title={firstName ? `مرحباً ${firstName}` : "منسق الدعم"}
        subtitle={
          stats.pending === 0
            ? "لا بلاغات بانتظار التصنيف — ممتاز!"
            : `${stats.pending} ${stats.pending === 1 ? "بلاغ" : "بلاغات"} بانتظار تصنيفك`
        }
        variant={stats.pending > 0 ? "urgent" : "calm"}
      >
        <Button asChild size="lg">
          <Link href="/cases?status=OPEN">
            <ClipboardCheck className="h-5 w-5" />
            تصنيف البلاغات
          </Link>
        </Button>
      </PageHero>

      <Link
        href="/knowledge-base"
        className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-yellow-300/70 bg-gradient-to-l from-yellow-500/12 via-card to-amber-500/8 p-5 md:p-6 shadow-md hover:shadow-lg transition-all"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 text-white shadow-lg">
          <Lightbulb className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-xl font-black text-amber-900 dark:text-amber-100">الحلول</p>
          <p className="text-sm text-muted-foreground mt-1">
            مرجع سريع للمشاكل الشائعة — للتصنيف أو مساعدة دعم المراكز
          </p>
        </div>
        <span className="rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-black text-white shrink-0">
          فتح الحلول
        </span>
      </Link>

      {stats.pending > 0 && (
        <Link
          href="/cases?status=OPEN"
          className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-sky-300/70 bg-gradient-to-l from-sky-500/12 via-card to-cyan-500/8 p-5 md:p-6 shadow-md hover:shadow-lg transition-all"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-lg">
            <Inbox className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-xl font-black text-sky-900 dark:text-sky-100">
              {stats.pending} بلاغ من دعم المراكز
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              صنّف: System Bug → السوبر أدمن · غير ذلك → إغلاق
            </p>
          </div>
          <span className="rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-black text-white shrink-0">
            ابدأ التصنيف
          </span>
        </Link>
      )}

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        <KpiTile
          label="بانتظار التصنيف"
          value={stats.pending}
          href="/cases?status=OPEN"
          icon={Inbox}
          accent="sky"
          urgent={stats.pending > 0}
        />
        <KpiTile
          label="صُعدت اليوم (System Bug)"
          value={stats.escalatedToday}
          href="/cases?status=AWAITING_APPROVAL"
          icon={ArrowUpRight}
          accent="amber"
        />
        <KpiTile
          label="أُغلقت اليوم"
          value={stats.closedToday}
          href="/cases?status=CLOSED"
          icon={Archive}
          accent="slate"
        />
      </div>

      <div className="rounded-2xl border-2 bg-card p-5 md:p-6 shadow-sm">
        <h3 className="font-black mb-3 flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          كيف يعمل التصنيف؟
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border-2 border-primary/25 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bug className="h-5 w-5 text-primary" />
              <span className="font-black text-sm">System Bug</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              عطل في التطبيق أو النظام — يُرسل للسوبر أدمن للمراجعة والإسناد للمطور
            </p>
          </div>
          <div className="rounded-xl border-2 p-4 bg-muted/15">
            <div className="flex items-center gap-2 mb-2">
              <Archive className="h-5 w-5 text-muted-foreground" />
              <span className="font-black text-sm">ليست مشكلة في النظام</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              MDM، شبكة، SIM، GPS، تدريب، خطأ مستخدم... — اختر السبب وأغلق الحالة
            </p>
          </div>
        </div>
      </div>

      <SectionCard
        title="بلاغات بانتظار التصنيف"
        count={data.pendingClassification.length}
        href="/cases?status=OPEN"
        icon={Inbox}
        emptyText="لا بلاغات جديدة — كل شيء مُصنَّف!"
      >
        {data.pendingClassification.slice(0, 8).map((c) => (
          <QuickRow
            key={c.id}
            href={`/cases/${c.id}`}
            primary={c.title}
            secondary={`${c.number} · ${c.affectedSystem}`}
            badge={
              <StatusBadge
                status={toSimpleCaseStatus(c.status)}
                label={simpleStatusLabel(c.status)}
              />
            }
          />
        ))}
        {data.pendingClassification.length > 8 && (
          <Button asChild variant="outline" className="w-full mt-2 font-bold">
            <Link href="/cases?status=OPEN">
              عرض الكل ({data.pendingClassification.length})
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </SectionCard>
    </div>
  );
}
