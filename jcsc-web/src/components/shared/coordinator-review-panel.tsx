"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bug, XCircle, ArrowUpRight, Layers, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { NotProblemCommentForm } from "@/components/shared/not-problem-comment-form";
import { WorkflowStepCard } from "@/components/shared/ops-ui";
import {
  coordinatorEscalateSystemBug,
  coordinatorDismissNotSystemBug,
} from "@/lib/services/cases";
import type { Case } from "@/lib/cases";
import {
  buildSimpleNotProblemReason,
  COORDINATOR_SYSTEM_BUG_LABEL,
} from "@/lib/case-classification";
import { useToast } from "@/components/ui/toast";

type ReviewMode = "choose" | "system_bug" | "not_system";

interface CoordinatorReviewPanelProps {
  caseItem: Case;
  canProcess?: boolean;
  onSuccess?: () => void;
}

export function CoordinatorReviewPanel({
  caseItem,
  canProcess = true,
  onSuccess,
}: CoordinatorReviewPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [mode, setMode] = useState<ReviewMode>("choose");
  const [note, setNote] = useState("");
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["case", caseItem.id] });
    queryClient.invalidateQueries({ queryKey: ["case-timeline", caseItem.id] });
    queryClient.invalidateQueries({ queryKey: ["cases"] });
    queryClient.invalidateQueries({ queryKey: ["operations-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["coordinator-dashboard"] });
    onSuccess?.();
  };

  const escalateMutation = useMutation({
    mutationFn: () => coordinatorEscalateSystemBug(caseItem.id, note),
    onSuccess: () => {
      toast("تم تصعيد البلاغ كـ System Bug للسوبر أدمن", "success");
      invalidateAll();
      setMode("choose");
      setNote("");
    },
    onError: (e: Error) => toast(e.message || "فشل التصعيد", "error"),
  });

  const dismissMutation = useMutation({
    mutationFn: () => {
      const { classification, reason } = buildSimpleNotProblemReason(note);
      return coordinatorDismissNotSystemBug(caseItem.id, classification, reason);
    },
    onSuccess: () => {
      toast("تم إغلاق الحالة — سبب خارج النظام", "success");
      invalidateAll();
      setMode("choose");
      setNote("");
    },
    onError: (e: Error) => toast(e.message || "فشل الإغلاق", "error"),
  });

  if (caseItem.status !== "OPEN") return null;

  return (
    <WorkflowStepCard
      step={1}
      title="تصنيف منسق الدعم"
      subtitle="راجع البلاغ — System Bug للسوبر أدمن، أو سبب تقني خارج النظام للإغلاق"
      icon={ClipboardCheck}
      tone="sky"
    >
      <div className="rounded-xl border-2 bg-muted/20 p-4 space-y-2 mb-4">
        <div className="flex flex-wrap gap-2">
          {caseItem.affectedSystem && (
            <Badge variant="outline" className="gap-1">
              <Layers className="h-3.5 w-3.5" />
              {caseItem.affectedSystem}
            </Badge>
          )}
          <Badge variant="secondary">{caseItem.number}</Badge>
        </div>
        <p className="text-sm font-bold">{caseItem.title}</p>
        <p className="text-sm text-muted-foreground line-clamp-4">{caseItem.description}</p>
      </div>

      {mode === "choose" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("system_bug")}
            className="flex flex-col items-start gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 p-4 text-start hover:border-primary hover:shadow-md transition-all"
          >
            <Bug className="h-6 w-6 text-primary" />
            <span className="font-black">{COORDINATOR_SYSTEM_BUG_LABEL}</span>
            <span className="text-xs text-muted-foreground leading-relaxed">
              عطل في التطبيق أو النظام — يُرسل للسوبر أدمن للمراجعة والإسناد
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode("not_system")}
            className="flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-start hover:border-amber-400/50 hover:bg-amber-500/5 transition-all"
          >
            <XCircle className="h-6 w-6 text-amber-600" />
            <span className="font-black">ليست مشكلة في النظام</span>
            <span className="text-xs text-muted-foreground leading-relaxed">
              إغلاق الحالة — تعليق اختياري
            </span>
          </button>
        </div>
      )}

      {mode === "system_bug" && (
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-primary/25 bg-primary/5 p-3 text-sm">
            <p className="font-black text-primary flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              سيتم إرسال الحالة للسوبر أدمن
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              السوبر أدمن يقرر الإسناد للمطور المناسب
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">تعليق (اختياري)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ملاحظات للسوبر أدمن..."
              className="min-h-[80px]"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              className="gap-2 font-bold"
              disabled={!canProcess || escalateMutation.isPending}
              onClick={() => escalateMutation.mutate()}
            >
              <Bug className="h-4 w-4" />
              تصعيد System Bug
            </Button>
            <Button variant="ghost" onClick={() => setMode("choose")}>
              رجوع
            </Button>
          </div>
        </div>
      )}

      {mode === "not_system" && (
        <div className="space-y-4">
          <NotProblemCommentForm note={note} onNoteChange={setNote} />
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="destructive"
              className="gap-2 font-bold"
              disabled={!canProcess || dismissMutation.isPending}
              onClick={() => dismissMutation.mutate()}
            >
              <XCircle className="h-4 w-4" />
              إغلاق الحالة
            </Button>
            <Button variant="ghost" onClick={() => setMode("choose")}>
              رجوع
            </Button>
          </div>
        </div>
      )}
    </WorkflowStepCard>
  );
}
