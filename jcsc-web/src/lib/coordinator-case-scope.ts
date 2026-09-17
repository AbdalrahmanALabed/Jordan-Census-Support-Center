import type { Prisma } from "@prisma/client";
import {
  isFieldOperationsCoordinatorRole,
  isInfrastructureSupervisorRole,
  isResearcherFieldCoordinatorRole,
} from "@/lib/permissions";

/** Cases listed by explicit assignee (not governorate fallback). */
export function usesAssignedCoordinatorCaseScope(role?: string | null): boolean {
  return (
    role === "SUPPORT_COORDINATOR" ||
    isFieldOperationsCoordinatorRole(role) ||
    isResearcherFieldCoordinatorRole(role) ||
    isInfrastructureSupervisorRole(role)
  );
}

export function assignedCoordinatorScopeWhere(
  role?: string | null,
  userId?: string | null
): Prisma.CaseWhereInput {
  if (!role || !userId || !usesAssignedCoordinatorCaseScope(role)) {
    return {};
  }
  return { assignedCoordinatorId: userId };
}
