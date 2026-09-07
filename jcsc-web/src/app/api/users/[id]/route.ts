import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { CORE_ROLES } from "@/lib/types";
import {
  canCreateRole,
  filterAssignablePermissions,
  isSupportSupervisorRole,
} from "@/lib/support-supervisor";
import { isSupportCoordinatorRole } from "@/lib/permissions";
import { isUserManagedBy } from "@/lib/support-supervisor/server";
import { normalizeEmail } from "@/lib/email";
import { generateSecurePassword } from "@/lib/auth/passwords";
import type { UserRole } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireSession();
  if (response) return response;

  if (!hasApiPermission(session!, "manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const actorRole = session!.user.role as UserRole;
  const actorId = session!.user.id;

  if (isSupportSupervisorRole(actorRole) || isSupportCoordinatorRole(actorRole)) {
    const allowed = await isUserManagedBy(actorId, id);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (body.action === "reset_password") {
    const newPassword = body.password?.trim() || generateSecurePassword();
    const passwordHash = await hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: passwordHash } });
    await logAudit({
      action: "EDIT",
      entityType: "User",
      entityId: id,
      userId: actorId,
      details: "password_reset",
    });
    return NextResponse.json({ success: true, initialPassword: newPassword });
  }

  if (body.action === "toggle_active") {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });
    return NextResponse.json({ isActive: updated.isActive });
  }

  if (body.action === "update_permissions") {
    const canFull = hasApiPermission(session!, "manage_roles");
    const canAssign = hasApiPermission(session!, "assign_user_permissions");
    if (!canFull && !canAssign) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const permissionKeys: string[] = Array.isArray(body.permissions) ? body.permissions : [];
    const keys = canFull ? permissionKeys : filterAssignablePermissions(permissionKeys);

    const allPerms = await prisma.permission.findMany();
    const keyToId = new Map(allPerms.map((p) => [p.key, p.id]));

    await prisma.userPermission.deleteMany({ where: { userId: id } });
    for (const key of keys) {
      const permissionId = keyToId.get(key);
      if (!permissionId) continue;
      await prisma.userPermission.create({
        data: { userId: id, permissionId, granted: true },
      });
    }

    await logAudit({
      action: "EDIT",
      entityType: "User",
      entityId: id,
      userId: actorId,
      details: "permissions_updated",
    });
    return NextResponse.json({ success: true });
  }

  const { name, email, phone, jobTitle, role, team, governorate } = body;

  if (role !== undefined && !CORE_ROLES.includes(role as UserRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (role !== undefined && !canCreateRole(actorRole, role as UserRole)) {
    return NextResponse.json({ error: "لا يمكنك تعيين هذا الدور" }, { status: 403 });
  }

  if (email !== undefined) {
    const normalizedEmail = normalizeEmail(email);
    const duplicate = await prisma.user.findFirst({
      where: { email: normalizedEmail, NOT: { id } },
    });
    if (duplicate) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(email !== undefined && { email: normalizeEmail(email) }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(jobTitle !== undefined && { jobTitle: jobTitle?.trim() || null }),
      ...(role !== undefined && { role }),
      ...(team !== undefined && { team: team?.trim() || null }),
      ...(governorate !== undefined && { governorate: governorate?.trim() || null }),
    },
  });

  await logAudit({
    action: "EDIT",
    entityType: "User",
    entityId: id,
    userId: actorId,
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    isActive: updated.isActive,
  });
}
