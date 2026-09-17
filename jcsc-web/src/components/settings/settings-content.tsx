"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Sun,
  Moon,
  Monitor,
  Globe,
  User,
  Mail,
  BellRing,
  Bell,
  Palette,
  Shield,
  ChevronLeft,
  UsersRound,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHero } from "@/components/shared/ops-ui";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { isSuperAdminRole, isDeveloperRole } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/types";
import { getSpecialtyLabel } from "@/lib/developer-specialties";
import { cn } from "@/lib/utils";
import {
  isNotificationSoundEnabled,
  playNotificationSound,
  setNotificationSoundEnabled,
} from "@/lib/notifications/sound";
import { SettingsSection } from "@/components/settings/settings-section-parts";
import { ChangePasswordSection } from "@/components/settings/change-password-section";

const NOTIFY_EMAIL_KEY = "jcsc_notify_email";
const NOTIFY_INAPP_KEY = "jcsc_notify_inapp";

function userInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "JC";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

function SettingToggle({
  title,
  description,
  enabled,
  onToggle,
  icon: Icon,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border-2 bg-muted/15 px-4 py-4">
      <div className="flex items-start gap-3 min-w-0 text-start">
        <div className="rounded-lg bg-background p-2 shrink-0 ring-1 ring-border/50">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-black text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={cn(
          "relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors",
          enabled ? "bg-primary border-primary" : "bg-muted border-border"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
            enabled ? "-translate-x-6" : "-translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

function ThemeOption({
  value,
  current,
  label,
  icon: Icon,
  onSelect,
}: {
  value: string;
  current?: string;
  label: string;
  icon: React.ElementType;
  onSelect: () => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all flex-1 min-w-[5.5rem]",
        active
          ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20"
          : "border-border bg-muted/20 hover:border-primary/30 hover:bg-muted/40"
      )}
    >
      <Icon className={cn("h-6 w-6", active ? "text-primary" : "text-muted-foreground")} />
      <span className={cn("text-sm font-black", active ? "text-primary" : "text-foreground")}>
        {label}
      </span>
    </button>
  );
}

function AdminLinkCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border-2 bg-muted/15 px-4 py-4 transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
    >
      <div className="rounded-xl bg-primary/10 p-2.5 shrink-0 group-hover:bg-primary/15 transition-colors">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1 text-start">
        <p className="font-black text-sm group-hover:text-primary transition-colors">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ChevronLeft className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
    </Link>
  );
}

