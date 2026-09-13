"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Paperclip,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpecialtyAssignSelect } from "@/components/shared/specialty-assign-select";
import { PrioritySeverityFields } from "@/components/shared/priority-severity-fields";
import { NotProblemCommentForm } from "@/components/shared/not-problem-comment-form";
import { WorkflowStepCard } from "@/components/shared/ops-ui";
import type { FieldReport } from "@/lib/reports";
import {
  confirmReportAsProblemWithAssign,
  markReportAsNotProblem,
  getSimilarReports,
} from "@/lib/services/reports";
import { reviewCaseAsProblem, reviewCaseNotProblem } from "@/lib/services/cases";
import type { Case } from "@/lib/cases";
import type { CaseSeverity } from "@/lib/cases/types";
import { CENSUS_SYSTEM_LABELS, type CensusSystem, type IssuePriority } from "@/lib/types";
import { buildSimpleNotProblemReason } from "@/lib/case-classification";
import { useToast } from "@/components/ui/toast";

type ReviewMode = "choose" | "problem" | "not_problem";

interface SuperAdminReviewPanelProps {
  report?: FieldReport;
  caseItem?: Case;
  compact?: boolean;
  canProcess?: boolean;
  onSuccess?: () => void;
}

function systemLabel(value?: string) {
  if (!value) return null;
  return CENSUS_SYSTEM_LABELS[value as CensusSystem] ?? value;
}

