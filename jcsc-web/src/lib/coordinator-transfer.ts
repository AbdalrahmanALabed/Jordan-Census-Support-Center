import { prisma } from "@/lib/db";
import { getGovernoratesForCoordinatorEmail } from "@/lib/coordinator-routing";
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

/** أي منسق/مشرف نشط ضمن فريق القيادة يمكنه استلام التحويل */
export async function canUserReceiveCoordinatorCase(
  userId: string,
  _caseItem?: CoordinatorCase
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });
  return Boolean(user?.isActive && isLeadTransferRole(user.role));
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

/** جميع المنسقين/المشرفين النشطين — بدون إخفاء أي اسم */
export async function listCoordinatorTransferPeers(_caseItem?: CoordinatorCase) {
  return prisma.user.findMany({
    where: {
      role: { in: [...LEAD_TRANSFER_ROLES] },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      team: true,
      governorate: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export function isTransferPeerSelectable(
  peerId: string,
  viewerId: string,
  assignedCoordinatorId?: string | null
): boolean {
  if (peerId === viewerId) return false;
  if (assignedCoordinatorId && peerId === assignedCoordinatorId) return false;
  return true;
}
