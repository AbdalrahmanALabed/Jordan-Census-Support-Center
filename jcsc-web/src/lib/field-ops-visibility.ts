import type { UserRole } from "@/lib/types";
import {
  isSuperAdminRole,
  isFieldOperationsCoordinatorRole,
  isResearcherFieldCoordinatorRole,
  isInfrastructureSupervisorRole,
  isSupportSupervisorRole,
  isSupportCoordinatorRole,
} from "@/lib/permissions";
import {
  isFieldOperationsAffectedSystem,
  isInfrastructureAffectedSystem,
  isResearcherAffectedSystem,
  isResearcherFieldIssue,
  RESEARCHER_SYSTEM_VALUES,
  INFRASTRUCTURE_SYSTEM_VALUES,
} from "@/lib/coordinator-routing";

type WithAffectedSystem = {
  affectedSystem?: string | null;
  researcherIssueType?: string | null;
};

/** من يرى بلاغات/حالات إدارة العمل الميداني */
export function canViewFieldOperationsItems(role?: UserRole | string | null): boolean {
  return isSuperAdminRole(role as UserRole) || isFieldOperationsCoordinatorRole(role);
}

export function isFieldOperationsItem(item: WithAffectedSystem): boolean {
  return isFieldOperationsAffectedSystem(item.affectedSystem);
}

export function isResearcherFieldItem(item: WithAffectedSystem): boolean {
  return isResearcherFieldIssue(item);
}

export function isInfrastructureItem(item: WithAffectedSystem): boolean {
  return isInfrastructureAffectedSystem(item.affectedSystem);
}

type FilterableItem = WithAffectedSystem & {
  createdById?: string | null;
  supervisorId?: string | null;
  assignedDeveloperId?: string | null;
};

function itemOwnerId(item: FilterableItem): string | null | undefined {
  return item.createdById ?? item.supervisorId;
}

/** فلترة قائمة — السوبر أدمن يرى الكل، منسقو FOM/الباحث الفني يرون نطاقهم فقط */
export function filterItemsByFieldOpsVisibility<T extends FilterableItem>(
  items: T[],
  role?: UserRole | string | null,
  options?: { viewerId?: string; includeOwnSubmissions?: boolean }
): T[] {
  if (!role || isSuperAdminRole(role as UserRole)) return items;

  if (isFieldOperationsCoordinatorRole(role)) {
    return items.filter(isFieldOperationsItem);
  }

  if (isResearcherFieldCoordinatorRole(role)) {
    return items.filter(isResearcherFieldItem);
  }

  if (isInfrastructureSupervisorRole(role)) {
    return items.filter(isInfrastructureItem);
  }

  return items.filter((item) => {
    const isFieldOps = isFieldOperationsItem(item);
    const isInfra = isInfrastructureItem(item);
    const isResearcherField = isResearcherFieldItem(item);

    if (isFieldOps || isInfra || isResearcherField) {
      if (options?.viewerId && item.assignedDeveloperId === options.viewerId) {
        return true;
      }
      if (
        options?.includeOwnSubmissions &&
        options.viewerId &&
        itemOwnerId(item) === options.viewerId
      ) {
        return true;
      }
      return false;
    }

    return true;
  });
}

/** صلاحية عرض حالة/بلاغ واحد */
export function canViewItemByFieldOpsRules(
  item: WithAffectedSystem,
  role?: UserRole | string | null,
  options?: { isOwnSubmission?: boolean; isAssignedDeveloper?: boolean }
): boolean {
  if (!role) return false;
  if (isSuperAdminRole(role as UserRole)) return true;

  const isFieldOps = isFieldOperationsItem(item);
  const isInfra = isInfrastructureItem(item);
  const isResearcherField = isResearcherFieldItem(item);

  if (isFieldOperationsCoordinatorRole(role)) {
    return isFieldOps;
  }

  if (isResearcherFieldCoordinatorRole(role)) {
    return isResearcherField;
  }

  if (isInfrastructureSupervisorRole(role)) {
    return isInfra;
  }

  if (isFieldOps || isInfra || isResearcherField) {
    if (options?.isOwnSubmission && role === "SUPERVISOR") return true;
    if (options?.isAssignedDeveloper && role === "DEVELOPER") return true;
    return false;
  }

  return true;
}

/** مشرف الدعم لا يرى حالات FOM أو باحث+فني حتى لو من فريقه */
export function supportSupervisorCanViewCase(
  item: WithAffectedSystem,
  role?: UserRole | string | null
): boolean {
  if (!isSupportSupervisorRole(role)) return true;
  return !isFieldOperationsItem(item) && !isResearcherFieldItem(item) && !isInfrastructureItem(item);
}

const FIELD_OPS_VALUES = ["FIELD_OPERATIONS", "إدارة العمل الميداني", "field_operations"];
const INFRA_VALUES = [...INFRASTRUCTURE_SYSTEM_VALUES];
const RESEARCHER_VALUES = [...RESEARCHER_SYSTEM_VALUES];

/** شرط Prisma لاستبعاد/تضمين FOM وباحث+فني في الاستعلامات */
export function fieldOpsPrismaFilter(role?: UserRole | string | null):
  | Record<string, unknown>
  | undefined {
  if (!role || isSuperAdminRole(role as UserRole)) return undefined;

  if (isFieldOperationsCoordinatorRole(role)) {
    return { affectedSystem: { in: FIELD_OPS_VALUES } };
  }

  if (isResearcherFieldCoordinatorRole(role)) {
    return {
      affectedSystem: { in: RESEARCHER_VALUES },
      researcherIssueType: "FIELD",
    };
  }

  if (isInfrastructureSupervisorRole(role)) {
    return { affectedSystem: { in: INFRA_VALUES } };
  }

  if (isSupportCoordinatorRole(role) || isSupportSupervisorRole(role)) {
    return {
      AND: [
        { NOT: { affectedSystem: { in: FIELD_OPS_VALUES } } },
        { NOT: { affectedSystem: { in: INFRA_VALUES } } },
        {
          OR: [
            { NOT: { affectedSystem: { in: RESEARCHER_VALUES } } },
            { researcherIssueType: { not: "FIELD" } },
            { researcherIssueType: null },
          ],
        },
      ],
    };
  }

  return {
    AND: [
      { NOT: { affectedSystem: { in: FIELD_OPS_VALUES } } },
      { NOT: { affectedSystem: { in: INFRA_VALUES } } },
      {
        OR: [
          { NOT: { affectedSystem: { in: RESEARCHER_VALUES } } },
          { researcherIssueType: { not: "FIELD" } },
          { researcherIssueType: null },
        ],
      },
    ],
  };
}
