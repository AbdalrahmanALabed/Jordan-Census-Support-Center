"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsSection } from "@/components/settings/settings-section-parts";
import { changeOwnPassword } from "@/lib/services/account";
import { PasswordRequirementsHint } from "@/components/auth/password-requirements-hint";
import { PASSWORD_HINT_SUMMARY } from "@/lib/auth/password-policy";

export function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const current = String(fd.get("currentPassword") ?? currentPassword).trim();
    const next = String(fd.get("newPassword") ?? newPassword).trim();
    const confirm = String(fd.get("confirmPassword") ?? confirmPassword).trim();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      await changeOwnPassword({
        currentPassword: current,
        newPassword: next,
        confirmPassword: confirm,
      });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر تغيير كلمة المرور");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SettingsSection
      title="كلمة المرور"
      description={`أدخل كلمة المرور الحالية ثم اختر كلمة مرور جديدة (${PASSWORD_HINT_SUMMARY})`}
      icon={KeyRound}
    >
      <form
        data-testid="change-password-form"
        onSubmit={handleSubmit}
        className="space-y-4 max-w-md"
      >
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground">كلمة المرور الحالية</label>
          <Input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            className="h-10 border-2"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        <PasswordRequirementsHint />

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground">كلمة المرور الجديدة</label>
          <Input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            className="h-10 border-2"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            required
            minLength={8}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground">تأكيد كلمة المرور الجديدة</label>
          <Input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="h-10 border-2"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
            minLength={8}
          />
        </div>
        {error && (
          <p className="text-sm font-bold text-destructive" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400" role="status">
            تم تحديث كلمة المرور بنجاح.
          </p>
        )}
        <Button type="submit" className="font-black gap-2" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          حفظ كلمة المرور الجديدة
        </Button>
      </form>
    </SettingsSection>
  );
}
