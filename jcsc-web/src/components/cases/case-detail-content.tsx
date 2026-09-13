"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  User,
  Clock,
  MapPin,
  Monitor,
  Users,
  Calendar,
  MessageSquare,
  History,
  FileText,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Paperclip,
  ExternalLink,
} from "lucide-react";
import { getSpecialtyLabelFromTeam } from "@/lib/developer-specialties";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CaseActionsPanel } from "@/components/cases/case-actions-panel";
import { CaseLifecycleTimeline } from "@/components/cases/case-lifecycle-timeline";
import { SuperAdminReviewPanel } from "@/components/shared/super-admin-review-panel";
import { CoordinatorReviewPanel } from "@/components/shared/coordinator-review-panel";
import { CoordinatorTransferPanel } from "@/components/shared/coordinator-transfer-panel";
import { isLeadTransferRole } from "@/lib/coordinator-transfer";
import { CaseClassifyAssignPanel } from "@/components/cases/case-classify-assign-panel";
import { CaseCommentsSection } from "@/components/cases/case-comments-section";
import { CaseProcessingLockBanner } from "@/components/cases/case-processing-lock-banner";
import { useCaseProcessingLock } from "@/hooks/use-case-processing-lock";
import {
  CaseWorkflowProgress,
  StatusBadge,
  STATUS_STYLES,
} from "@/components/shared/ops-ui";
import {
  getCaseById,
  getCaseAttachments,
  getCaseComments,
  getCaseTimeline,
} from "@/lib/services/cases";
import {
  CASE_TYPE_LABELS,
  CASE_STATUS_LABELS,
  caseNeedsCoordinatorReview,
  caseNeedsSuperAdminReview,
  caseInCoordinatorQueue,
  caseNeedsClassifyAssign,
  simpleStatusLabel,
  toSimpleCaseStatus,
} from "@/lib/cases";
import { AttachmentsGrid } from "@/components/shared/attachment-card";
import { PRIORITY_LABELS } from "@/lib/types";
import { SEVERITY_LABELS } from "@/lib/case-classification";
import { useUserStore } from "@/stores/user-store";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { CaseDetailMobileBar } from "@/components/cases/case-detail-mobile-bar";
import { isSupervisorRole } from "@/lib/reports";
import { canManageCases, isDeveloperRole, isSupportCoordinatorRole, isSuperAdminRole } from "@/lib/permissions";
import { getSystemBadgeLabel } from "@/lib/case-filters";
import { cn, formatDate, formatRelativeDate } from "@/lib/utils";
import type { CaseSeverity } from "@/lib/cases/types";
import type { IssuePriority } from "@/lib/types";

const PRIORITY_STYLES: Record<IssuePriority, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  LOW: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700",
};

const SEVERITY_STYLES: Record<CaseSeverity, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  LOW: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
};

function MetaChip({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border bg-muted/30 p-4 transition-colors hover:bg-muted/50",
        className
      )}
    >
      <div className="rounded-lg bg-primary/10 p-2 shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-muted-foreground">{label}</p>
        <p className="font-bold mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="content-container space-y-6 animate-pulse">
      <div className="h-10 w-36 rounded-lg bg-muted" />
      <div className="rounded-2xl border-2 p-8 space-y-4">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-8 w-3/4 bg-muted rounded" />
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-muted rounded-full" />
          <div className="h-8 w-24 bg-muted rounded-full" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-64 rounded-2xl bg-muted" />
          <div className="h-48 rounded-2xl bg-muted" />
        </div>
        <div className="h-80 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

