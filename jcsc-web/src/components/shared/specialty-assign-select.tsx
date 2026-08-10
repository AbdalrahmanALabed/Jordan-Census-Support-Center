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

interface SpecialtyAssignSelectProps {
  value: string;
  onValueChange: (developerId: string) => void;
  placeholder?: string;
  triggerClassName?: string;
}

/** إسناد إلى — قائمة الأسماء الثابتة (11) */
export function SpecialtyAssignSelect({
  value,
  onValueChange,
  placeholder = "اختر المسؤول...",
  triggerClassName,
}: SpecialtyAssignSelectProps) {
  const { data: assignees, isLoading } = useQuery({
    queryKey: ["assignee-options"],
    queryFn: getAssigneeOptions,
    staleTime: 60_000,
  });

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
            key={option.name}
            value={assigneeSelectValue(option)}
            className="text-base py-3"
          >
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
