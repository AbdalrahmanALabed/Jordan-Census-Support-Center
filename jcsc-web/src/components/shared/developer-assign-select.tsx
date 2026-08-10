"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeveloperSpecialtyBadge } from "@/components/shared/developer-specialty-badge";
import {
  DEVELOPER_SPECIALTIES,
  resolveDeveloperSpecialty,
} from "@/lib/developer-specialties";
import type { User } from "@/lib/types";

interface DeveloperAssignSelectProps {
  developers: User[] | undefined;
  value: string;
  onValueChange: (id: string) => void;
  placeholder?: string;
  triggerClassName?: string;
}

export function DeveloperAssignSelect({
  developers,
  value,
  onValueChange,
  placeholder = "اختر المطور المسؤول...",
  triggerClassName,
}: DeveloperAssignSelectProps) {
  const grouped = DEVELOPER_SPECIALTIES.map((spec) => ({
    spec,
    members: (developers ?? []).filter(
      (d) => resolveDeveloperSpecialty(d) === spec.value
    ),
  })).filter((g) => g.members.length > 0);

  const ungrouped = (developers ?? []).filter((d) => !resolveDeveloperSpecialty(d));

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {grouped.map(({ spec, members }) => (
          <SelectGroup key={spec.value}>
            <SelectLabel className="text-xs font-black text-primary">
              {spec.label}
            </SelectLabel>
            {members.map((d) => (
              <SelectItem key={d.id} value={d.id} className="text-base py-3">
                <span className="flex items-center gap-2 flex-wrap">
                  {d.name}
                  <DeveloperSpecialtyBadge user={d} />
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
        {ungrouped.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-xs font-black">أخرى</SelectLabel>
            {ungrouped.map((d) => (
              <SelectItem key={d.id} value={d.id} className="text-base py-3">
                {d.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}
