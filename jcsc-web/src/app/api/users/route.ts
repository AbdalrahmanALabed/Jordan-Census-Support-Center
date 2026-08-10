import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { CORE_ROLES } from "@/lib/types";
import type { UserRole } from "@prisma/client";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  if (!hasApiPermission(session!, "manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      userPermissions: { include: { permission: true } },
      _count: {
        select: {
          assignedIssues: { where: { status: { notIn: ["CLOSED"] } } },
        },
      },
    },
  });

  const rolePerms = await prisma.rolePermission.findMany({
    where: { granted: true },
    include: { permission: true },
  });
  const rolePermMap: Record<string, string[]> = {};
  for (const rp of rolePerms) {
    if (!rolePermMap[rp.role]) rolePermMap[rp.role] = [];
    rolePermMap[rp.role].push(rp.permission.key);
  }

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      jobTitle: u.jobTitle ?? u.team,
      role: u.role,
      team: u.team,
      governorate: u.governorate,
      isActive: u.isActive,
      workload: u._count.assignedIssues,
      createdAt: u.createdAt.toISOString(),
      permissions:
        u.userPermissions.length > 0
          ? u.userPermissions.filter((p) => p.granted).map((p) => p.permission.key)
          : rolePermMap[u.role] ?? [],
    }))
  );
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  if (!hasApiPermission(session!, "manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, phone, jobTitle, role, team, governorate, password, permissions } = body;

  if (!name?.trim() || !email?.trim() || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!CORE_ROLES.includes(role as UserRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const passwordHash = await hash(password?.trim() || "jcsc2026", 10);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      jobTitle: jobTitle?.trim() || null,
      role,
      team: team?.trim() || null,
      governorate: governorate?.trim() || null,
      password: passwordHash,
    },
  });

  if (Array.isArray(permissions) && permissions.length > 0 && hasApiPermission(session!, "manage_roles")) {
    const allPerms = await prisma.permission.findMany();
    const keyToId = new Map(allPerms.map((p) => [p.key, p.id]));
    for (const key of permissions as string[]) {
      const permissionId = keyToId.get(key);
      if (!permissionId) continue;
      await prisma.userPermission.create({
        data: { userId: user.id, permissionId, granted: true },
      });
    }
  }

  await logAudit({
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    userId: session!.user.id,
  });

  return NextResponse.json(
    { id: user.id, name: user.name, email: user.email },
    { status: 201 }
  );
}
