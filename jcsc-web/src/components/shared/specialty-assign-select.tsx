"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  assigneeSelectValue,
  getAssigneeOptions,
} from "@/lib/services/assignees";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { canSelectDeveloperAssignee } from "@/lib/permissions";

interface SpecialtyAssignSelectProps {
  value: string;
  onValueChange: (developerId: string) => void;
  placeholder?: string;
  triggerClassName?: string;
}

/** إسناد إلى مطور — للسوبر أدمن أو المطورين عند تحويل الحالة */
export function SpecialtyAssignSelect({
  value,
  onValueChange,
  placeholder = "اختر المسؤول...",
  triggerClassName,
}: SpecialtyAssignSelectProps) {
  const user = useEffectiveUser();
  const allowed = canSelectDeveloperAssignee(user?.role);

  const { data: assignees, isLoading } = useQuery({
    queryKey: ["assignee-options"],
    queryFn: getAssigneeOptions,
    staleTime: 60_000,
    enabled: allowed,
  });

  if (!allowed) return null;

  const options = assignees ?? [];
  const selected = options.find((o) => assigneeSelectValue(o) === value);

  return (
    <Select value={value || undefined} onValueChange={onValueChange}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={isLoading ? "جاري التحميل..." : placeholder}>
          {selected?.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" className="z-[200]">
        {options.map((option) => (
          <SelectItem
            key={option.id}
            value={assigneeSelectValue(option)}
            className="text-base py-3"
          >
            <span className="flex flex-col items-start gap-0.5">
              <span>{option.name}</span>
              {option.team ? (
                <span className="text-[11px] font-medium text-muted-foreground">{option.team}</span>
              ) : null}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