export function SettingsContent() {
  const { theme, setTheme } = useTheme();
  const user = useEffectiveUser();
  const [mounted, setMounted] = useState(false);
  const [emailNotify, setEmailNotify] = useState(true);
  const [inAppNotify, setInAppNotify] = useState(true);
  const [soundNotify, setSoundNotify] = useState(true);

  const isSuperAdmin = isSuperAdminRole(user?.role);
  const isDev = isDeveloperRole(user?.role ?? "");
  const roleLabel = user?.role ? ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] : "—";
  const specialtyLabel =
    user?.role && isDev
      ? getSpecialtyLabel({ role: user.role, team: user.team ?? undefined })
      : null;

  useEffect(() => {
    setMounted(true);
    setEmailNotify(localStorage.getItem(NOTIFY_EMAIL_KEY) !== "false");
    setInAppNotify(localStorage.getItem(NOTIFY_INAPP_KEY) !== "false");
    setSoundNotify(isNotificationSoundEnabled());
  }, []);

  function toggleEmail() {
    const next = !emailNotify;
    setEmailNotify(next);
    localStorage.setItem(NOTIFY_EMAIL_KEY, String(next));
  }

  function toggleInApp() {
    const next = !inAppNotify;
    setInAppNotify(next);
    localStorage.setItem(NOTIFY_INAPP_KEY, String(next));
  }

  function toggleSound() {
    const next = !soundNotify;
    setSoundNotify(next);
    setNotificationSoundEnabled(next);
    if (next) playNotificationSound({ force: true });
  }

  return (
    <div dir="rtl" className="content-container pb-10 space-y-6 text-start">
      <PageHero
        title="الإعدادات"
        subtitle="تخصيص المظهر، الإشعارات، وعرض بيانات حسابك"
        variant="calm"
      >
        <div className="flex items-center gap-2 rounded-xl bg-background/60 border px-4 py-2.5">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          <span className="text-sm font-black">{roleLabel}</span>
        </div>
      </PageHero>

      {/* Profile */}
      <section className="rounded-2xl border-2 bg-gradient-to-l from-primary/5 via-card to-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Avatar className="h-16 w-16 ring-4 ring-primary/15 shrink-0">
            <AvatarFallback className="bg-brand-gradient text-lg font-black text-white">
              {userInitials(user?.name ?? "")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-3 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black">{user?.name || "مستخدم"}</h2>
              <Badge className="font-bold">{roleLabel}</Badge>
              {specialtyLabel && (
                <Badge variant="outline" className="font-bold text-primary border-primary/30">
                  {specialtyLabel}
                </Badge>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  الاسم
                </label>
                <Input value={user?.name ?? ""} disabled className="h-10 bg-background/80" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  البريد الإلكتروني
                </label>
                <Input
                  value={user?.email ?? ""}
                  disabled
                  dir="ltr"
                  className="h-10 bg-background/80 text-start"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              تعديل الاسم والبريد يتم من قبل مدير النظام
            </p>
          </div>
        </div>
      </section>

      <ChangePasswordSection />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Appearance */}
        <SettingsSection
          title="المظهر"
          description="اختر وضع العرض المناسب لك"
          icon={Palette}
        >
          {mounted ? (
            <div className="flex gap-2 flex-wrap">
              <ThemeOption
                value="light"
                current={theme}
                label="فاتح"
                icon={Sun}
                onSelect={() => setTheme("light")}
              />
              <ThemeOption
                value="dark"
                current={theme}
                label="داكن"
                icon={Moon}
                onSelect={() => setTheme("dark")}
              />
              <ThemeOption
                value="system"
                current={theme}
                label="تلقائي"
                icon={Monitor}
                onSelect={() => setTheme("system")}
              />
            </div>
          ) : (
            <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />
          )}
        </SettingsSection>

        {/* Language */}
        <SettingsSection
          title="اللغة"
          description="لغة واجهة التطبيق"
          icon={Globe}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3">
              <div className="text-start">
                <p className="font-black text-sm">العربية</p>
                <p className="text-xs text-muted-foreground">RTL — الافتراضي</p>
              </div>
              <Badge className="bg-primary text-primary-foreground font-bold">نشط</Badge>
            </div>
            <Button variant="outline" disabled className="w-full h-11 font-bold opacity-60">
              English — قريباً
            </Button>
          </div>
        </SettingsSection>
      </div>

      <SettingsSection
        title="الإشعارات"
        description="تنبيهات داخل التطبيق وصوت عند وصول إشعار جديد"
        icon={BellRing}
      >
        <div className="space-y-3">
          <SettingToggle
            title="صوت الإشعارات"
            description="نغمة قصيرة عند وصول إشعار جديد"
            enabled={soundNotify}
            onToggle={toggleSound}
            icon={BellRing}
          />
          {isSuperAdmin && (
            <>
              <SettingToggle
                title="إشعارات داخل التطبيق"
                description="جرس الإشعارات في الشريط العلوي"
                enabled={inAppNotify}
                onToggle={toggleInApp}
                icon={Bell}
              />
              <SettingToggle
                title="إشعارات البريد الإلكتروني"
                description={`رسائل إلى ${user?.email || "بريدك المسجّل"}`}
                enabled={emailNotify}
                onToggle={toggleEmail}
                icon={Mail}
              />
            </>
          )}
        </div>
      </SettingsSection>

      {/* Admin shortcuts */}
      {isSuperAdmin && (
        <SettingsSection
          title="إدارة النظام"
          description="اختصارات للسوبر أدمن"
          icon={Shield}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminLinkCard
              href="/users"
              title="المستخدمون"
              description="إدارة الحسابات والصلاحيات"
              icon={UsersRound}
            />
            <AdminLinkCard
              href="/email-templates"
              title="قوالب البريد"
              description="معاينة وتعديل رسائل البريد"
              icon={FileText}
            />
            <AdminLinkCard
              href="/notifications"
              title="مركز الإشعارات"
              description="كل الإشعارات والتصعيدات"
              icon={BellRing}
            />
          </div>
        </SettingsSection>
      )}

      {/* Developer / center support hint */}
      {!isSuperAdmin && (
        <div className="rounded-xl border-2 border-dashed bg-muted/20 px-5 py-4 text-sm text-muted-foreground leading-relaxed text-start">
          <p className="font-black text-foreground mb-1">حسابك</p>
          {isDev
            ? "ستصلك إشعارات الإسناد والحل عبر مركز الإشعارات في القائمة الجانبية."
            : "ستصلك تحديثات حالاتك عبر مركز الإشعارات."}
        </div>
      )}
    </div>
  );
}
