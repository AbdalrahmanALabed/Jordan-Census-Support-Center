"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  CLASSIFICATION_LABELS,
  CONVERSION_TEAMS,
  type FieldReport,
  type ReportClassification,
} from "@/lib/reports";
import { SLA_LABELS, SLA_HOURS } from "@/lib/operations";
import { PRIORITY_LABELS, ISSUE_TYPES, type TicketPriority } from "@/lib/types";
import { convertReportToTicket } from "@/lib/services/reports";
import { useToast } from "@/components/ui/toast";

interface ConvertToTicketDialogProps {
  report: FieldReport;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (ticketId: string) => void;
}

export function ConvertToTicketDialog({
  report,
  open,
  onOpenChange,
  onSuccess,
}: ConvertToTicketDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [classification, setClassification] = useState<ReportClassification>("BUG");
  const [priority, setPriority] = useState<TicketPriority>(
    report.recommendedPriority ?? "MEDIUM"
  );
  const [team, setTeam] = useState(report.recommendedTeam ?? "Developer");
  const [issueType, setIssueType] = useState<string>(ISSUE_TYPES[0]);
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      convertReportToTicket(report.id, {
        classification,
        priority,
        team,
        reason,
        slaHours: SLA_HOURS[priority],
        issueType,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["report", report.id] });
      queryClient.invalidateQueries({ queryKey: ["operations-dashboard"] });
      onOpenChange(false);
      toast("تم تحويل البلاغ لمسألة", "success");
      if (data?.ticket.id) onSuccess?.(data.ticket.id);
    },
    onError: (e: Error) => toast(e.message || "فشل التحويل", "error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle>تحويل بلاغ إلى مسألة</DialogTitle>
          <DialogDescription>
            {report.number} — قرار السوبر أدمن
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="text-muted-foreground mb-1">الملاحظة:</p>
          <p>{report.observation}</p>
        </div>

        {(report.recommendedTeam || report.recommendedPriority) && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">توصية النظام:</span>
            {report.recommendedTeam && (
              <Badge variant="info">{report.recommendedTeam}</Badge>
            )}
            {report.recommendedPriority && (
              <Badge variant="secondary">
                {PRIORITY_LABELS[report.recommendedPriority]}
              </Badge>
            )}
          </div>
        )}

        <div className="grid gap-3">
          <div>
            <label className="text-sm text-muted-foreground">التصنيف</label>
            <Select
              value={classification}
              onValueChange={(v) => setClassification(v as ReportClassification)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CLASSIFICATION_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">الأولوية</label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TicketPriority)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">SLA</label>
              <Input className="mt-1" value={SLA_LABELS[priority]} readOnly />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">الفريق المسؤول</label>
            <Select value={team} onValueChange={setTeam}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONVERSION_TEAMS.map((t) => (
                  <SelectItem key={t.id} value={t.internal}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">نوع المشكلة</label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">سبب التحويل</label>
            <Textarea
              className="mt-1"
              placeholder="لماذa قررت تحويل هذا البلاغ؟"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!reason.trim() || mutation.isPending}
          >
            {mutation.isPending ? "جاري التحويل..." : "تحويل لمسألة"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
