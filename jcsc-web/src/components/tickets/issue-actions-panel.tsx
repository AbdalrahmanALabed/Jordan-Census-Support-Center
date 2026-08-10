"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { updateIssueStatus } from "@/lib/services/issues";
import { ISSUE_STATUS_LABELS, type Issue, type IssueStatus } from "@/lib/types";
import { isDeveloperRole } from "@/lib/cases";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { hasPermission, isManagerRole } from "@/lib/reports";

interface IssueActionsPanelProps {
  issue: Issue & { enumeratorsAffected?: number };
}

export function IssueActionsPanel({ issue }: IssueActionsPanelProps) {
  const queryClient = useQueryClient();
  const user = useEffectiveUser();
  const role = user?.role;
  const isManager = role ? isManagerRole(role) : false;
  const isDev = role ? isDeveloperRole(role) : false;
  const canClose = role ? hasPermission(role, "close_issues") : false;
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [needsDeployment, setNeedsDeployment] = useState(false);
  const [returnComment, setReturnComment] = useState("");
  const [showReturn, setShowReturn] = useState(false);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof updateIssueStatus>[1]) =>
      updateIssueStatus(issue.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", issue.id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["team-queue"] });
      queryClient.invalidateQueries({ queryKey: ["manager-attention"] });
      setShowReturn(false);
      setReturnComment("");
      setResolutionNotes("");
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  if (issue.status === "CLOSED") {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          هذا العطل مغلق
        </CardContent>
      </Card>
    );
  }

  const handleMarkSolved = () => {
    const status: IssueStatus = needsDeployment ? "WAITING_DEPLOYMENT" : "READY_FOR_TESTING";
    mutation.mutate({
      status,
      resolutionNote: resolutionNotes,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">إجراءات</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge variant="outline">{ISSUE_STATUS_LABELS[issue.status]}</Badge>

        {isDev && user && (issue.assigneeId === user.id || issue.assigneeName === user.name) && (
          <div className="space-y-3 border-t pt-3">
            <p className="text-sm font-medium">تم حل العطل؟</p>
            <Textarea
              placeholder="اكتب ماذا فعلت لحل المشكلة..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={3}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={needsDeployment}
                onChange={(e) => setNeedsDeployment(e.target.checked)}
              />
              يحتاج نشر (Deployment)
            </label>
            <Button
              className="w-full gap-2"
              disabled={!resolutionNotes.trim() || mutation.isPending}
              onClick={handleMarkSolved}
            >
              <CheckCircle className="h-4 w-4" />
              {mutation.isPending ? "جاري الإرسال..." : "تم الحل — إرسال للمدير"}
            </Button>
            <p className="text-xs text-muted-foreground">
              لا يمكنك إغلاق العطل — المدير يؤكد الحل
            </p>
          </div>
        )}

        {canClose && ["READY_FOR_TESTING", "WAITING_DEPLOYMENT"].includes(issue.status) && (
          <div className="space-y-2 border-t pt-3">
            <Button
              className="w-full gap-2"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({
                  status: "CLOSED",
                  closeReason: "تم التحقق — المشكلة محلولة",
                })
              }
            >
              <CheckCircle className="h-4 w-4" />
              قبول الحل وإغلاق العطل
            </Button>
            {!showReturn ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => setShowReturn(true)}
              >
                <RotateCcw className="h-4 w-4" />
                إعادة للمطور
              </Button>
            ) : (
              <div className="space-y-2">
                <Textarea
                  placeholder="لماذا تُعاد؟ (مطلوب)"
                  value={returnComment}
                  onChange={(e) => setReturnComment(e.target.value)}
                  rows={2}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  disabled={!returnComment.trim() || mutation.isPending}
                  onClick={() =>
                    mutation.mutate({ status: "RETURNED", comment: returnComment })
                  }
                >
                  تأكيد الإعادة
                </Button>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        {!isDev && !canClose && (
          <p className="text-sm text-muted-foreground">فريق {issue.team} يتابع هذا العطل</p>
        )}

        {isManager && (
          <p className="text-xs text-muted-foreground border-t pt-2">
            قرار الإغلاق لك وحدك
          </p>
        )}
      </CardContent>
    </Card>
  );
}
