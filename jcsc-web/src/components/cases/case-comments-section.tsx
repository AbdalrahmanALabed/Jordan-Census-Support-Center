"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addCaseComment } from "@/lib/services/cases";
import type { CaseComment } from "@/lib/cases";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { useToast } from "@/components/ui/toast";
import { cn, formatDate } from "@/lib/utils";

function AuthorAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0) || "?";
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-black text-primary">
      {initial}
    </div>
  );
}

interface CaseCommentsSectionProps {
  caseId: string;
  comments: CaseComment[];
  compact?: boolean;
}

export function CaseCommentsSection({
  caseId,
  comments,
  compact = false,
}: CaseCommentsSectionProps) {
  const user = useEffectiveUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["case", caseId] });
    queryClient.invalidateQueries({ queryKey: ["case-comments", caseId] });
    queryClient.invalidateQueries({ queryKey: ["case-timeline", caseId] });
  };

  const commentMutation = useMutation({
    mutationFn: () =>
      addCaseComment({
        caseId,
        content: content.trim(),
        authorId: user?.id ?? "",
        authorName: user?.name ?? "مستخدم",
        isInternal: false,
      }),
    onSuccess: () => {
      setContent("");
      invalidate();
      toast("تم إضافة التعليق", "success");
    },
    onError: (e: Error) => toast(e.message || "فشل إرسال التعليق", "error"),
  });

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div className="rounded-2xl border-2 bg-card p-4 md:p-5 shadow-sm space-y-3">
        <p className="text-sm font-black flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          إضافة تعليق
        </p>
        <Textarea
          placeholder="اكتب تعليقك..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={compact ? 2 : 3}
          className="text-base border-2"
        />
        <Button
          className="w-full sm:w-auto font-bold"
          disabled={!content.trim() || commentMutation.isPending}
          onClick={() => commentMutation.mutate()}
        >
          {commentMutation.isPending ? "جاري الإرسال..." : "إرسال التعليق"}
        </Button>
      </div>

      {!comments.length ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/20 py-10 text-center">
          <MessageSquare className="h-9 w-9 text-muted-foreground/40 mb-2" />
          <p className="font-bold text-muted-foreground">لا تعليقات بعد</p>
          <p className="text-sm text-muted-foreground mt-1">كن أول من يضيف تعليقاً</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((cm) => (
            <div key={cm.id} className="rounded-2xl border-2 bg-card p-4 md:p-5">
              <div className="flex items-start gap-3">
                <AuthorAvatar name={cm.authorName} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className="font-black">{cm.authorName}</p>
                    <time
                      className="text-xs font-bold text-muted-foreground tabular-nums"
                      dateTime={cm.createdAt}
                    >
                      {formatDate(cm.createdAt)}
                    </time>
                  </div>
                  <p className="mt-2 text-base leading-relaxed whitespace-pre-wrap">
                    {cm.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
