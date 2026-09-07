"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bug, CheckCircle2, XCircle, Layers, Tags, Eye, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpecialtyAssignSelect } from "@/components/shared/specialty-assign-select";
import { PrioritySeverityFields } from "@/components/shared/priority-severity-fields";
import { NotProblemReasonPicker } from "@/components/shared/not-problem-reason-picker";
import { ReportDetailsPanel } from "@/components/reports/report-details-panel";
import {
  buildNotProblemReason,
  type NotAppTechnicalIssueId,
} from "@/lib/case-classification";
import {
  CENSUS_SYSTEMS,
  CENSUS_SYSTEM_LABELS,
  normalizeCensusSystem,
  type CensusSystem,
  type IssuePriority,
} from "@/lib/types";
import type { CaseSeverity } from "@/lib/cases/types";
import type { FieldReport } from "@/lib/reports";
import {
  confirmReportAsProblemWithAssign,
  markReportAsNotProblem,
} from "@/lib/services/reports";
import { useToast } from "@/components/ui/toast";

type Step = "review" | "choose" | "bug" | "not_problem";

interface ReportClassifyDialogProps {
  report: FieldReport;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startAtReview?: boolean;
}

export function canReviewReport(report: FieldReport) {
  return (
    !report.managerDecision &&
    (report.status === "NEW" ||
      report.status === "UNDER_REVIEW" ||
      report.status === "WAITING_CLASSIFICATION")
  );
}

