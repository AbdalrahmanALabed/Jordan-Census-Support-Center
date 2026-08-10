import { NextRequest, NextResponse } from "next/server";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import type { UserRole } from "@prisma/client";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  if (!hasApiPermission(session!, "manage_roles")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const roles = await prisma.rolePermission.findMany({
    include: { permission: true },
  });

  const grouped: Record<string, string[]> = {};
  for (const rp of roles) {
    if (!rp.granted) continue;
    if (!grouped[rp.role]) grouped[rp.role] = [];
    grouped[rp.role].push(rp.permission.key);
  }

  return NextResponse.json(
    Object.entries(grouped).map(([role, permissions]) => ({ role, permissions }))
  );
}

export async function PATCH(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  if (!hasApiPermission(session!, "manage_roles")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { role, permissionKey, granted } = body as {
    role: UserRole;
    permissionKey: string;
    granted: boolean;
  };

  if (!role || !permissionKey || typeof granted !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const permission = await prisma.permission.findUnique({ where: { key: permissionKey } });
  if (!permission) {
    return NextResponse.json({ error: "Permission not found" }, { status: 404 });
  }

  await prisma.rolePermission.upsert({
    where: { role_permissionId: { role, permissionId: permission.id } },
    create: { role, permissionId: permission.id, granted },
    update: { granted },
  });

  return NextResponse.json({ ok: true, role, permissionKey, granted });
}
