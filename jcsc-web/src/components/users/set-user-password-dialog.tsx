"use client";

import { useState } from "react";
import { KeyRound, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changeUserPasswordByAdmin, resetUserPassword } from "@/lib/services/users";
import { PasswordRequirementsHint } from "@/components/auth/password-requirements-hint";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  allowRandomReset?: boolean;
};

export function SetUserPasswordDialog({
  open,
  onOpenChange,
  userId,
  userName,
  allowRandomReset = true,
}: Props) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await changeUserPasswordByAdmin(userId, newPassword, confirmPassword);
      alert("تم تعيين كلمة المرور الجديدة للمستخدم.");
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر تعيين كلمة المرور");
    } finally {
      setLoading(false);
    }
  }

  async function handleRandom() {
    setError(null);
    setLoading(true);
    try {
      const generated = await resetUserPassword(userId);
      alert(
        generated
          ? `تم توليد كلمة مرور جديدة لـ ${userName}:\n\n${generated}`
          : "تم إعادة تعيين كلمة المرور"
      );
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر توليد كلمة المرور");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md w-[calc(100%-2rem)]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            تعيين كلمة مرور
          </DialogTitle>
          <DialogDescription className="text-start">
            للمستخدم: <span className="font-black text-foreground">{userName}</span>
            <br />
            لا حاجة لكلمة المرور القديمة (صلاحية إدارية).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <PasswordRequirementsHint />
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">كلمة المرور الجديدة</label>
            <Input
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
            <label className="text-xs font-bold text-muted-foreground">تأكيد كلمة المرور</label>
            <Input
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
          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="submit" className="font-black gap-2 flex-1" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              حفظ
            </Button>
            {allowRandomReset && (
              <Button
                type="button"
                variant="outline"
                className="font-bold gap-2"
                disabled={loading}
                onClick={handleRandom}
              >
                <Sparkles className="h-4 w-4" />
                توليد عشوائي
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
