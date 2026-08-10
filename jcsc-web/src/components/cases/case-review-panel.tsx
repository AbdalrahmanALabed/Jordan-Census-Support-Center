"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { WorkflowStepCard } from "@/components/shared/ops-ui";
import { acceptCase, dismissNotAProblem } from "@/lib/services/cases";
import { caseNeedsAcceptance, type Case } from "@/lib/cases";

interface CaseReviewPanelProps {
  caseItem: Case;
  onSuccess?: () => void;
}

/** الخطوة 1: قبول الحالة أو رفضها */
export function CaseReviewPanel({ caseItem, onSuccess }: CaseReviewPanelProps) {
  const [dismissReason, setDismissReason] = useState("");
  const [showDismiss, setShowDismiss] = useState(false);

  const acceptMutation = useMutation({
    mutationFn: () => acceptCase(caseItem.id),
    onSuccess: () => onSuccess?.(),
    onError: (e: Error) => alert(e.message || "فشل قبول الحالة"),
  });

  const dismissMutation = useMutation({
    mutationFn: () => dismissNotAProblem(caseItem.id, dismissReason || undefined),
    onSuccess: () => onSuccess?.(),
    onError: (e: Error) => alert(e.message || "فشل الإغلاق"),
  });

  if (!caseNeedsAcceptance(caseItem.status)) return null;

  return (
    <WorkflowStepCard
      step={1}
      title="قبول الحالة"
      subtitle="اقبل الحالة أولاً، ثم صنّفها وأسندها للمعني"
      icon={Inbox}
      tone="sky"
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            size="lg"
            className={cn(
              "h-16 text-lg font-black gap-3 shadow-lg btn-glow",
              "bg-gradient-to-l from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600"
            )}
            disabled={acceptMutation.isPending}
            onClick={() => acceptMutation.mutate()}
          >
            <CheckCircle2 className="h-7 w-7" />
            {acceptMutation.isPending ? "جاري القبول..." : "قبول الحالة"}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-16 text-lg font-black gap-3 border-2 border-red-300/80 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            disabled={dismissMutation.isPending}
            onClick={() => {
              if (showDismiss) dismissMutation.mutate();
              else setShowDismiss(true);
            }}
          >
            <XCircle className="h-7 w-7" />
            {dismissMutation.isPending ? "جاري الإغلاق..." : "ليست مشكلة"}
          </Button>
        </div>

        {showDismiss && (
          <div className="rounded-xl border-2 border-red-200/80 bg-red-50/60 dark:bg-red-950/20 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-sm font-bold text-red-800 dark:text-red-300">سبب الإغلاق (اختياري)</p>
            <Textarea
              placeholder="مثال: خطأ مستخدم — لا حاجة لمعالجة تقنية..."
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
              rows={2}
              className="text-base border-2"
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1 h-12 text-base font-bold"
                onClick={() => dismissMutation.mutate()}
                disabled={dismissMutation.isPending}
              >
                تأكيد الإغلاق
              </Button>
              <Button variant="ghost" className="h-12" onClick={() => setShowDismiss(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </div>
    </WorkflowStepCard>
  );
}
