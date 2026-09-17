import { Info } from "lucide-react";
import { PASSWORD_HINT_LINES } from "@/lib/auth/password-policy";

export function PasswordRequirementsHint({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3 text-start ${className}`}
      aria-live="polite"
    >
      <p className="flex items-center gap-2 text-xs font-black text-foreground mb-2">
        <Info className="h-3.5 w-3.5 text-primary shrink-0" />
        متطلبات كلمة المرور الجديدة
      </p>
      <ul className="text-xs text-muted-foreground space-y-1 leading-relaxed">
        {PASSWORD_HINT_LINES.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="text-primary font-bold shrink-0">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
