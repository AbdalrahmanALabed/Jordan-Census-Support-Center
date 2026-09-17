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
import { getManagedUsers } from "@/lib/support-supervisor/server";
import { canViewRegionalCoordinatorUsers } from "@/lib/coordinator-routing";
import { normalizeEmail } from "@/lib/email";
import { generateSecurePassword } from "@/lib/auth/passwords";
import { validatePasswordStrength } from "@/lib/auth/password-policy";
import type { UserRole } from "@prisma/client";

async function applyUserPermissions(
  userId: string,
  permissionKeys: string[],
  actorRole: UserRole,
  fullAccess: boolean
) {
  const keys = fullAccess ? permissionKeys : filterAssignablePermissions(permissionKeys);
  if (keys.length === 0) return;

  const allPerms = await prisma.permission.findMany();
  const keyToId = new Map(allPerms.map((p) => [p.key, p.id]));

  await prisma.userPermission.deleteMany({ where: { userId } });
  for (const key of keys) {
    const permissionId = keyToId.get(key);
    if (!permissionId) continue;
    await prisma.userPermission.create({
      data: { userId, permissionId, granted: true },
    });
  }
}

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  if (!hasApiPermission(session!, "manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorRole = session!.user.role as UserRole;
  const isTeamLead = isSupportSupervisorRole(actorRole);
  const isCoordinatorLead = isSupportCoordinatorRole(actorRole);

  const rolePerms = await prisma.rolePermission.findMany({
    where: { granted: true },
    include: { permission: true },
  });
  const rolePermMap: Record<string, string[]> = {};
  for (const rp of rolePerms) {
    if (!rolePermMap[rp.role]) rolePermMap[rp.role] = [];
    rolePermMap[rp.role].push(rp.permission.key);
  }

  if (isTeamLead || (isCoordinatorLead && !canViewRegionalCoordinatorUsers(actorRole))) {
    const teamUsers = await getManagedUsers(session!.user.id);
    const enriched = await Promise.all(
      teamUsers.map(async (u) => {
        const perms = await prisma.userPermission.findMany({
          where: { userId: u.id },
          include: { permission: true },
        });
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: undefined as string | undefined,
          jobTitle: undefined as string | undefined,
          role: u.role,
          team: undefined as string | undefined,
          governorate: u.governorate,
          isActive: u.isActive,
          workload: 0,
          createdAt: u.createdAt.toISOString(),
          permissions:
            perms.length > 0
              ? perms.filter((p) => p.granted).map((p) => p.permission.key)
              : rolePermMap[u.role] ?? [],
        };
      })
    );
    return NextResponse.json(enriched);
  }

  if (isCoordinatorLead && canViewRegionalCoordinatorUsers(actorRole)) {
    const coordinators = await prisma.user.findMany({
      where: {
        role: {
          in: [
            "SUPPORT_COORDINATOR",
            "FIELD_OPERATIONS_COORDINATOR",
            "RESEARCHER_FIELD_COORDINATOR",
            "INFRASTRUCTURE_SUPERVISOR",
          ],
        },
      },
      orderBy: { name: "asc" },
    });
    const enriched = await Promise.all(
      coordinators.map(async (u) => {
        const perms = await prisma.userPermission.findMany({
          where: { userId: u.id },
          include: { permission: true },
        });
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone ?? undefined,
          jobTitle: u.jobTitle ?? undefined,
          role: u.role,
          team: u.team ?? undefined,
          governorate: u.governorate,
          isActive: u.isActive,
          workload: 0,
          createdAt: u.createdAt.toISOString(),
          permissions:
            perms.length > 0
              ? perms.filter((p) => p.granted).map((p) => p.permission.key)
              : rolePermMap[u.role] ?? [],
        };
      })
    );
    return NextResponse.json(enriched);
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
  const actorRole = session!.user.role as UserRole;

  if (!name?.trim() || !email?.trim() || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!CORE_ROLES.includes(role as UserRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (!canCreateRole(actorRole, role as UserRole)) {
    return NextResponse.json({ error: "لا يمكنك إنشاء هذا الدور" }, { status: 403 });
  }

  const normalizedEmail = normalizeEmail(email);
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const manualPassword = password?.trim();
  if (manualPassword) {
    const strengthError = validatePasswordStrength(manualPassword);
    if (strengthError) {
      return NextResponse.json({ error: strengthError }, { status: 400 });
    }
  }
  const plainPassword = manualPassword || generateSecurePassword();
  const passwordHash = await hash(plainPassword, 10);
  const canAssignPerms =
    hasApiPermission(session!, "manage_roles") ||
    hasApiPermission(session!, "assign_user_permissions");

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || null,
      jobTitle: jobTitle?.trim() || null,
      role,
      team: team?.trim() || null,
      governorate: governorate?.trim() || null,
      password: passwordHash,
      directManagerId:
        isSupportSupervisorRole(actorRole) || isSupportCoordinatorRole(actorRole)
          ? session!.user.id
          : null,
    },
  });

  if (Array.isArray(permissions) && permissions.length > 0 && canAssignPerms) {
    await applyUserPermissions(
      user.id,
      permissions as string[],
      actorRole,
      hasApiPermission(session!, "manage_roles")
    );
  }

  await logAudit({
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    userId: session!.user.id,
  });

  return NextResponse.json(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      initialPassword: plainPassword,
    },
    { status: 201 }
  );
}
