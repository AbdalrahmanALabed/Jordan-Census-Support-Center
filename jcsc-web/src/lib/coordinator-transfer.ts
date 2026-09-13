import { prisma } from "@/lib/db";
import {
  getGovernoratesForCoordinatorEmail,
  isCaseAssignedToCoordinator,
} from "@/lib/coordinator-routing";
import { supportSupervisorCanViewCase } from "@/lib/field-ops-visibility";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

/** منسقو الدعم + مشرفو الدعم — تحويل الحالات بينهم فقط */
export const LEAD_TRANSFER_ROLES = [
  "SUPPORT_COORDINATOR",
  "FIELD_OPERATIONS_COORDINATOR",
  "RESEARCHER_FIELD_COORDINATOR",
  "INFRASTRUCTURE_SUPERVISOR",
  "SUPPORT_SUPERVISOR",
] as const satisfies readonly UserRole[];

export type LeadTransferRole = (typeof LEAD_TRANSFER_ROLES)[number];

export function isLeadTransferRole(role?: UserRole | string | null): role is LeadTransferRole {
  if (!role) return false;
  return (LEAD_TRANSFER_ROLES as readonly string[]).includes(role);
}

type CoordinatorCase = {
  governorate: string;
  affectedSystem?: string | null;
  researcherIssueType?: string | null;
  assignedCoordinatorId?: string | null;
  status?: string | null;
};

export async function canUserReceiveCoordinatorCase(
  userId: string,
  caseItem: CoordinatorCase
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });
  if (!user?.isActive || !isLeadTransferRole(user.role)) return false;

  if (user.role === "SUPPORT_SUPERVISOR") {
    return supportSupervisorCanViewCase(caseItem, user.role);
  }

  return isCaseAssignedToCoordinator(userId, caseItem);
}

export function formatTransferPeerLabel(user: {
  name: string;
  email: string;
  role: string;
  governorate?: string | null;
}): string {
  const roleLabel = ROLE_LABELS[user.role as UserRole] ?? user.role;

  if (user.role === "SUPPORT_COORDINATOR") {
    const governorates = getGovernoratesForCoordinatorEmail(user.email);
    if (governorates.length > 0) {
      return `${user.name} — ${governorates.join("، ")}`;
    }
  }

  if (user.role === "FIELD_OPERATIONS_COORDINATOR") {
    return `${user.name} — إدارة العمل الميداني`;
  }

  if (user.role === "RESEARCHER_FIELD_COORDINATOR") {
    return `${user.name} — نظام الباحث (فني)`;
  }

  if (user.role === "INFRASTRUCTURE_SUPERVISOR") {
    return `${user.name} — البنية التحتية`;
  }

  if (user.governorate?.trim()) {
    return `${user.name} — ${user.governorate.trim()} (${roleLabel})`;
  }

  return `${user.name} — ${roleLabel}`;
}

export async function listCoordinatorTransferPeers(
  caseItem: CoordinatorCase,
  excludeUserId?: string | null
) {
  const excludeIds = new Set<string>();
  if (excludeUserId) excludeIds.add(excludeUserId);
  if (caseItem.assignedCoordinatorId) excludeIds.add(caseItem.assignedCoordinatorId);

  const users = await prisma.user.findMany({
    where: {
      role: { in: [...LEAD_TRANSFER_ROLES] },
      isActive: true,
      ...(excludeIds.size > 0 ? { id: { notIn: [...excludeIds] } } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      team: true,
      governorate: true,
    },
    orderBy: { name: "asc" },
  });

  const eligible: typeof users = [];
  for (const user of users) {
    if (await canUserReceiveCoordinatorCase(user.id, caseItem)) {
      eligible.push(user);
    }
  }
  return eligible;
}