export function CaseDetailContent({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();
  const user = useEffectiveUser();
  const { hasPermission } = useUserStore();
  const isSupervisor = isSupervisorRole(user?.role);
  const isDev = isDeveloperRole(user?.role ?? "");
  const isCoordinator = isSupportCoordinatorRole(user?.role);
  const isSuperAdmin = isSuperAdminRole(user?.role);
  const canTransferCoordinator = isLeadTransferRole(user?.role);
  const canReviewCases =
    !isSupervisor &&
    !isCoordinator &&
    (canManageCases(user) ||
      hasPermission("classify_reports") ||
      hasPermission("manage_issues") ||
      hasPermission("close_issues"));

  const invalidateCase = () => {
    queryClient.invalidateQueries({ queryKey: ["case", caseId] });
    queryClient.invalidateQueries({ queryKey: ["case-timeline", caseId] });
    queryClient.invalidateQueries({ queryKey: ["cases"] });
    queryClient.invalidateQueries({ queryKey: ["operations-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["coordinator-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
  };

  const { data: caseItem, isLoading } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => getCaseById(caseId),
  });
  const { data: attachments } = useQuery({
    queryKey: ["case-attachments", caseId],
    queryFn: () => getCaseAttachments(caseId),
  });
  const { data: comments } = useQuery({
    queryKey: ["case-comments", caseId],
    queryFn: () => getCaseComments(caseId),
  });
  const { data: timeline } = useQuery({
    queryKey: ["case-timeline", caseId],
    queryFn: () => getCaseTimeline(caseId),
  });

  const needsProcessingLock =
    canReviewCases ||
    (isCoordinator && caseItem != null && caseNeedsCoordinatorReview(caseItem.status)) ||
    canTransferCoordinator;
  const processingLock = useCaseProcessingLock(caseId, Boolean(caseItem && needsProcessingLock));

  if (isLoading) return <DetailSkeleton />;

  if (!caseItem) {
    return (
      <div className="content-container flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-lg font-black text-muted-foreground">
          الحالة غير موجودة أو لا تملك صلاحية عرضها
        </p>
        <Button asChild variant="outline" className="font-bold">
          <Link href="/cases">
            <ArrowRight className="h-4 w-4 me-2" />
            العودة للحالات
          </Link>
        </Button>
      </div>
    );
  }

  const c = caseItem;
  const simple = toSimpleCaseStatus(c.status);
  const statusStyle = STATUS_STYLES[simple];
  const systemBadge = getSystemBadgeLabel(c.number);
  const isAssignedDev =
    isDev &&
    (c.assignedDeveloperId === user?.id || c.assignedDeveloperName === user?.name);
  const isReadOnlyDev = isDev && !isAssignedDev;
  const isCoordinatorReadOnly =
    (isCoordinator || canTransferCoordinator) &&
    !caseNeedsCoordinatorReview(c.status);
  const needsReview =
    (isCoordinator && caseNeedsCoordinatorReview(c.status)) ||
    (canReviewCases &&
      (caseNeedsSuperAdminReview(c.status) || caseNeedsClassifyAssign(c.status)));
  const assigneeLabel = getSpecialtyLabelFromTeam(
    c.assignedTeam ?? c.assignedDeveloperTeam
  );

  return (
    <div className="content-container space-y-5 pb-24 lg:pb-8">
      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" className="gap-2 text-base font-bold -ms-2">
          <Link href="/cases">
            <ArrowRight className="h-5 w-5" />
            العودة للحالات
          </Link>
        </Button>
        <p className="text-xs font-bold text-muted-foreground tracking-wide">
          آخر تحديث · {formatRelativeDate(c.updatedAt)}
        </p>
      </div>

      {needsReview && <CaseWorkflowProgress status={c.status} />}

      {needsProcessingLock && (
        <CaseProcessingLockBanner
          loading={processingLock.loading}
          blockedByOther={processingLock.blockedByOther}
          lockedByUserName={processingLock.lockedByUserName}
        />
      )}

      {canTransferCoordinator && c.status === "OPEN" && (
        <CoordinatorTransferPanel caseItem={c} onSuccess={invalidateCase} />
      )}

      {isCoordinator && caseNeedsCoordinatorReview(c.status) && (
        <CoordinatorReviewPanel
          caseItem={c}
          canProcess={processingLock.canProcess}
          onSuccess={invalidateCase}
        />
      )}

      {isSuperAdmin && caseNeedsSuperAdminReview(c.status) && (
        <SuperAdminReviewPanel
          caseItem={c}
          canProcess={processingLock.canProcess}
          onSuccess={invalidateCase}
        />
      )}

      {canReviewCases && caseNeedsClassifyAssign(c.status) && (
        <CaseClassifyAssignPanel
          caseItem={c}
          canProcess={processingLock.canProcess}
          onSuccess={invalidateCase}
        />
      )}

      {isSuperAdmin && caseInCoordinatorQueue(c.status) && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-indigo-300/40 bg-indigo-50/50 dark:bg-indigo-950/20 px-5 py-4">
          <Eye className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-indigo-800 dark:text-indigo-300">بانتظار منسق الدعم</p>
            <p className="text-sm text-muted-foreground mt-1">
              هذه الحالة في قائمة تصنيف منسق الدعم — للعرض فقط حتى يُصنّف ويُصعَّد كـ System Bug
            </p>
          </div>
        </div>
      )}

      {isCoordinatorReadOnly && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-sky-300/40 bg-sky-50/50 dark:bg-sky-950/20 px-5 py-4">
          <Eye className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-sky-800 dark:text-sky-300">معاينة فقط</p>
            <p className="text-sm text-muted-foreground mt-1">
              هذه الحالة {c.status === "AWAITING_APPROVAL" ? "مُصعّدة للسوبر أدمن" : "مغلقة أو قيد معالجة"} — يمكنك
              الاطلاع والتعليق دون تعديل الحالة
            </p>
          </div>
        </div>
      )}

      {isReadOnlyDev && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-muted/20 px-5 py-4">
          <Eye className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-muted-foreground">معاينة فقط</p>
            <p className="text-sm text-muted-foreground mt-1">
              مسندة إلى{" "}
              <span className="font-bold text-foreground">
                {c.assignedDeveloperName ?? "مطور آخر"}
              </span>{" "}
              — يمكنك الاطلاع والتعليق دون تعديل الحالة
            </p>
          </div>
        </div>
      )}

      {/* Hero header */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 bg-card shadow-sm",
          needsReview && "ring-2 ring-sky-400/40",
          statusStyle.border
        )}
      >
        <div className={cn("absolute inset-y-0 start-0 w-1.5", statusStyle.dot)} />
        <div
          className={cn(
            "absolute inset-0 opacity-40 pointer-events-none bg-gradient-to-bl from-transparent via-transparent",
            simple === "NEW" && "to-sky-500/10",
            simple === "IN_PROGRESS" && "to-amber-500/10",
            simple === "SOLVED" && "to-emerald-500/10",
            simple === "CLOSED" && "to-slate-500/5"
          )}
        />

        <div className="relative p-6 md:p-8 ps-7 md:ps-9">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-sm font-bold text-muted-foreground tracking-wider">
              {c.number}
            </span>
            {systemBadge && (
              <span className="rounded-md bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-black uppercase">
                {systemBadge}
              </span>
            )}
            <span className="rounded-lg bg-muted px-2.5 py-0.5 text-xs font-bold">
              {CASE_TYPE_LABELS[c.caseType]}
            </span>
            {needsReview && !isCoordinatorReadOnly && (
              <span className="rounded-full bg-sky-500 px-2.5 py-0.5 text-[10px] font-black text-white">
                {isCoordinator ? "بانتظار تصنيفك" : "يحتاج مراجعة"}
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-black leading-tight max-w-3xl">
            {c.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2 mt-5">
            <StatusBadge
              status={simple}
              label={CASE_STATUS_LABELS[c.status] ?? simpleStatusLabel(c.status)}
            />
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold",
                PRIORITY_STYLES[c.priority]
              )}
            >
              الأولوية: {PRIORITY_LABELS[c.priority]}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold",
                SEVERITY_STYLES[c.severity]
              )}
            >
              الخطورة: {SEVERITY_LABELS[c.severity]}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span className="font-bold text-foreground">{c.createdByName}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(c.createdAt)}
            </span>
            {c.sourceReportId && c.sourceReportNumber && (
              <Button asChild variant="link" className="h-auto p-0 font-bold gap-1.5 text-primary">
                <Link href={`/reports/${c.sourceReportId}`}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  البلاغ {c.sourceReportNumber}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetaChip icon={MapPin} label="المحافظة" value={c.governorate || "—"} />
        <MetaChip icon={Monitor} label="النظام" value={c.affectedSystem || "—"} />
        <MetaChip
          icon={Users}
          label="المتأثرون"
          value={`${c.affectedUsers} مستخدم`}
        />
        <MetaChip
          icon={User}
          label="المسؤول"
          value={
            c.assignedDeveloperName || assigneeLabel !== "—" ? (
              <span className="flex flex-col gap-0.5">
                {assigneeLabel !== "—" && (
                  <span className="text-xs font-bold text-primary">{assigneeLabel}</span>
                )}
                {c.assignedDeveloperName && (
                  <span className="text-xs text-muted-foreground truncate">
                    {c.assignedDeveloperName}
                  </span>
                )}
              </span>
            ) : (
              "غير مسند"
            )
          }
        />
        <MetaChip
          icon={Clock}
          label="الحالة"
          value={CASE_STATUS_LABELS[c.status] ?? simpleStatusLabel(c.status)}
          className="col-span-2 md:col-span-1"
        />
      </div>

      <div className={cn("grid gap-6", isCoordinator ? "grid-cols-1" : "lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px]")}>
        <div className="space-y-5 min-w-0">
          {/* Description */}
          <div className="rounded-2xl border-2 bg-card p-6 md:p-7 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-black">الوصف</h2>
            </div>
            <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground/90">
              {c.description}
            </p>

            {c.resolutionNotes && (
              <div className="mt-6 rounded-xl border-2 border-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/30 p-5">
                <p className="font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  ملاحظات الحل
                </p>
                <p className="mt-2 text-base leading-relaxed">{c.resolutionNotes}</p>
                {c.solvedByName && (
                  <p className="text-sm text-muted-foreground mt-3">
                    بواسطة {c.solvedByName}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="lifecycle" className="space-y-4">
            <TabsList className="h-auto w-full justify-start gap-1 rounded-2xl border-2 bg-muted/30 p-1.5 flex-wrap">
              <TabsTrigger
                value="lifecycle"
                className="rounded-xl px-5 py-2.5 text-sm font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2"
              >
                <History className="h-4 w-4" />
                السجل
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
                  {timeline?.length ?? 0}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="comments"
                className="rounded-xl px-5 py-2.5 text-sm font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                التعليقات
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
                  {comments?.length ?? 0}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="attachments"
                className="rounded-xl px-5 py-2.5 text-sm font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2"
              >
                <Paperclip className="h-4 w-4" />
                المرفقات
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
                  {attachments?.length ?? 0}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lifecycle" className="mt-0 focus-visible:outline-none">
              <CaseLifecycleTimeline events={timeline ?? []} />
            </TabsContent>

            <TabsContent value="comments" className="mt-0 focus-visible:outline-none">
              <CaseCommentsSection caseId={caseId} comments={comments ?? []} />
            </TabsContent>

            <TabsContent value="attachments" className="mt-0 focus-visible:outline-none">
              <div className="grid gap-3 sm:grid-cols-2">
                <AttachmentsGrid
                  attachments={(attachments ?? []).map((a) => ({
                    id: a.id,
                    name: a.name,
                    url: a.url,
                    kind: a.kind,
                    size: a.size,
                  }))}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {!isSupervisor && !isCoordinator && (
          <aside className="min-w-0">
            <CaseActionsPanel
              caseItem={c}
              hideReviewPanel
              readOnly={isReadOnlyDev || (isSuperAdmin && caseInCoordinatorQueue(c.status))}
            />
          </aside>
        )}
      </div>

      {!isCoordinator && <CaseDetailMobileBar caseItem={c} />}
    </div>
  );
}
