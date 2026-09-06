"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  ChevronLeft,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MapPin,
  Layers,
  Users,
  Inbox,
  History,
  Bug,
  Archive,
  Wrench,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PageHero,
  SectionCard,
  EmptyState,
  KpiTile,
} from "@/components/shared/ops-ui";
import { getCases } from "@/lib/services/cases";
import { useUserStore } from "@/stores/user-store";
import {
  CASE_STATUS_LABELS,
  toSimpleCaseStatus,
  type Case,
  type CaseStatus,
} from "@/lib/cases";
import { cn, formatDate, formatRelativeDate } from "@/lib/utils";

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

const STEPS = [
  {
    step: 1,
    icon: Send,
    title: "أرسل البلاغ",
    desc: "من الشريط العلوي أو شاشة «إنشاء بلاغ»",
  },
  {
    step: 2,
    icon: Inbox,
    title: "تصنيف منسق الدعم",
    desc: "System Bug أو إغلاق بسبب تقني",
  },
  {
    step: 3,
    icon: History,
    title: "تابع السجل",
    desc: "من «بلاغاتي» — المسار الكامل لكل حالة",
  },
];

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

function RecentCaseRow({ caseItem }: { caseItem: Case }) {
  return (
    <Link
      href={`/cases/${caseItem.id}`}
      className="group flex flex-col gap-3 rounded-xl border-2 bg-card p-4 transition-all hover:border-primary/35 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-black tabular-nums">
            {caseItem.sourceReportNumber ?? caseItem.number}
          </span>
          {caseItem.affectedSystem && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              {caseItem.affectedSystem}
            </span>
          )}
        </div>
        <p className="font-black text-sm leading-relaxed line-clamp-2 group-hover:text-primary transition-colors">
          {caseItem.title}
        </p>
        <div className="flex flex-wrap gap-3 text-xs font-bold text-muted-foreground">
          {caseItem.governorate && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {caseItem.governorate}
            </span>
          )}
          {caseItem.affectedUsers > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {caseItem.affectedUsers} متأثر
            </span>
          )}
          <span title={formatDate(caseItem.createdAt)}>
            <Clock className="inline h-3.5 w-3.5 me-1 -mt-0.5" />
            {formatRelativeDate(caseItem.createdAt)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <CaseStatusBadge status={caseItem.status} />
        <ChevronLeft className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="content-container max-w-4xl space-y-6 pb-10 animate-fade-in-up">
      <div className="h-36 rounded-2xl skeleton-shimmer" />
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
      <div className="h-56 rounded-2xl skeleton-shimmer" />
      <div className="h-72 rounded-2xl skeleton-shimmer" />
    </div>
  );
}

