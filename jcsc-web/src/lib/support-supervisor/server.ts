import { prisma } from "@/lib/db";
import { isSupportSupervisorRole } from "@/lib/support-supervisor";
import type { UserRole } from "@prisma/client";

export async function getManagedUserIds(managerId: string): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { directManagerId: managerId },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function getManagedUsers(managerId: string) {
  return prisma.user.findMany({
    where: { directManagerId: managerId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      governorate: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function isUserManagedBy(managerId: string, userId: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId, directManagerId: managerId },
    select: { id: true },
  });
  return Boolean(user);
}

export async function isCaseVisibleToSupportSupervisor(
  managerId: string,
  createdById: string
): Promise<boolean> {
  const teamIds = await getManagedUserIds(managerId);
  return teamIds.includes(createdById);
}

export function isFullUserAdmin(role: UserRole | string): boolean {
  return role === "ADMIN";
}

export function canManageTeamUsers(role: UserRole | string): boolean {
  return isFullUserAdmin(role) || isSupportSupervisorRole(role);
}
