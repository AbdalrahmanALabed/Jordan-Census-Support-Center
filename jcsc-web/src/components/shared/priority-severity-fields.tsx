"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CaseSeverity } from "@/lib/cases/types";
import {
  ADMIN_PRIORITY_OPTIONS,
  PRIORITY_FIELD_LABEL,
  SEVERITY_FIELD_LABEL,
  SEVERITY_LABELS,
  SEVERITY_OPTIONS,
  normalizeAdminPriority,
  normalizeAdminSeverity,
} from "@/lib/case-classification";
import { PRIORITY_LABELS, type IssuePriority } from "@/lib/types";

interface PrioritySeverityFieldsProps {
  priority: IssuePriority;
  severity: CaseSeverity;
  onPriorityChange: (value: IssuePriority) => void;
  onSeverityChange: (value: CaseSeverity) => void;
  triggerClassName?: string;
  layout?: "grid" | "stack";
}

export function PrioritySeverityFields({
  priority,
  severity,
  onPriorityChange,
  onSeverityChange,
  triggerClassName = "h-11 border-2",
  layout = "grid",
}: PrioritySeverityFieldsProps) {
  const wrapperClass =
    layout === "grid" ? "grid gap-3 sm:grid-cols-2" : "space-y-3";

  const normalizedPriority = normalizeAdminPriority(priority);
  const normalizedSeverity = normalizeAdminSeverity(severity);

  return (
    <div className={wrapperClass} dir="rtl">
      <div className="text-start">
        <p className="text-sm font-black mb-2">{PRIORITY_FIELD_LABEL} *</p>
        <Select
          value={normalizedPriority}
          onValueChange={(v) => onPriorityChange(v as IssuePriority)}
        >
          <SelectTrigger className={triggerClassName}>
            <SelectValue placeholder="اختر الأولوية...">
              {PRIORITY_LABELS[normalizedPriority]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent dir="rtl" align="start" position="popper" className="z-[200]">
            {ADMIN_PRIORITY_OPTIONS.map(([k, label]) => (
              <SelectItem key={k} value={k} className="text-base py-3">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="text-start">
        <p className="text-sm font-black mb-2">{SEVERITY_FIELD_LABEL} *</p>
        <Select
          value={normalizedSeverity}
          onValueChange={(v) => onSeverityChange(v as CaseSeverity)}
        >
          <SelectTrigger className={triggerClassName}>
            <SelectValue placeholder="اختر الخطورة...">
              {SEVERITY_LABELS[normalizedSeverity]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent dir="rtl" align="start" position="popper" className="z-[200]">
            {SEVERITY_OPTIONS.map(([k, label]) => (
              <SelectItem key={k} value={k} className="text-base py-3">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
