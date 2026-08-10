import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { JordanCensusLogo } from "@/components/brand/jordan-census-logo";
import { Loader2 } from "lucide-react";

function LoginFallback() {
  return (
    <div className="login-page-shell relative flex min-h-screen flex-col items-center justify-center gap-4" dir="rtl">
      <div className="login-page-ambient pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <JordanCensusLogo variant="sidebar" size="lg" showText />
        <div className="flex items-center gap-2 text-sm font-bold text-white/70">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
          جاري التحميل...
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
