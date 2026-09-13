"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportQuickActions } from "@/components/reports/report-quick-actions";
import { ReportDetailsPanel } from "@/components/reports/report-details-panel";
import { CaseCommentsSection } from "@/components/cases/case-comments-section";
import { getReportById } from "@/lib/services/reports";
import { getCaseComments } from "@/lib/services/cases";
import { CLASSIFICATION_LABELS } from "@/lib/reports";
import { useUserStore } from "@/stores/user-store";

export function ReportDetailContent({ reportId }: { reportId: string }) {
  const { hasPermission } = useUserStore();
  const canReview = hasPermission("review_reports");
  const reportsListHref = canReview ? "/reports" : "/reports/my";
  const reportsListLabel = canReview ? "العودة للبلاغات الواردة" : "العودة لبلاغاتي";

  const { data: report, isLoading } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => getReportById(reportId),
  });

  const linkedCaseId = report?.linkedCaseId;
  const { data: caseComments } = useQuery({
    queryKey: ["case-comments", linkedCaseId],
    queryFn: () => getCaseComments(linkedCaseId!),
    enabled: Boolean(linkedCaseId),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        جاري التحميل...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">البلاغ غير موجود</p>
        <Button asChild variant="outline">
          <Link href={reportsListHref}>العودة</Link>
        </Button>
      </div>
    );
  }

  const canAct =
    report.status === "NEW" ||
    report.status === "UNDER_REVIEW" ||
    report.status === "WAITING_CLASSIFICATION";

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={reportsListHref}>
          <ArrowRight className="h-4 w-4" /> {reportsListLabel}
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-6">
              <ReportDetailsPanel report={report} />
            </CardContent>
          </Card>

          {report.convertedTicketNumber && (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">تم التحويل إلى مسألة</p>
                  <p className="font-medium">
                    {report.convertedIssueNumber ?? report.convertedTicketNumber}
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/issues/${report.convertedIssueId ?? report.convertedTicketId}`}>
                    عرض المسألة
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  التعليقات
                </p>
                {linkedCaseId && report.linkedCaseNumber && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/cases/${linkedCaseId}`}>
                      الحالة {report.linkedCaseNumber}
                    </Link>
                  </Button>
                )}
              </div>
              {linkedCaseId ? (
                <CaseCommentsSection
                  caseId={linkedCaseId}
                  comments={caseComments ?? []}
                  compact
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  لا توجد حالة مرتبطة — التعليقات متاحة فور إنشاء الحالة.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {canReview && canAct && <ReportQuickActions report={report} />}

          {report.classification && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">التصنيف</p>
                <p className="font-medium">{CLASSIFICATION_LABELS[report.classification]}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