export function ReportClassifyDialog({
  report,
  open,
  onOpenChange,
  startAtReview = false,
}: ReportClassifyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>(startAtReview ? "review" : "choose");
  const [observation, setObservation] = useState(report.observation);
  const [affectedSystem, setAffectedSystem] = useState<CensusSystem>(
    normalizeCensusSystem(report.affectedSystem)
  );
  const [assignedDeveloperId, setAssignedDeveloperId] = useState("");
  const [priority, setPriority] = useState<IssuePriority>("MEDIUM");
  const [severity, setSeverity] = useState<CaseSeverity>("MEDIUM");
  const [notProblemIssueId, setNotProblemIssueId] = useState<NotAppTechnicalIssueId>("MDM");
  const [notProblemNote, setNotProblemNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep(startAtReview ? "review" : "choose");
    setObservation(report.observation);
    setAffectedSystem(normalizeCensusSystem(report.affectedSystem));
    setAssignedDeveloperId("");
    setPriority("MEDIUM");
    setSeverity("MEDIUM");
    setNotProblemIssueId("MDM");
    setNotProblemNote("");
  }, [open, report.id, report.observation, report.affectedSystem, startAtReview]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["reports"] });
    queryClient.invalidateQueries({ queryKey: ["report", report.id] });
    queryClient.invalidateQueries({ queryKey: ["operations-dashboard"] });
  };

  const bugMutation = useMutation({
    mutationFn: () =>
      confirmReportAsProblemWithAssign(report.id, assignedDeveloperId, priority, {
        observation: observation.trim(),
        affectedSystem,
        severity,
      }),
    onSuccess: () => {
      toast("تم تأكيد العطل التقني وإسناد البلاغ", "success");
      invalidate();
      onOpenChange(false);
    },
    onError: (e: Error) => toast(e.message || "فشل الإسناد", "error"),
  });

  const notProblemMutation = useMutation({
    mutationFn: () => {
      const { classification, reason } = buildNotProblemReason(notProblemIssueId, notProblemNote);
      return markReportAsNotProblem(report.id, "", reason, classification);
    },
    onSuccess: () => {
      toast("تم حفظ التصنيف", "success");
      invalidate();
      onOpenChange(false);
    },
    onError: (e: Error) => toast(e.message || "فشل الحفظ", "error"),
  });

  const titles: Record<Step, string> = {
    review: `مراجعة البلاغ ${report.number}`,
    choose: `تصنيف البلاغ ${report.number}`,
    bug: "تأكيد عطل تقني وإسناد",
    not_problem: "تصنيف — ليست مشكلة",
  };

  const descriptions: Record<Step, string> = {
    review: "راجع تفاصيل البلاغ ثم قرّر الإجراء المناسب",
    choose: "هل هذا عطل تقني (BUG) أم ليس مشكلة في النظام؟",
    bug: "عدّل التفاصيل إن لزم، ثم حدّد الأولوية والخطورة واسند للمسؤول",
    not_problem: "اختر العطل الفني — خارج نطاق التطبيق (MDM، شبكة، جهاز...)",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b bg-muted/20">
          <DialogTitle className="text-lg font-black leading-snug">{titles[step]}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{descriptions[step]}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
        {step === "review" && (
          <div className="space-y-4">
            <ReportDetailsPanel report={report} reviewMode />
            {canReviewReport(report) ? (
              <div className="flex gap-2 pt-2 border-t">
                <Button className="flex-1 gap-2" onClick={() => setStep("choose")}>
                  <Tags className="h-4 w-4" />
                  متابعة للتصنيف
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  إغلاق
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                إغلاق
              </Button>
            )}
          </div>
        )}

        {step === "choose" && (
          <div className="space-y-4">
            {startAtReview && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground"
                onClick={() => setStep("review")}
              >
                <Eye className="h-3.5 w-3.5" />
                عرض تفاصيل البلاغ
              </Button>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setStep("bug")}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/20 p-6 hover:shadow-md transition-all cursor-pointer text-center min-h-[10rem]"
              >
                <Bug className="h-9 w-9 text-emerald-600 shrink-0" />
                <span className="font-black text-emerald-800 dark:text-emerald-200 text-base">عطل تقني</span>
                <span className="text-xs text-muted-foreground leading-relaxed px-2">
                  BUG — إسناد وفتح حالة
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStep("not_problem")}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-red-300 bg-red-50/50 dark:bg-red-950/20 p-6 hover:shadow-md transition-all cursor-pointer text-center min-h-[10rem]"
              >
                <XCircle className="h-9 w-9 text-red-600 shrink-0" />
                <span className="font-black text-red-800 dark:text-red-200 text-base">ليست مشكلة</span>
                <span className="text-xs text-muted-foreground leading-relaxed px-2">
                  MDM، شبكة، جهاز، تدريب...
                </span>
              </button>
            </div>
          </div>
        )}

        {step === "bug" && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-black mb-2">وصف المشكلة</p>
              <Textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                rows={4}
                className="border-2"
                placeholder="اشرح العطل التقني..."
              />
            </div>
            <div>
              <p className="text-sm font-black mb-2 flex items-center gap-1">
                <Layers className="h-4 w-4" /> النظام *
              </p>
              <Select
                value={affectedSystem}
                onValueChange={(v) => setAffectedSystem(v as CensusSystem)}
              >
                <SelectTrigger className="h-11 border-2">
                  <SelectValue placeholder="اختر النظام...">
                    {CENSUS_SYSTEM_LABELS[affectedSystem]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent position="popper" className="z-[200]">
                  {CENSUS_SYSTEMS.map(({ value, label }) => (
                    <SelectItem key={value} value={value} className="text-base py-3">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <PrioritySeverityFields
              priority={priority}
              severity={severity}
              onPriorityChange={setPriority}
              onSeverityChange={setSeverity}
            />
            <div>
              <p className="text-sm font-black mb-2">إسناد إلى *</p>
              <SpecialtyAssignSelect
                value={assignedDeveloperId}
                onValueChange={setAssignedDeveloperId}
                triggerClassName="h-11 border-2"
                placeholder="اختر المسؤول..."
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 gap-2"
                disabled={!assignedDeveloperId || !observation.trim() || bugMutation.isPending}
                onClick={() => bugMutation.mutate()}
              >
                <CheckCircle2 className="h-4 w-4" />
                {bugMutation.isPending ? "جاري الحفظ..." : "تأكيد وإسناد"}
              </Button>
              <Button variant="outline" onClick={() => setStep("choose")}>
                <ArrowRight className="h-4 w-4" />
                رجوع
              </Button>
            </div>
          </div>
        )}

        {step === "not_problem" && (
          <div className="space-y-4">
            <NotProblemReasonPicker
              value={notProblemIssueId}
              onChange={setNotProblemIssueId}
              note={notProblemNote}
              onNoteChange={setNotProblemNote}
            />
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1 sticky bottom-0 bg-background/95 pb-1">
              <Button variant="outline" className="sm:w-auto" onClick={() => setStep("choose")}>
                <ArrowRight className="h-4 w-4" />
                رجوع
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={notProblemMutation.isPending}
                onClick={() => notProblemMutation.mutate()}
              >
                {notProblemMutation.isPending ? "جاري الحفظ..." : "حفظ التصنيف"}
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
