"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  LogIn,
  Shield,
  BarChart3,
  Users,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ClipboardList,
  Headphones,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JordanCensusLogo } from "@/components/brand/jordan-census-logo";
import { cn } from "@/lib/utils";
import { withBasePath } from "@/lib/base-path";

const FEATURES = [
  {
    icon: BarChart3,
    label: "لوحة عمليات",
    desc: "مؤشرات حية وإحصائيات فورية",
    color: "text-indigo-400",
    bg: "bg-indigo-500/15",
  },
  {
    icon: ClipboardList,
    label: "إدارة البلاغات",
    desc: "تتبع الحالات من الميدان للحل",
    color: "text-cyan-400",
    bg: "bg-cyan-500/15",
  },
  {
    icon: Users,
    label: "الفرق والصلاحيات",
    desc: "أدوار دقيقة لكل مستخدم",
    color: "text-violet-400",
    bg: "bg-violet-500/15",
  },
  {
    icon: Shield,
    label: "أمان وسجلات",
    desc: "تدقيق كامل لكل عملية",
    color: "text-amber-400",
    bg: "bg-amber-500/15",
  },
];

const STATS = [
  { value: "4", label: "أنظمة تعداد" },
  { value: "24/7", label: "دعم ميداني" },
  { value: "2026", label: "التعداد الوطني" },
];

function FieldGroup({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 text-start">
      <label className="flex items-center gap-2 text-sm font-black text-white/90">
        <Icon className="h-4 w-4 text-indigo-300 shrink-0" />
        {label}
      </label>
      {children}
    </div>
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = withBasePath(searchParams.get("callbackUrl") ?? "/dashboard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function performLogin(emailValue: string, passwordValue: string) {
    const trimmedEmail = emailValue.trim().toLowerCase();
    const trimmedPassword = passwordValue.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: trimmedEmail,
        password: trimmedPassword,
        redirect: false,
        callbackUrl,
      });

      if (result?.error || !result?.ok) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        setLoading(false);
        return;
      }

      let redirectTarget = callbackUrl;
      if (!callbackUrl.startsWith("/")) {
        try {
          const parsed = new URL(result.url ?? callbackUrl, window.location.origin);
          if (parsed.origin === window.location.origin) {
            redirectTarget = `${parsed.pathname}${parsed.search}${parsed.hash}`;
          }
        } catch {
          redirectTarget = callbackUrl;
        }
      }
      window.location.assign(withBasePath(redirectTarget));
    } catch {
      setError("تعذّر إكمال تسجيل الدخول — حاول مرة أخرى");
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const formEmail = String(formData.get("email") ?? "").trim().toLowerCase();
    const formPassword = String(formData.get("password") ?? "").trim();
    await performLogin(formEmail || email, formPassword || password);
  }

  return (
    <div className="login-page-shell relative flex min-h-screen overflow-hidden" dir="rtl">
      <div className="login-page-ambient pointer-events-none absolute inset-0" aria-hidden />

      <div className="login-form-side relative z-10 flex flex-1 items-center justify-center p-5 sm:p-8 lg:p-12">
        <div className="relative z-10 w-full max-w-[420px] space-y-6 animate-fade-in-up">
          <div className="lg:hidden flex justify-center pb-2">
            <JordanCensusLogo variant="sidebar" size="lg" showText />
          </div>

          <div className="login-form-card rounded-3xl overflow-hidden">
            <div className="h-1.5 w-full login-accent-bar" />

            <div className="p-7 sm:p-9">
              <div className="text-start mb-8">
                <div className="login-icon-badge hidden lg:inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-5">
                  <LogIn className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">تسجيل الدخول</h2>
                <p className="text-sm text-white/60 mt-2 leading-relaxed">
                  مرحباً بك في مركز دعم التعداد السكاني
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <FieldGroup label="البريد الإلكتروني" icon={Mail}>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      name="email"
                      type="email"
                      autoComplete="email"
                      className="h-12 rounded-xl border-2 border-white/20 bg-white/95 ps-10 text-start text-foreground shadow-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase())}
                      required
                      dir="ltr"
                      placeholder="name@jcsc.gov.jo"
                    />
                  </div>
                </FieldGroup>

                <FieldGroup label="كلمة المرور" icon={Lock}>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="h-12 rounded-xl border-2 border-white/20 bg-white/95 ps-10 pe-11 text-start text-foreground shadow-sm"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      dir="ltr"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FieldGroup>

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 text-sm font-bold text-destructive bg-destructive/10 rounded-xl px-4 py-3 border border-destructive/25 text-start"
                  >
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="ghost"
                  className="btn-create-report w-full h-14 text-base sm:text-lg font-black rounded-xl border-0 hover:opacity-90 gap-2 shadow-none"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      جاري الدخول...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" />
                      دخول إلى المنصة
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>

          <p className="flex items-center justify-center gap-2 text-xs text-white/45">
            <Shield className="h-3.5 w-3.5 text-indigo-300/80" />
            <span>اتصال آمن — للاستخدام الرسمي فقط</span>
          </p>
        </div>
      </div>

      <div className="login-brand-side hidden lg:flex lg:w-[46%] xl:w-[52%] relative z-10 flex-col justify-between p-10 xl:p-14 overflow-hidden border-s border-white/[0.08]">
        <div className="login-orb absolute top-16 start-16 h-80 w-80 rounded-full bg-indigo-400/25" />
        <div className="login-orb login-orb-delay absolute bottom-20 end-10 h-64 w-64 rounded-full bg-violet-400/20" />
        <div className="login-orb absolute top-[42%] start-[38%] h-44 w-44 rounded-full bg-indigo-300/15" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />

        <JordanCensusLogo variant="sidebar" size="lg" showText className="relative z-10" />

        <div className="relative z-10 space-y-10 flex-1 flex flex-col justify-center py-10">
          <div className="text-start max-w-lg">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-bold text-indigo-200 mb-5">
              <Headphones className="h-3.5 w-3.5" />
              Jordan Census Support Center · 2026
            </p>
            <h1 className="text-4xl xl:text-[2.75rem] font-black text-white leading-[1.15] tracking-tight">
              مركز دعم
              <br />
              <span className="bg-gradient-to-l from-indigo-300 via-violet-200 to-sky-300 bg-clip-text text-transparent">
                التعداد السكاني
              </span>
            </h1>
            <p className="mt-5 text-base xl:text-lg text-white/60 leading-relaxed">
              منصة موحّدة لإدارة البلاغات والحالات والدعم الميداني — التعداد الوطني 2026
            </p>
          </div>

          <div className="flex flex-wrap gap-6 text-start">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-black text-white tabular-nums">{value}</p>
                <p className="text-sm text-white/50 font-bold mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-xl">
            {FEATURES.map(({ icon: Icon, label, desc, color, bg }) => (
              <div
                key={label}
                className="group rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/[0.1] p-4 text-start transition-all duration-300 hover:bg-white/[0.12] hover:border-white/20 hover:-translate-y-0.5"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-white/10 mb-3",
                    bg
                  )}
                >
                  <Icon className={cn("h-5 w-5", color)} />
                </div>
                <p className="text-sm font-black text-white/90">{label}</p>
                <p className="text-xs text-white/45 mt-1 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/30 text-start">
          © 2026 دائرة الإحصاءات العامة — مركز دعم التعداد
        </p>
      </div>
    </div>
  );
}
