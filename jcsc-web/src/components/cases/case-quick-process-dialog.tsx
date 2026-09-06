"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { UserCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SpecialtyAssignSelect } from "@/components/shared/specialty-assign-select";
import { PrioritySeverityFields } from "@/components/shared/priority-severity-fields";
import { NotProblemReasonPicker } from "@/components/shared/not-problem-reason-picker";
import { cn } from "@/lib/utils";
import { classifyAndAssignCase, reviewCaseNotProblem } from "@/lib/services/cases";
import {
  caseNeedsAcceptance,
  caseNeedsClassifyAssign,
  type Case,
  type CaseType,
} from "@/lib/cases";
import {
  REPORT_CLASSIFY_OPTIONS,
  isQuickBugClassify,
  buildNotProblemReason,
  suggestNotAppIssueForCaseType,
  normalizeAdminPriority,
  normalizeAdminSeverity,
  type NotAppTechnicalIssueId,
} from "@/lib/case-classification";
import type { IssuePriority } from "@/lib/types";
import type { CaseSeverity } from "@/lib/cases/types";
import { useToast } from "@/components/ui/toast";

interface CaseQuickProcessDialogProps {
  caseItem: Case;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CaseQuickProcessDialog({
  caseItem,
  open,
  onOpenChange,
  onSuccess,
}: CaseQuickProcessDialogProps) {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<CaseType>(caseItem.caseType ?? "QUESTION");
  const [assignedDeveloperId, setAssignedDeveloperId] = useState(caseItem.assignedDeveloperId ?? "");
  const [priority, setPriority] = useState<IssuePriority>(
    normalizeAdminPriority(caseItem.priority ?? "MEDIUM")
  );
  const [severity, setSeverity] = useState<CaseSeverity>(
    normalizeAdminSeverity(caseItem.severity ?? "MEDIUM")
  );
  const [notProblemIssueId, setNotProblemIssueId] = useState<NotAppTechnicalIssueId>("MDM");
  const [notProblemNote, setNotProblemNote] = useState("");

  useEffect(() => {
    if (!isQuickBugClassify(selectedType)) {
      setNotProblemIssueId(suggestNotAppIssueForCaseType(selectedType));
    }
  }, [selectedType]);

  const isBug = isQuickBugClassify(selectedType);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isBug) {
        return classifyAndAssignCase(caseItem.id, "BUG", {
          assigneeId: assignedDeveloperId || undefined,
          priority,
          severity,
        });
      }
      const { classification, reason } = buildNotProblemReason(notProblemIssueId, notProblemNote);
      return reviewCaseNotProblem(caseItem.id, classification, reason);
    },
    onSuccess: () => {
      toast(isBug ? "تم التصنيف والإسناد" : "تم التصنيف — ليست مشكلة", "success");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e: Error) => toast(e.message || "فشلت المعالجة", "error"),
  });

  const canSubmit = isBug ? Boolean(assignedDeveloperId) : Boolean(notProblemIssueId);
  const isNew = caseNeedsAcceptance(caseItem.status);
  const isClassify = caseNeedsClassifyAssign(caseItem.status);

  if (!isNew && !isClassify) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <UserCheck className="h-5 w-5 text-primary" />
            {isNew ? "معالجة سريعة" : "تصنيف وإسناد"}
          </DialogTitle>
          <DialogDescription className="font-medium">
            {caseItem.number} — {caseItem.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm font-black mb-2">نوع الحالة</p>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_CLASSIFY_OPTIONS.map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all",
                    selectedType === type
                      ? type === "BUG"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-amber-500 bg-amber-500 text-white"
                      : "border-border bg-muted/50 hover:bg-muted"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {isBug ? (
            <>
              <PrioritySeverityFields
                priority={priority}
                severity={severity}
                onPriorityChange={setPriority}
                onSeverityChange={setSeverity}
              />
              <div>
                <p className="text-sm font-black mb-2">إسناد *</p>
                <SpecialtyAssignSelect
                  value={assignedDeveloperId}
                  onValueChange={setAssignedDeveloperId}
                  triggerClassName="h-11 border-2"
                />
              </div>
            </>
          ) : (
            <NotProblemReasonPicker
              value={notProblemIssueId}
              onChange={setNotProblemIssueId}
              note={notProblemNote}
              onNoteChange={setNotProblemNote}
            />
          )}

          <Button
            size="lg"
            className={cn(
              "w-full h-12 font-black border-0",
              isBug ? "bg-brand-gradient" : "bg-amber-600 hover:bg-amber-700"
            )}
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending
              ? "جاري المعالجة..."
              : isBug
                ? "تصنيف وإسناد"
                : "ليست مشكلة — إغلاق"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