export function SupervisorDashboardContent() {
  const { currentUser } = useUserStore();
  const userId = currentUser?.id ?? "";
  const userName = currentUser?.name?.split(" ")[0] ?? "";

  const { data: cases, isLoading } = useQuery({
    queryKey: ["my-cases", userId],
    queryFn: () => getCases({ mine: true }),
    enabled: !!userId,
    refetchInterval: 60_000,
  });

  const allCases = cases ?? [];

  const stats = useMemo(() => {
    const open = allCases.filter((c) => c.status === "OPEN").length;
    const inProgress = allCases.filter((c) => {
      const s = toSimpleCaseStatus(c.status);
      return s === "IN_PROGRESS" || s === "SOLVED";
    }).length;
    const closed = allCases.filter((c) => toSimpleCaseStatus(c.status) === "CLOSED").length;
    return { total: allCases.length, open, inProgress, closed };
  }, [allCases]);

  const recentCases = useMemo(
    () =>
      [...allCases]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [allCases]
  );

  const awaitingClassification = useMemo(
    () => allCases.filter((c) => c.status === "OPEN"),
    [allCases]
  );

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const hasCases = allCases.length > 0;
  const hasPending = stats.open > 0;

  return (
    <div dir="rtl" className="content-container max-w-4xl space-y-6 pb-10 text-start">
      <PageHero
        title={userName ? `مرحباً ${userName}` : "لوحة الدعم الفني المراكز"}
        subtitle={
          !hasCases
            ? "لاحظت مشكلة في الميدان؟ أرسل بلاغاً — يصل لمنسق الدعم للتصنيف"
            : hasPending
              ? `${stats.open} ${stats.open === 1 ? "بلاغ" : "بلاغات"} بانتظار تصنيف منسق الدعم`
              : `${stats.total} ${stats.total === 1 ? "بلاغ" : "بلاغات"} — ${stats.inProgress} قيد المعالجة`
        }
        variant={hasPending ? "urgent" : "calm"}
      >
        {hasCases && (
          <Button asChild size="lg" variant="outline" className="font-bold border-2">
            <Link href="/reports/my">
              <ClipboardList className="h-5 w-5" />
              بلاغاتي
            </Link>
          </Button>
        )}
      </PageHero>

      <Link
        href="/knowledge-base"
        className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-yellow-300/70 bg-gradient-to-l from-yellow-500/12 via-card to-amber-500/8 p-5 md:p-6 shadow-md hover:shadow-lg transition-all"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 text-white shadow-lg">
          <Lightbulb className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-xl font-black text-amber-900 dark:text-amber-100">الحلول الميدانية</p>
          <p className="text-sm text-muted-foreground mt-1">
            مزامنة، GPS، MDM، وغيرها — حلول جاهزة قبل إرسال بلاغ
          </p>
        </div>
        <span className="rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-black text-white shrink-0">
          تصفّح الحلول
        </span>
      </Link>

      {hasPending && (
        <Link
          href="/reports/my"
          className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-sky-300/70 bg-gradient-to-l from-sky-500/12 via-card to-cyan-500/8 p-5 md:p-6 shadow-md hover:shadow-lg transition-all"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-lg">
            <Clock className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-xl font-black text-sky-900 dark:text-sky-100">
              {stats.open} بلاغ بانتظار التصنيف
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              منسق الدعم يراجع بلاغك — System Bug يُصعَّد، وغير ذلك يُغلق
            </p>
          </div>
          <span className="rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-black text-white shrink-0">
            متابعة البلاغات
          </span>
        </Link>
      )}

      {hasCases && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <KpiTile
            label="إجمالي البلاغات"
            value={stats.total}
            href="/reports/my"
            icon={ClipboardList}
            accent="primary"
          />
          <KpiTile
            label="بانتظار التصنيف"
            value={stats.open}
            href="/reports/my"
            icon={Clock}
            accent="sky"
            urgent={stats.open > 0}
          />
          <KpiTile
            label="قيد المعالجة"
            value={stats.inProgress}
            href="/reports/my"
            icon={Wrench}
            accent="emerald"
          />
          <KpiTile
            label="مغلقة"
            value={stats.closed}
            href="/reports/my"
            icon={XCircle}
            accent="slate"
          />
        </div>
      )}

      <div className="rounded-2xl border-2 bg-card p-5 md:p-6 shadow-sm">
        <h3 className="font-black mb-4 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          كيف يعمل؟
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {STEPS.map(({ step, icon: Icon, title, desc }) => (
            <div
              key={step}
              className="rounded-xl border-2 bg-muted/15 p-4 text-center sm:text-start"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary mb-2">
                <Icon className="h-4 w-4" />
              </div>
              <p className="font-black text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {!hasCases ? (
        <EmptyState
          icon={Send}
          title="ابدأ الآن"
          description="لم ترسل أي بلاغات بعد — استخدم «إنشاء بلاغ» من الشريط العلوي أو القائمة الجانبية."
        />
      ) : (
        <>
          {awaitingClassification.length > 0 && (
            <SectionCard
              title="بانتظار تصنيف منسق الدعم"
              count={awaitingClassification.length}
              href="/reports/my"
              icon={Inbox}
            >
              {awaitingClassification.slice(0, 4).map((c) => (
                <RecentCaseRow key={c.id} caseItem={c} />
              ))}
            </SectionCard>
          )}

          <SectionCard
            title="آخر البلاغات"
            count={allCases.length}
            href="/reports/my"
            icon={ClipboardList}
            emptyText="لا توجد بلاغات"
          >
            {recentCases.map((c) => (
              <RecentCaseRow key={c.id} caseItem={c} />
            ))}
            {allCases.length > 6 && (
              <Button asChild variant="outline" size="lg" className="w-full mt-2 font-bold">
                <Link href="/reports/my">
                  عرض الكل ({allCases.length})
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </SectionCard>
        </>
      )}

      <div className="rounded-2xl border-2 bg-card p-5 md:p-6 shadow-sm">
        <h3 className="font-black mb-3 flex items-center gap-2">
          <Bug className="h-5 w-5 text-primary" />
          ماذا يحدث لبلاغك؟
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border-2 border-primary/25 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="font-black text-sm">System Bug</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              عطل في التطبيق — يُصعَّد للسوبر أدمن ثم يُسند لمطور للمعالجة
            </p>
          </div>
          <div className="rounded-xl border-2 p-4 bg-muted/15">
            <div className="flex items-center gap-2 mb-2">
              <Archive className="h-5 w-5 text-muted-foreground" />
              <span className="font-black text-sm">ليست مشكلة في النظام</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              شبكة، MDM، تدريب، خطأ مستخدم... — يُغلق بسبب تقني مع توضيح
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-dashed bg-muted/15 px-5 py-4 text-sm text-muted-foreground leading-relaxed">
        <p className="font-black text-foreground mb-1">نصيحة للميدان</p>
        <p>
          كلما كان الوصف أوضح (ماذا حدث، أين، متى، كم باحثاً تأثر)، كان تصنيف البلاغ ومعالجته
          أسرع.
        </p>
      </div>
    </div>
  );
}
