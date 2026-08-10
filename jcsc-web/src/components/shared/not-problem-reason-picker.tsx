"use client";

import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  NOT_APP_TECHNICAL_ISSUE_OPTIONS,
  NOT_APP_ISSUE_CATEGORIES,
  type NotAppTechnicalIssueId,
  type NotAppIssueCategory,
} from "@/lib/case-classification";

export function NotProblemReasonPicker({
  value,
  onChange,
  note,
  onNoteChange,
  highlightDuplicate,
  className,
}: {
  value: NotAppTechnicalIssueId;
  onChange: (id: NotAppTechnicalIssueId) => void;
  note?: string;
  onNoteChange?: (note: string) => void;
  highlightDuplicate?: boolean;
  className?: string;
}) {
  const selected = NOT_APP_TECHNICAL_ISSUE_OPTIONS.find((o) => o.id === value);

  const byCategory = NOT_APP_ISSUE_CATEGORIES.map((cat) => ({
    ...cat,
    items: NOT_APP_TECHNICAL_ISSUE_OPTIONS.filter((o) => o.category === cat.id),
  })).filter((g) => g.items.length > 0);

  return (
    <div className={cn("space-y-4", className)}>
      <p className="text-sm text-muted-foreground leading-relaxed">
        هذه الأعطال <strong className="text-foreground">لا علاقة لها بالتطبيق</strong> — اختر
        السبب الفني الأقرب لوصف البلاغ.
      </p>

      {byCategory.map((group) => (
        <div key={group.id} className="space-y-2">
          <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">
            {group.label}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map((opt) => {
              const active = value === opt.id;
              const isDup = opt.id === "DUPLICATE" && highlightDuplicate;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange(opt.id)}
                  className={cn(
                    "rounded-xl border-2 px-3 py-3 text-start transition-all",
                    active
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border bg-muted/20 hover:border-primary/35 hover:bg-muted/40",
                    isDup && !active && "ring-1 ring-amber-400/50"
                  )}
                >
                  <span className="text-sm font-black leading-snug block">{opt.label}</span>
                  <span
                    className={cn(
                      "text-[11px] mt-1 block leading-relaxed",
                      active ? "text-primary/80" : "text-muted-foreground"
                    )}
                  >
                    {opt.hint}
                  </span>
                  {isDup && (
                    <span className="text-[10px] font-black text-amber-600 mt-1 block">
                      يوجد بلاغات مشابهة
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selected && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <p className="font-black text-primary">{selected.label}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{selected.hint}</p>
        </div>
      )}

      {onNoteChange !== undefined && (
        <Textarea
          placeholder="ملاحظة إضافية للباحث أو فريق الدعم (اختياري)..."
          value={note ?? ""}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={2}
          className="border-2 text-sm"
        />
      )}
    </div>
  );
}
