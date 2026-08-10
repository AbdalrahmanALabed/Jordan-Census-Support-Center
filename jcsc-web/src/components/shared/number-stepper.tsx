"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function NumberStepper({
  value,
  onChange,
  min = 1,
  max,
  className,
}: NumberStepperProps) {
  const canDecrease = value > min;
  const canIncrease = max === undefined || value < max;

  return (
    <div
      className={cn(
        "inline-flex h-12 w-full max-w-xs items-stretch overflow-hidden rounded-xl border-2 bg-background",
        className
      )}
      dir="ltr"
    >
      <button
        type="button"
        aria-label="تقليل العدد"
        disabled={!canDecrease}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(
          "flex w-12 shrink-0 items-center justify-center border-e transition-colors",
          canDecrease
            ? "hover:bg-muted text-foreground"
            : "cursor-not-allowed text-muted-foreground/40"
        )}
      >
        <Minus className="h-5 w-5" />
      </button>
      <span
        className="flex flex-1 items-center justify-center text-xl font-black tabular-nums"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="زيادة العدد"
        disabled={!canIncrease}
        onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
        className={cn(
          "flex w-12 shrink-0 items-center justify-center border-s transition-colors",
          canIncrease
            ? "hover:bg-muted text-foreground"
            : "cursor-not-allowed text-muted-foreground/40"
        )}
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}
