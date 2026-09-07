import type { UserRole } from "@/lib/types";
import {
  isSuperAdminRole,
  isFieldOperationsCoordinatorRole,
  isSupportSupervisorRole,
} from "@/lib/permissions";
import { isFieldOperationsAffectedSystem } from "@/lib/coordinator-routing";

type WithAffectedSystem = { affectedSystem?: string | null };

/** من يرى بلاغات/حالات إدارة العمل الميداني */
export function canViewFieldOperationsItems(role?: UserRole | string | null): boolean {
  return isSuperAdminRole(role as UserRole) || isFieldOperationsCoordinatorRole(role);
}

export function isFieldOperationsItem(item: WithAffectedSystem): boolean {
  return isFieldOperationsAffectedSystem(item.affectedSystem);
}

type FilterableItem = WithAffectedSystem & {
  createdById?: string | null;
  supervisorId?: string | null;
};

function itemOwnerId(item: FilterableItem): string | null | undefined {
  return item.createdById ?? item.supervisorId;
}

/** فلترة قائمة — السوبر أدمن يرى الكل، منسق العمل الميداني يرى FOM فقط، الباقي يُستبعد FOM */
export function filterItemsByFieldOpsVisibility<T extends FilterableItem>(
  items: T[],
  role?: UserRole | string | null,
  options?: { viewerId?: string; includeOwnSubmissions?: boolean }
): T[] {
  if (!role || isSuperAdminRole(role as UserRole)) return items;

  if (isFieldOperationsCoordinatorRole(role)) {
    return items.filter(isFieldOperationsItem);
  }

  return items.filter((item) => {
    if (!isFieldOperationsItem(item)) return true;
    if (
      options?.includeOwnSubmissions &&
      options.viewerId &&
      itemOwnerId(item) === options.viewerId
    ) {
      return true;
    }
    return false;
  });
}

/** صلاحية عرض حالة/بلاغ واحد */
export function canViewItemByFieldOpsRules(
  item: WithAffectedSystem,
  role?: UserRole | string | null,
  options?: { isOwnSubmission?: boolean }
): boolean {
  if (!role) return false;
  if (isSuperAdminRole(role as UserRole)) return true;

  const isFieldOps = isFieldOperationsItem(item);

  if (isFieldOperationsCoordinatorRole(role)) {
    return isFieldOps;
  }

  if (isFieldOps) {
    if (options?.isOwnSubmission && role === "SUPERVISOR") return true;
    return false;
  }

  return true;
}

/** مشرف الدعم لا يرى حالات FOM حتى لو من فريقه */
export function supportSupervisorCanViewCase(
  item: WithAffectedSystem,
  role?: UserRole | string | null
): boolean {
  if (!isSupportSupervisorRole(role)) return true;
  return !isFieldOperationsItem(item);
}

/** شرط Prisma لاستبعاد/تضمين FOM في الاستعلامات */
export function fieldOpsPrismaFilter(role?: UserRole | string | null):
  | { affectedSystem: { in: string[] } }
  | { NOT: { affectedSystem: { in: string[] } } }
  | undefined {
  if (!role || isSuperAdminRole(role as UserRole)) return undefined;

  const fieldOpsValues = ["FIELD_OPERATIONS", "إدارة العمل الميداني", "field_operations"];

  if (isFieldOperationsCoordinatorRole(role)) {
    return { affectedSystem: { in: fieldOpsValues } };
  }

  return { NOT: { affectedSystem: { in: fieldOpsValues } } };
}
