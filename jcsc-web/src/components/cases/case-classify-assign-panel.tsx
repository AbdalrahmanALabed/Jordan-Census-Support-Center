"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Bug,
  HelpCircle,
  GraduationCap,
  StickyNote,
  Lightbulb,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpecialtyAssignSelect } from "@/components/shared/specialty-assign-select";
import { PrioritySeverityFields } from "@/components/shared/priority-severity-fields";
import { NotProblemReasonPicker } from "@/components/shared/not-problem-reason-picker";
import { cn } from "@/lib/utils";
import { WorkflowStepCard } from "@/components/shared/ops-ui";
import { classifyAndAssignCase, reviewCaseNotProblem } from "@/lib/services/cases";
import {
  caseNeedsClassifyAssign,
  type Case,
  type CaseType,
} from "@/lib/cases";
import {
  REPORT_CLASSIFY_OPTIONS,
  isQuickBugClassify,
  buildNotProblemReason,
  suggestNotAppIssueForCaseType,
  type NotAppTechnicalIssueId,
} from "@/lib/case-classification";
import type { IssuePriority } from "@/lib/types";
import type { CaseSeverity } from "@/lib/cases/types";

const TYPE_ICONS: Record<string, React.ElementType> = {
  BUG: Bug,
  QUESTION: HelpCircle,
  TRAINING_ISSUE: GraduationCap,
  INTERNAL_NOTE: StickyNote,
  FEATURE_REQUEST: Lightbulb,
  COMPLAINT: AlertCircle,
};

interface CaseClassifyAssignPanelProps {
  caseItem: Case;
  onSuccess?: () => void;
}

/** Step 2: classify + assign to specialty */
export function CaseClassifyAssignPanel({ caseItem, onSuccess }: CaseClassifyAssignPanelProps) {
  const [selectedType, setSelectedType] = useState<CaseType>(
    (caseItem.caseType as CaseType) ?? "QUESTION"
  );
  const [assignedDeveloperId, setAssignedDeveloperId] = useState(caseItem.assignedDeveloperId ?? "");
  const [priority, setPriority] = useState<IssuePriority>(caseItem.priority ?? "MEDIUM");
  const [severity, setSeverity] = useState<CaseSeverity>(caseItem.severity ?? "MEDIUM");
  const [notProblemIssueId, setNotProblemIssueId] = useState<NotAppTechnicalIssueId>("MDM");
  const [notProblemNote, setNotProblemNote] = useState("");

  useEffect(() => {
    if (!isQuickBugClassify(selectedType)) {
      setNotProblemIssueId(suggestNotAppIssueForCaseType(selectedType));
    }
  }, [selectedType]);

  const classifyMutation = useMutation({
    mutationFn: async () => {
      if (isQuickBugClassify(selectedType)) {
        return classifyAndAssignCase(caseItem.id, "BUG", {
          assigneeId: assignedDeveloperId || undefined,
          priority,
          severity,
        });
      }
      const { classification, reason } = buildNotProblemReason(notProblemIssueId, notProblemNote);
      return reviewCaseNotProblem(caseItem.id, classification, reason);
    },
    onSuccess: () => onSuccess?.(),
    onError: (e: Error) => alert(e.message || "فشل التصنيف"),
  });

  if (!caseNeedsClassifyAssign(caseItem.status)) return null;

  const isBug = isQuickBugClassify(selectedType);
  const canSubmit = isBug ? Boolean(assignedDeveloperId) : Boolean(notProblemIssueId);

  return (
    <WorkflowStepCard
      step={2}
      title="التصنيف والإسناد"
      subtitle="BUG يُسند للتخصص — أو اختر عطلاً فنياً خارج التطبيق"
      icon={ArrowRight}
      tone="amber"
    >
      <div className="space-y-5">
        <div>
          <p className="text-sm font-black mb-3">نوع الحالة</p>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
            {REPORT_CLASSIFY_OPTIONS.map(({ type, label }) => {
              const Icon = TYPE_ICONS[type] ?? HelpCircle;
              const active = selectedType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border-2 px-3 py-3.5 text-sm font-bold transition-all",
                    active
                      ? type === "BUG"
                        ? "border-primary bg-primary text-primary-foreground shadow-md"
                        : "border-amber-500 bg-amber-500 text-white shadow-md"
                      : "border-border bg-muted/40 hover:border-primary/30"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {isBug ? (
          <>
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
            "w-full h-14 text-lg font-black gap-3 border-0",
            isBug ? "bg-brand-gradient" : "bg-amber-600 hover:bg-amber-700"
          )}
          disabled={!canSubmit || classifyMutation.isPending}
          onClick={() => classifyMutation.mutate()}
        >
          <ArrowRight className="h-6 w-6" />
          {classifyMutation.isPending
            ? "جاري المعالجة..."
            : isBug
              ? "تصنيف وإسناد"
              : "ليست مشكلة — إغلاق"}
        </Button>
      </div>
    </WorkflowStepCard>
  );
}
