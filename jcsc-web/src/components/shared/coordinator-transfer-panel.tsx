"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, CheckCircle2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WorkflowStepCard } from "@/components/shared/ops-ui";
import { getCaseTransferPeers, transferCaseCoordinator } from "@/lib/services/cases";
import type { Case } from "@/lib/cases";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface CoordinatorTransferPanelProps {
  caseItem: Case;
  onSuccess?: () => void;
}

function peerDisplayName(peer: {
  name?: string | null;
  email?: string | null;
  label?: string | null;
  roleLabel?: string | null;
  role?: string | null;
}) {
  const name = peer.name?.trim() || peer.email?.trim() || "مستخدم";
  const subtitle =
    peer.label?.trim() ||
    [peer.roleLabel || peer.role, peer.email].filter(Boolean).join(" · ");
  return { name, subtitle };
}

export function CoordinatorTransferPanel({
  caseItem,
  onSuccess,
}: CoordinatorTransferPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");

  const { data: peers = [], isLoading, isError } = useQuery({
    queryKey: ["case-transfer-peers", caseItem.id],
    queryFn: () => getCaseTransferPeers(caseItem.id),
    enabled: caseItem.status === "OPEN",
  });

  const selectedPeer = peers.find((peer) => peer.id === targetId);

  const mutation = useMutation({
    mutationFn: () => transferCaseCoordinator(caseItem.id, targetId, reason),
    onSuccess: (result) => {
      if (!result.ok) {
        toast(result.error || "فشل التحويل", "error");
        return;
      }
      toast("تم تحويل الحالة", "success");
      queryClient.invalidateQueries({ queryKey: ["case", caseItem.id] });
      queryClient.invalidateQueries({ queryKey: ["case-timeline", caseItem.id] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["coordinator-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
      setTargetId("");
      setReason("");
      onSuccess?.();
    },
    onError: (e: Error) => toast(e.message || "فشل التحويل", "error"),
  });

  if (caseItem.status !== "OPEN") return null;

  return (
    <WorkflowStepCard
      step={0}
      title="تحويل بين المنسقين/المشرفين"
      subtitle="حوّل الحالة لمنسق أو مشرف دعم آخر ضمن فريق القيادة فقط"
      icon={ArrowLeftRight}
      tone="violet"
    >
      <div className="rounded-xl border-2 bg-muted/20 p-3 text-sm mb-4">
        <p className="text-muted-foreground">
          المسند حالياً:{" "}
          <span className="font-bold text-foreground">
            {caseItem.assignedCoordinatorName?.trim() || "غير محدد"}
          </span>
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">جاري تحميل القائمة...</p>
      ) : isError ? (
        <p className="text-sm text-destructive font-bold">
          تعذّر تحميل قائمة التحويل — حدّث الصفحة.
        </p>
      ) : peers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          لا يوجد منسق/مشرف متاح لهذا النوع من البلاغات.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-black">تحويل إلى ({peers.length})</p>
            <div className="grid gap-2" role="listbox" aria-label="اختر منسقاً للتحويل">
              {peers.map((peer) => {
                const active = targetId === peer.id;
                const { name, subtitle } = peerDisplayName(peer);
                return (
                  <button
                    key={peer.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => setTargetId(peer.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border-2 p-3 text-start transition-all",
                      active
                        ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20"
                        : "border-border bg-card hover:border-primary/35 hover:bg-muted/40"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 bg-muted text-muted-foreground"
                      )}
                      aria-hidden
                    >
                      {active ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <UserRound className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-black leading-snug text-foreground">
                        {name}
                      </p>
                      {subtitle && subtitle !== name && (
                        <p className="mt-1 text-xs font-medium text-muted-foreground leading-relaxed">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedPeer && (
            <p className="text-sm font-bold text-primary">
              المختار: {peerDisplayName(selectedPeer).name}
            </p>
          )}

          <Textarea
            placeholder="سبب التحويل..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="text-base"
          />
          <Button
            className="w-full h-11 gap-2 font-bold"
            disabled={!targetId || !reason.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <ArrowLeftRight className="h-4 w-4" />
            تحويل الحالة
          </Button>
        </div>
      )}
    </WorkflowStepCard>
  );
}
