import type { UserRole } from "@/lib/types";

/** مشرف الدعم — بين السوبر أدمن ومنسق الدعم */
export const SUPPORT_SUPERVISOR_ROLE = "SUPPORT_SUPERVISOR" as const satisfies UserRole;

/** أدوار يمكن لمنسق الدعم إنشاؤها */
export const SUPPORT_COORDINATOR_CREATABLE_ROLES: UserRole[] = ["SUPERVISOR"];

/** أدوار يمكن لمشرف الدعم إنشاؤها */
export const SUPPORT_SUPERVISOR_CREATABLE_ROLES: UserRole[] = [
  "SUPERVISOR",
];

/** صلاحيات يمكن لمشرف الدعم منحها لأفراد فريقه (بدون صلاحيات السوبر أدمن) */
export const SUPPORT_SUPERVISOR_ASSIGNABLE_PERMISSIONS: readonly string[] = [
  "view_dashboard",
  "submit_report",
  "view_own_reports",
  "review_reports",
  "reject_reports",
  "view_issues",
  "close_issues",
  "log_report_fallback",
];

export function isSupportSupervisorRole(role?: UserRole | string | null): boolean {
  return role === SUPPORT_SUPERVISOR_ROLE;
}

export function filterAssignablePermissions(keys: string[]): string[] {
  const allowed = new Set(SUPPORT_SUPERVISOR_ASSIGNABLE_PERMISSIONS);
  return keys.filter((k) => allowed.has(k));
}

export function canCreateRole(actorRole: UserRole | string, targetRole: UserRole): boolean {
  if (targetRole === "DEVELOPER" || targetRole === "ADMIN") {
    return actorRole === "ADMIN";
  }
  if (actorRole === "ADMIN") return true;
  if (isSupportSupervisorRole(actorRole)) {
    return SUPPORT_SUPERVISOR_CREATABLE_ROLES.includes(targetRole);
  }
  if (actorRole === "SUPPORT_COORDINATOR") {
    return SUPPORT_COORDINATOR_CREATABLE_ROLES.includes(targetRole);
  }
  return false;
}
