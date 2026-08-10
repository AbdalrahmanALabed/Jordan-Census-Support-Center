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
import { isManagerRole } from "@/lib/reports";
import { useUserStore } from "@/stores/user-store";

/** شريط إجراءات سفلي للجوال — صفحة تفاصيل الحالة */
export function CaseDetailMobileBar({ caseItem }: { caseItem: Case }) {
  const { currentUser } = useUserStore();
  const isManager = isManagerRole(currentUser?.role);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [processOpen, setProcessOpen] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["case", caseItem.id] });
    queryClient.invalidateQueries({ queryKey: ["cases"] });
    queryClient.invalidateQueries({ queryKey: ["operations-dashboard"] });
  };

  const acceptMutation = useMutation({
    mutationFn: () => acceptCase(caseItem.id),
    onSuccess: () => {
      toast("تم قبول الحالة", "success");
      invalidate();
    },
    onError: (e: Error) => toast(e.message || "فشل", "error"),
  });

  const dismissMutation = useMutation({
    mutationFn: () => dismissNotAProblem(caseItem.id),
    onSuccess: () => {
      toast("تم الإغلاق", "success");
      invalidate();
    },
    onError: (e: Error) => toast(e.message || "فشل", "error"),
  });

  const showBar =
    isManager &&
    (caseNeedsAcceptance(caseItem.status) || caseNeedsClassifyAssign(caseItem.status));

  if (!showBar) return null;

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur-xl p-3 pb-safe lg:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex max-w-lg gap-2">
          <Button
            className="flex-1 h-12 font-black gap-2 bg-brand-gradient border-0"
            onClick={() => setProcessOpen(true)}
          >
            <Zap className="h-5 w-5" />
            {caseNeedsAcceptance(caseItem.status) ? "معالجة سريعة" : "تصنيف"}
          </Button>
          {caseNeedsAcceptance(caseItem.status) && (
            <>
              <Button
                className="h-12 px-4 bg-emerald-600 hover:bg-emerald-700"
                disabled={acceptMutation.isPending}
                onClick={() => acceptMutation.mutate()}
              >
                <CheckCircle2 className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                className="h-12 px-4 border-red-300 text-red-600"
                disabled={dismissMutation.isPending}
                onClick={() => {
                  if (confirm("ليست مشكلة؟")) dismissMutation.mutate();
                }}
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
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