export function SuperAdminReviewPanel({
  report,
  caseItem,
  compact = false,
  canProcess = true,
  onSuccess,
}: SuperAdminReviewPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [mode, setMode] = useState<ReviewMode>("choose");
  const [assignedDeveloperId, setAssignedDeveloperId] = useState("");
  const [priority, setPriority] = useState<IssuePriority>("MEDIUM");
  const [severity, setSeverity] = useState<CaseSeverity>("MEDIUM");
  const [note, setNote] = useState("");

  const description = report?.observation ?? caseItem?.description ?? "";
  const reportId = report?.id;

  const { data: similar } = useQuery({
    queryKey: ["similar-reports", reportId],
    queryFn: () => getSimilarReports(reportId!),
    enabled: !!reportId,
  });

  const hasSimilar = (similar?.length ?? 0) > 0;

  const invalidateAll = () => {
    if (report) {
      queryClient.invalidateQueries({ queryKey: ["report", report.id] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["similar-reports", report.id] });
    }
    if (caseItem) {
      queryClient.invalidateQueries({ queryKey: ["case", caseItem.id] });
      queryClient.invalidateQueries({ queryKey: ["case-timeline", caseItem.id] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    }
    queryClient.invalidateQueries({ queryKey: ["operations-dashboard"] });
    onSuccess?.();
  };

  const problemMutation = useMutation({
    mutationFn: async () => {
      if (!assignedDeveloperId) throw new Error("اختر المسؤول");
      if (caseItem) {
        return reviewCaseAsProblem(caseItem.id, assignedDeveloperId, priority, severity);
      }
      if (report) {
        return confirmReportAsProblemWithAssign(report.id, assignedDeveloperId, priority, {
          severity,
        });
      }
      throw new Error("لا يوجد بلاغ أو حالة");
    },
    onSuccess: () => {
      toast("تم تأكيد المشكلة وإسنادها", "success");
      invalidateAll();
      setMode("choose");
    },
    onError: (e: Error) => toast(e.message || "فشل الإسناد", "error"),
  });

  const notProblemMutation = useMutation({
    mutationFn: async () => {
      const { classification, reason } = buildSimpleNotProblemReason(note);
      if (caseItem) {
        return reviewCaseNotProblem(caseItem.id, classification, reason);
      }
      if (report) {
        return markReportAsNotProblem(report.id, "", reason, classification);
      }
      throw new Error("لا يوجد بلاغ أو حالة");
    },
    onSuccess: () => {
      toast("تم التصنيف — ليست مشكلة", "success");
      invalidateAll();
      setMode("choose");
    },
    onError: (e: Error) => toast(e.message || "فشل الحفظ", "error"),
  });

  const canReviewReport =
    report &&
    !report.managerDecision &&
    (report.status === "NEW" ||
      report.status === "UNDER_REVIEW" ||
      report.status === "WAITING_CLASSIFICATION");

  const canReviewCase = caseItem?.status === "AWAITING_APPROVAL";

  if (!canReviewReport && !canReviewCase) return null;

  const contextSystem =
    systemLabel(report?.affectedSystem) ?? caseItem?.affectedSystem ?? null;

  const openNotProblem = () => {
    setMode("not_problem");
  };

  const contextBanner = !compact && (
    <div className="rounded-xl border-2 bg-muted/30 p-4 space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        {contextSystem && (
          <Badge variant="outline" className="gap-1 text-sm py-1">
            <Layers className="h-3.5 w-3.5" />
            {contextSystem}
          </Badge>
        )}
        {report && report.attachments.length > 0 && (
          <Badge variant="outline" className="gap-1">
            <Paperclip className="h-3 w-3" />
            {report.attachments.length} مرفق
          </Badge>
        )}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground line-clamp-4">{description}</p>
      )}
      {hasSimilar && (
        <div className="rounded-lg border border-amber-400/50 bg-amber-50/80 dark:bg-amber-950/20 p-3 space-y-2">
          <p className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-2 text-sm">
            <Copy className="h-4 w-4" />
            بلاغات مشابهة — {similar!.length}
          </p>
          <ul className="text-xs space-y-1">
            {similar!.slice(0, 3).map((s) => (
              <li key={s.id}>
                <Link href={`/reports/${s.id}`} className="text-primary hover:underline font-medium">
                  {s.number}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const notProblemForm = (
    <NotProblemCommentForm note={note} onNoteChange={setNote} />
  );

  if (compact) {
    return (
      <div className="space-y-2">
        {mode === "choose" && (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" className="gap-1" onClick={() => setMode("problem")}>
              <CheckCircle2 className="h-3.5 w-3.5" /> قبول
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={openNotProblem}>
              <XCircle className="h-3.5 w-3.5" /> رفض
            </Button>
          </div>
        )}
        {mode === "problem" && (
          <div className="space-y-2 p-3 border-2 rounded-xl bg-card">
            <SpecialtyAssignSelect value={assignedDeveloperId} onValueChange={setAssignedDeveloperId} triggerClassName="h-9" />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" disabled={!canProcess || !assignedDeveloperId || problemMutation.isPending} onClick={() => problemMutation.mutate()}>تأكيد</Button>
              <Button size="sm" variant="ghost" onClick={() => setMode("choose")}>إلغاء</Button>
            </div>
          </div>
        )}
        {mode === "not_problem" && (
          <div className="space-y-3 p-3 border-2 rounded-xl bg-card max-h-[70vh] overflow-y-auto">
            {notProblemForm}
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" className="flex-1" disabled={!canProcess || notProblemMutation.isPending} onClick={() => notProblemMutation.mutate()}>تأكيد</Button>
              <Button size="sm" variant="ghost" onClick={() => setMode("choose")}>إلغاء</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <WorkflowStepCard
      step={1}
      title="مراجعة البلاغ"
      subtitle="قبول كمشكلة تقنية مع إسناد — أو رفض كـ «ليست مشكلة»"
      icon={AlertTriangle}
      tone="amber"
    >
      {contextBanner}

      {mode === "choose" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("problem")}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/20 p-8 transition-all hover:scale-[1.01] hover:shadow-md"
          >
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <span className="text-lg font-black text-emerald-800 dark:text-emerald-200">قبول — مشكلة في التطبيق</span>
            <span className="text-xs text-muted-foreground text-center">BUG — يُسند للتخصص المناسب</span>
          </button>
          <button
            type="button"
            onClick={openNotProblem}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-red-300 bg-red-50/50 dark:bg-red-950/20 p-8 transition-all hover:scale-[1.01] hover:shadow-md"
          >
            <XCircle className="h-10 w-10 text-red-600" />
            <span className="text-lg font-black text-red-800 dark:text-red-200">رفض — ليست مشكلة في التطبيق</span>
            <span className="text-xs text-muted-foreground text-center">إغلاق — تعليق اختياري</span>
          </button>
        </div>
      )}

      {mode === "problem" && (
        <div className="space-y-5 animate-in fade-in slide-in-from-top-2 rounded-2xl border-2 p-6 bg-card">
          <PrioritySeverityFields
            priority={priority}
            severity={severity}
            onPriorityChange={setPriority}
            onSeverityChange={setSeverity}
            triggerClassName="h-12 border-2"
          />
          <div>
            <p className="text-sm font-black mb-2">إسناد إلى *</p>
            <SpecialtyAssignSelect
              value={assignedDeveloperId}
              onValueChange={setAssignedDeveloperId}
              triggerClassName="h-12 border-2"
            />
          </div>
          <div className="flex gap-3">
            <Button
              className="flex-1 h-12 font-black"
              disabled={!canProcess || !assignedDeveloperId || problemMutation.isPending}
              onClick={() => problemMutation.mutate()}
            >
              {problemMutation.isPending ? "جاري الحفظ..." : "تأكيد القبول والإسناد"}
            </Button>
            <Button variant="outline" className="h-12 px-6" onClick={() => setMode("choose")}>
              رجوع
            </Button>
          </div>
        </div>
      )}

      {mode === "not_problem" && (
        <div className="space-y-5 animate-in fade-in slide-in-from-top-2 rounded-2xl border-2 p-6 bg-card">
          {notProblemForm}
          <div className="flex gap-3">
            <Button
              variant="destructive"
              className="flex-1 h-12 font-black"
              disabled={!canProcess || notProblemMutation.isPending}
              onClick={() => notProblemMutation.mutate()}
            >
              {notProblemMutation.isPending ? "جاري الحفظ..." : "تأكيد — ليست مشكلة في التطبيق"}
            </Button>
            <Button variant="outline" className="h-12 px-6" onClick={() => setMode("choose")}>
              رجوع
            </Button>
          </div>
        </div>
      )}
    </WorkflowStepCard>
  );
}
