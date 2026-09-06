"use client";

import { PERMISSION_MATRIX } from "@/lib/permissions-matrix";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UserPermissionsPickerProps {
  value: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
  /** Restrict which permission keys can be toggled (e.g. support supervisor) */
  allowedKeys?: readonly string[];
}

export function UserPermissionsPicker({
  value,
  onChange,
  disabled,
  allowedKeys,
}: UserPermissionsPickerProps) {
  const toggle = (key: string) => {
    if (disabled) return;
    if (allowedKeys && !allowedKeys.includes(key)) return;
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  };

  const screens = allowedKeys
    ? PERMISSION_MATRIX.map((screen) => ({
        ...screen,
        actions: screen.actions.filter((a) => allowedKeys.includes(a.key)),
      })).filter((s) => s.actions.length > 0)
    : PERMISSION_MATRIX;

  return (
    <div className="space-y-4 rounded-2xl border-2 p-5 bg-muted/20 text-start">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <p className="text-sm font-black">صلاحيات إضافية</p>
        {value.length > 0 && (
          <Badge variant="secondary" className="font-black">
            {value.length} {value.length === 1 ? "صلاحية" : "صلاحيات"}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {screens.map((screen) => (
          <div
            key={screen.screen}
            className="rounded-xl border bg-background/80 p-4 space-y-2.5"
          >
            <p className="text-xs font-black text-primary">{screen.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {screen.actions.map((action) => {
                const active = value.includes(action.key);
                return (
                  <Button
                    key={action.key}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    disabled={disabled}
                    className={cn("text-xs font-bold h-8", active && "shadow-sm")}
                    onClick={() => toggle(action.key)}
                  >
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-3 border-t">
          <p className="w-full text-xs font-bold text-muted-foreground mb-1">المحدّد:</p>
          {value.map((k) => (
            <Badge key={k} variant="secondary" className="text-xs font-bold">
              {PERMISSION_MATRIX.flatMap((s) => s.actions).find((a) => a.key === k)?.label ?? k}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
