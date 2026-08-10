import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { CORE_ROLES } from "@/lib/types";
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

  if (body.action === "reset_password") {
    const passwordHash = await hash(body.password?.trim() || "jcsc2026", 10);
    await prisma.user.update({ where: { id }, data: { password: passwordHash } });
    await logAudit({
      action: "EDIT",
      entityType: "User",
      entityId: id,
      userId: session!.user.id,
      details: "password_reset",
    });
    return NextResponse.json({ success: true });
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
    if (!hasApiPermission(session!, "manage_roles")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const permissionKeys: string[] = Array.isArray(body.permissions) ? body.permissions : [];
    const allPerms = await prisma.permission.findMany();
    const keyToId = new Map(allPerms.map((p) => [p.key, p.id]));

    await prisma.userPermission.deleteMany({ where: { userId: id } });
    for (const key of permissionKeys) {
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
      userId: session!.user.id,
      details: "permissions_updated",
    });
    return NextResponse.json({ success: true });
  }

  const { name, email, phone, jobTitle, role, team, governorate } = body;

  if (role !== undefined && !CORE_ROLES.includes(role as UserRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(email !== undefined && { email: email.trim() }),
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
    userId: session!.user.id,
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    isActive: updated.isActive,
  });
}
