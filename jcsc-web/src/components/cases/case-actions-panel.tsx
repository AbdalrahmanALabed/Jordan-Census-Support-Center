"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CheckCircle, RotateCcw, Wrench, UserRound, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  classifyCase,
  addCaseComment,
  closeCase,
  assignCaseDeveloper,
  markCaseSolved,
  addCaseAttachment,
  returnCaseToDeveloper,
  reassignCaseDeveloper,
  returnCaseToSuperAdmin,
} from "@/lib/services/cases";
import {
  toSimpleCaseStatus,
  isDeveloperRole,
  type Case,
} from "@/lib/cases";
import { CaseReviewPanel } from "@/components/cases/case-review-panel";
import { CaseClassifyAssignPanel } from "@/components/cases/case-classify-assign-panel";
import { SpecialtyAssignSelect } from "@/components/shared/specialty-assign-select";
import { FileUploadZone, type UploadedFile } from "@/components/shared/file-upload-zone";
import { useUserStore } from "@/stores/user-store";
import { isManagerRole } from "@/lib/reports";
import { useToast } from "@/components/ui/toast";
import { caseNeedsAcceptance, caseNeedsClassifyAssign } from "@/lib/cases";

export function CaseActionsPanel({
  caseItem,
  hideReviewPanel,
  readOnly,
}: {
  caseItem: Case;
  hideReviewPanel?: boolean;
  readOnly?: boolean;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useUserStore();
  const isManager = isManagerRole(currentUser?.role);
  const isDev = isDeveloperRole(currentUser?.role ?? "");
  const simple = toSimpleCaseStatus(caseItem.status);

  const [comment, setComment] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [solveNotes, setSolveNotes] = useState("");
  const [requiresDeployment, setRequiresDeployment] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [reassignDevId, setReassignDevId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [adminTransferDevId, setAdminTransferDevId] = useState("");
  const [adminTransferReason, setAdminTransferReason] = useState("");
  const [returnAdminReason, setReturnAdminReason] = useState("");
  const [zoneFiles, setZoneFiles] = useState<UploadedFile[]>([]);
  const [savedUrls, setSavedUrls] = useState<Set<string>>(new Set());

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["case", caseItem.id] });
    queryClient.invalidateQueries({ queryKey: ["case-comments", caseItem.id] });
    queryClient.invalidateQueries({ queryKey: ["case-timeline", caseItem.id] });
    queryClient.invalidateQueries({ queryKey: ["case-attachments", caseItem.id] });
    queryClient.invalidateQueries({ queryKey: ["cases"] });
    queryClient.invalidateQueries({ queryKey: ["operations-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["developer-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
  };

  const onMutationError = (e: Error) => toast(e.message || "فشلت العملية", "error");

  const classifyMutation = useMutation({
    mutationFn: (type: import("@/lib/cases").CaseType) =>
      classifyCase(caseItem.id, type, currentUser?.name ?? "مدير"),
    onSuccess: invalidate,
    onError: onMutationError,
  });

  const assignMutation = useMutation({
    mutationFn: (d: { userId: string; name: string }) =>
      assignCaseDeveloper(caseItem.id, d.userId, d.name, currentUser?.name ?? "مدير"),
    onSuccess: invalidate,
    onError: onMutationError,
  });

  const solveMutation = useMutation({
    mutationFn: () => markCaseSolved(caseItem.id, solveNotes, requiresDeployment),
    onSuccess: () => {
      toast("تم إرسال الحل للسوبر أدمن", "success");
      invalidate();
    },
    onError: onMutationError,
  });

  const closeMutation = useMutation({
    mutationFn: () => closeCase(caseItem.id, currentUser?.name ?? "سوبر أدمن"),
    onSuccess: () => {
      toast("تم إغلاق الحالة", "success");
      invalidate();
    },
    onError: onMutationError,
  });

  const returnMutation = useMutation({
    mutationFn: () => returnCaseToDeveloper(caseItem.id, returnReason),
    onSuccess: invalidate,
    onError: onMutationError,
  });

  const reassignMutation = useMutation({
    mutationFn: () => reassignCaseDeveloper(caseItem.id, reassignDevId, reassignReason),
    onSuccess: () => {
      toast("تم إعادة الإسناد", "success");
      invalidate();
      setReassignDevId("");
      setReassignReason("");
      router.push("/cases");
    },
    onError: onMutationError,
  });

  const adminTransferMutation = useMutation({
    mutationFn: () =>
      reassignCaseDeveloper(caseItem.id, adminTransferDevId, adminTransferReason),
    onSuccess: () => {
      toast("تم تحويل الإسناد", "success");
      invalidate();
      setAdminTransferDevId("");
      setAdminTransferReason("");
    },
    onError: onMutationError,
  });

  const returnAdminMutation = useMutation({
    mutationFn: () => returnCaseToSuperAdmin(caseItem.id, returnAdminReason),
    onSuccess: () => {
      toast("تم إرجاع الحالة للسوبر أدمن", "success");
      invalidate();
      router.push("/cases");
    },
    onError: onMutationError,
  });

  const commentMutation = useMutation({
    mutationFn: () =>
      addCaseComment({
        caseId: caseItem.id,
        content: comment,
        authorId: currentUser?.id ?? "",
        authorName: currentUser?.name ?? "",
        isInternal: internalNote || isManager,
      }),
    onSuccess: () => {
      setComment("");
      invalidate();
    },
  });

  const attachMutation = useMutation({
    mutationFn: async (uploaded: UploadedFile) => {
      await addCaseAttachment(
        caseItem.id,
        uploaded.name,
        uploaded.attachmentType,
        uploaded.url,
        uploaded.size
      );
    },
    onSuccess: () => {
      invalidate();
      toast("تم رفع المرفق", "success");
    },
    onError: onMutationError,
  });

  async function handleAttachmentUpload(files: UploadedFile[]) {
    setZoneFiles(files);
    for (const file of files) {
      if (savedUrls.has(file.url)) continue;
      try {
        await attachMutation.mutateAsync(file);
        setSavedUrls((prev) => new Set(prev).add(file.url));
      } catch {
        break;
      }
    }
    setZoneFiles([]);
  }

  if (simple === "CLOSED") {
    return (
      <div className="rounded-2xl border-2 bg-muted/50 p-6 text-center">
        <p className="text-lg font-bold text-muted-foreground">الحالة مغلقة</p>
      </div>
    );
  }

  const isAssignedDev =
    isDev &&
    (caseItem.assignedDeveloperId === currentUser?.id ||
      caseItem.assignedDeveloperName === currentUser?.name);

  if (readOnly) {
    return (
      <div className="rounded-2xl border-2 border-dashed bg-muted/30 p-6 text-center sticky top-20">
        <p className="text-lg font-black text-muted-foreground">معاينة فقط</p>
        <p className="text-sm text-muted-foreground mt-2">
          {caseItem.status === "OPEN"
            ? "الحالة بانتظار تصنيف منسق الدعم — لا يمكنك التعديل"
            : "هذه الحالة مسندة لمطور آخر — لا يمكنك التعديل أو اتخاذ إجراء"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-base sticky top-20">
      {isManager && (
        <>
          {caseNeedsAcceptance(caseItem.status) && !hideReviewPanel && (
            <CaseReviewPanel caseItem={caseItem} onSuccess={invalidate} />
          )}

          {caseNeedsClassifyAssign(caseItem.status) && !hideReviewPanel && (
            <CaseClassifyAssignPanel caseItem={caseItem} onSuccess={invalidate} />
          )}

          {simple === "IN_PROGRESS" &&
            caseItem.caseType === "BUG" &&
            caseItem.assignedDeveloperId && (
              <Card className="border-2 border-violet-200 rounded-2xl shadow-sm">
                <CardHeader className="pb-2 bg-violet-50 dark:bg-violet-950/30 rounded-t-2xl">
                  <CardTitle className="text-lg font-black flex items-center gap-2">
                    <ArrowUpRight className="h-5 w-5" />
                    تحويل الإسناد
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    المسند حالياً:{" "}
                    <span className="font-bold text-foreground">
                      {caseItem.assignedDeveloperName ?? "—"}
                    </span>
                  </p>
                  <SpecialtyAssignSelect
                    value={adminTransferDevId}
                    onValueChange={setAdminTransferDevId}
                    placeholder="تحويل إلى..."
                    triggerClassName="h-11 border-2 text-start"
                  />
                  <Textarea
                    placeholder="سبب التحويل..."
                    value={adminTransferReason}
                    onChange={(e) => setAdminTransferReason(e.target.value)}
                    rows={2}
                    className="text-base"
                  />
                  <Button
                    className="w-full h-11"
                    disabled={
                      !adminTransferDevId ||
                      !adminTransferReason.trim() ||
                      adminTransferMutation.isPending
                    }
                    onClick={() => adminTransferMutation.mutate()}
                  >
                    <ArrowUpRight className="h-4 w-4 me-2" />
                    تحويل لشخص آخر
                  </Button>
                </CardContent>
              </Card>
            )}

          {simple === "SOLVED" && (
            <Card className="border-2 border-emerald-200 rounded-2xl shadow-sm">
              <CardHeader className="pb-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-t-2xl">
                <CardTitle className="text-lg font-black text-emerald-800 dark:text-emerald-300">تأكيد الحل</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full h-12 text-base" onClick={() => closeMutation.mutate()}>
                  <CheckCircle className="h-5 w-5 me-2" />
                  قبول وإغلاق
                </Button>
                <Textarea
                  placeholder="سبب الإرجاع للمطور..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows={2}
                  className="text-base"
                />
                <Button
                  variant="outline"
                  className="w-full h-11"
                  disabled={!returnReason.trim()}
                  onClick={() => returnMutation.mutate()}
                >
                  <RotateCcw className="h-4 w-4 me-2" />
                  إرجاع للمطور
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {isAssignedDev && simple === "IN_PROGRESS" && (
        <Card className="border-2 border-sky-200 rounded-2xl shadow-sm">
          <CardHeader className="pb-2 bg-sky-50 dark:bg-sky-950/30 rounded-t-2xl">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                المشكلة المسندة إليك
              </CardTitle>
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white">قيد العمل</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              عند الانتهاء من الإصلاح، أرسل الحل — سيصل إشعار للسوبر أدمن للمراجعة والإغلاق.
            </p>
            <Textarea
              placeholder="اكتب الحل بالتفصيل..."
              value={solveNotes}
              onChange={(e) => setSolveNotes(e.target.value)}
              rows={4}
              className="text-base"
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={requiresDeployment}
                onChange={(e) => setRequiresDeployment(e.target.checked)}
                className="h-4 w-4"
              />
              يتطلب نشر بعد الحل
            </label>
            <Button
              className="w-full h-12 text-base gap-2"
              disabled={!solveNotes.trim() || solveMutation.isPending}
              onClick={() => solveMutation.mutate()}
            >
              <CheckCircle className="h-5 w-5" />
              تم الحل — إشعار السوبر أدمن
            </Button>

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-black flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                إعادة إسناد لمطور آخر
              </p>
              <SpecialtyAssignSelect
                value={reassignDevId}
                onValueChange={setReassignDevId}
                placeholder="اختر المطور..."
                triggerClassName="h-11 border-2 text-start"
              />
              <Textarea
                placeholder="سبب إعادة الإسناد..."
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                rows={2}
                className="text-base"
              />
              <Button
                variant="outline"
                className="w-full h-11"
                disabled={
                  !reassignDevId ||
                  !reassignReason.trim() ||
                  reassignMutation.isPending
                }
                onClick={() => reassignMutation.mutate()}
              >
                <UserRound className="h-4 w-4 me-2" />
                إعادة إسناد
              </Button>
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-black flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4" />
                إرجاع للسوبر أدمن
              </p>
              <Textarea
                placeholder="سبب الإرجاع للسوبر أدمن..."
                value={returnAdminReason}
                onChange={(e) => setReturnAdminReason(e.target.value)}
                rows={2}
                className="text-base"
              />
              <Button
                variant="outline"
                className="w-full h-11 border-amber-300 text-amber-800 hover:bg-amber-50"
                disabled={!returnAdminReason.trim() || returnAdminMutation.isPending}
                onClick={() => returnAdminMutation.mutate()}
              >
                <ArrowUpRight className="h-4 w-4 me-2" />
                إرجاع للسوبر أدمن
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-2 rounded-2xl shadow-sm">
        <CardHeader className="pb-2 bg-muted/30 rounded-t-2xl">
          <CardTitle className="text-lg font-black">تعليق</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            placeholder="اكتب تعليقاً..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="text-base"
          />
          {isManager && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={internalNote}
                onChange={(e) => setInternalNote(e.target.checked)}
                className="h-4 w-4"
              />
              ملاحظة داخلية (لا يراها دعم المراكز)
            </label>
          )}
          <Button
            size="lg"
            className="w-full"
            disabled={!comment.trim()}
            onClick={() => commentMutation.mutate()}
          >
            إرسال
          </Button>
        </CardContent>
      </Card>

      <Card className="border-2 rounded-2xl shadow-sm">
        <CardHeader className="pb-2 bg-muted/30 rounded-t-2xl">
          <CardTitle className="text-lg font-black">مرفقات</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUploadZone
            files={zoneFiles}
            onChange={handleAttachmentUpload}
            label="اسحب الملف هنا أو انقر للرفع"
            maxFiles={6}
            compact
          />
        </CardContent>
      </Card>
    </div>
  );
}
