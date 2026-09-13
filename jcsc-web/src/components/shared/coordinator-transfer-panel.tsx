"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkflowStepCard } from "@/components/shared/ops-ui";
import { getCaseTransferPeers, transferCaseCoordinator } from "@/lib/services/cases";
import type { CaseTransferPeer } from "@/lib/services/cases";
import type { Case } from "@/lib/cases";
import { useToast } from "@/components/ui/toast";

interface CoordinatorTransferPanelProps {
  caseItem: Case;
  onSuccess?: () => void;
}

const ROLE_GROUP_ORDER: { role: string; label: string }[] = [
  { role: "SUPPORT_COORDINATOR", label: "منسقو الدعم الإقليميون" },
  { role: "FIELD_OPERATIONS_COORDINATOR", label: "منسق إدارة العمل الميداني" },
  { role: "RESEARCHER_FIELD_COORDINATOR", label: "مشرف الدعم الفني" },
  { role: "INFRASTRUCTURE_SUPERVISOR", label: "مشرف البنية التحتية" },
  { role: "SUPPORT_SUPERVISOR", label: "مشرف الدعم" },
];

function peerOptionLabel(peer: CaseTransferPeer): string {
  const name = peer.name?.trim() || peer.email?.trim() || "مستخدم";
  const detail = peer.label?.trim() || peer.roleLabel || "";
  if (!detail || detail.startsWith(name)) return name;
  return `${name} — ${detail.replace(`${name} — `, "")}`;
}

function peerStatusSuffix(peer: CaseTransferPeer): string | null {
  if (peer.isCurrentAssignee) return " (المسند حالياً)";
  if (peer.isCurrentUser) return " (أنت)";
  return null;
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

  const groupedPeers = useMemo(() => {
    return ROLE_GROUP_ORDER.map(({ role, label }) => ({
      role,
      label,
      items: peers.filter((p) => p.role === role),
    })).filter((g) => g.items.length > 0);
  }, [peers]);

  const selectablePeers = peers.filter((peer) => peer.canSelect !== false);
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
      subtitle="اختر من القائمة المنسدلة ثم اكتب سبب التحويل"
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
          لا يوجد منسق/مشرف متاح للتحويل.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-black">تحويل إلى</label>
            <Select value={targetId || undefined} onValueChange={setTargetId}>
              <SelectTrigger className="h-12 border-2 text-base font-bold text-start">
                <SelectValue placeholder={`اختر منسقاً أو مشرفاً (${selectablePeers.length} متاح)`} />
              </SelectTrigger>
              <SelectContent dir="rtl" align="start" position="popper" className="z-[200] max-h-72">
                {groupedPeers.map((group) => (
                  <SelectGroup key={group.role}>
                    <SelectLabel className="font-black text-primary px-2 py-2">
                      {group.label}
                    </SelectLabel>
                    {group.items.map((peer) => {
                      const canSelect = peer.canSelect !== false;
                      const suffix = peerStatusSuffix(peer);
                      return (
                        <SelectItem
                          key={peer.id}
                          value={peer.id}
                          disabled={!canSelect}
                          className="text-base py-3 cursor-pointer"
                        >
                          {peerOptionLabel(peer)}
                          {suffix}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {peers.length} منسق/مشرف · {selectablePeers.length} متاح للتحويل
            </p>
          </div>

          {selectedPeer && selectedPeer.canSelect !== false && (
            <div className="flex items-start gap-3 rounded-xl border-2 border-primary/20 bg-primary/5 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <UserRound className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-black text-sm">{selectedPeer.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedPeer.label || selectedPeer.roleLabel}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-black">سبب التحويل</label>
            <Textarea
              placeholder="اكتب سبب تحويل البلاغ..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="text-base border-2"
            />
          </div>

          <Button
            className="w-full h-11 gap-2 font-bold"
            disabled={!targetId || !reason.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <ArrowLeftRight className="h-4 w-4" />
            {mutation.isPending ? "جاري التحويل..." : "تحويل الحالة"}
          </Button>
        </div>
      )}
    </WorkflowStepCard>
  );
}
