import { NextRequest, NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { passwordsMatch, validatePasswordStrength } from "@/lib/auth/password-policy";

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword ?? "").trim();
  const newPassword = String(body.newPassword ?? "").trim();
  const confirmPassword = String(body.confirmPassword ?? "").trim();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
  }

  if (!passwordsMatch(newPassword, confirmPassword)) {
    return NextResponse.json({ error: "كلمة المرور الجديدة غير متطابقة مع التأكيد" }, { status: 400 });
  }

  const strengthError = validatePasswordStrength(newPassword);
  if (strengthError) {
    return NextResponse.json({ error: strengthError }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session!.user.id } });
  if (!user) {
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }

  const validCurrent = await compare(currentPassword, user.password);
  if (!validCurrent) {
    return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 401 });
  }

  if (await compare(newPassword, user.password)) {
    return NextResponse.json(
      { error: "كلمة المرور الجديدة يجب أن تختلف عن الحالية" },
      { status: 400 }
    );
  }

  const passwordHash = await hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: passwordHash },
  });

  await logAudit({
    action: "EDIT",
    entityType: "User",
    entityId: user.id,
    userId: session!.user.id,
    details: "password_changed_self",
  });

  return NextResponse.json({ success: true });
}
