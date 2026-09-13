"use client";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface NotProblemCommentFormProps {
  note: string;
  onNoteChange: (note: string) => void;
  message?: string;
  placeholder?: string;
  className?: string;
}

export function NotProblemCommentForm({
  note,
  onNoteChange,
  message = "سيتم إغلاق البلاغ كـ «ليست مشكلة». يمكنك إضافة تعليق أو المتابعة بدونه.",
  placeholder = "تعليق (اختياري)...",
  className,
}: NotProblemCommentFormProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
      <div className="space-y-2">
        <label className="text-sm font-black">تعليق (اختياري)</label>
        <Textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="border-2 text-sm"
        />
      </div>
    </div>
  );
}
