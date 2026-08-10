"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptCase, dismissNotAProblem } from "@/lib/services/cases";
import {
  caseNeedsAcceptance,
  caseNeedsClassifyAssign,
  type Case,
} from "@/lib/cases";
import { CaseQuickProcessDialog } from "@/components/cases/case-quick-process-dialog";
import { useToast } from "@/components/ui/toast";

interface CaseReviewQuickActionsProps {
  caseItem: Case;
}

export function CaseReviewQuickActions({ caseItem }: CaseReviewQuickActionsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [processOpen, setProcessOpen] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["cases"] });
    queryClient.invalidateQueries({ queryKey: ["operations-dashboard"] });
  };

  const acceptMutation = useMutation({
    mutationFn: () => acceptCase(caseItem.id),
    onSuccess: () => {
      toast("تم قبول الحالة", "success");
      invalidate();
    },
    onError: (e: Error) => toast(e.message || "فشل القبول", "error"),
  });

  const dismissMutation = useMutation({
    mutationFn: () => dismissNotAProblem(caseItem.id),
    onSuccess: () => {
      toast("تم إغلاق الحالة", "success");
      invalidate();
    },
    onError: (e: Error) => toast(e.message || "فشل الإغلاق", "error"),
  });

  const needsAccept = caseNeedsAcceptance(caseItem.status);
  const needsClassify = caseNeedsClassifyAssign(caseItem.status);

  if (!needsAccept && !needsClassify) return null;

  return (
    <>
      <div
        className="flex flex-wrap gap-2 rounded-xl border border-sky-200/80 bg-sky-50/50 dark:bg-sky-950/20 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        {(needsAccept || needsClassify) && (
          <Button
            size="sm"
            className="font-bold gap-1.5 bg-brand-gradient border-0 h-10 px-4"
            onClick={(e) => {
              e.stopPropagation();
              setProcessOpen(true);
            }}
          >
            <Zap className="h-4 w-4" />
            {needsAccept ? "معالجة سريعة" : "تصنيف وإسناد"}
          </Button>
        )}
        {needsAccept && (
          <>
            <Button
              size="sm"
              className="font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 h-10 px-4"
              disabled={acceptMutation.isPending}
              onClick={(e) => {
                e.stopPropagation();
                acceptMutation.mutate();
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              قبول
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="font-bold gap-1.5 border-2 border-red-300 text-red-700 h-10 px-4"
              disabled={dismissMutation.isPending}
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("إغلاق — ليست مشكلة؟")) dismissMutation.mutate();
              }}
            >
              <XCircle className="h-4 w-4" />
              ليست مشكلة
            </Button>
          </>
        )}
      </div>

      <CaseQuickProcessDialog
        caseItem={caseItem}
        open={processOpen}
        onOpenChange={setProcessOpen}
        onSuccess={invalidate}
      />
    </>
  );
}
