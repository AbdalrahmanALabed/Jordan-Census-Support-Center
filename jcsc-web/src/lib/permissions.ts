import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";

export const PERMISSION_LABELS: Record<string, string> = {
  view_dashboard: "عرض لوحة التحكم",
  submit_report: "تقديم ملاحظة",
  view_own_reports: "عرض ملاحظاتي",
  review_reports: "مراجعة الملاحظات",
  classify_reports: "تصنيف الملاحظات",
  convert_to_issue: "تحويل لمسألة",
  reject_reports: "رفض الملاحظات",
  view_issues: "عرض المسائل",
  manage_issues: "إدارة المسائل",
  assign_issues: "تعيين المسائل",
  close_issues: "إغلاق المسائل",
  view_queues: "عرض الطوابير",
  manage_users: "إدارة المستخدمين",
  manage_roles: "إدارة الصلاحيات",
  manage_routing: "إدارة قواعد التوجيه",
  view_audit: "عرض سجل التدقيق",
  log_report_fallback: "تسجيل ملاحظة نيابةً",
};

const FALLBACK_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPERVISOR: ["view_dashboard", "submit_report", "view_own_reports", "view_issues"],
  SUPPORT_COORDINATOR: [
    "view_dashboard",
    "submit_report",
    "view_own_reports",
    "review_reports",
    "reject_reports",
    "view_issues",
    "close_issues",
  ],
  ADMIN: Object.keys(PERMISSION_LABELS),
  DEVELOPER: ["view_dashboard", "view_issues", "manage_issues", "view_queues"],
  /** Legacy roles — no active permissions */
  SUPPORT_MANAGER: [],
  DATABASE: [],
  DEVOPS: [],
  GIS: [],
  CALL_CENTER: [],
  SUPPORT_L1: [],
  SUPPORT_L2: [],
};

export async function getPermissionsForUser(userId: string, role: UserRole): Promise<string[]> {
  try {
    const userOverrides = await prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });

    const rolePerms = await prisma.rolePermission.findMany({
      where: { role, granted: true },
      include: { permission: true },
    });

    const perms = new Set(rolePerms.map((rp) => rp.permission.key));
    for (const override of userOverrides) {
      if (override.granted) perms.add(override.permission.key);
      else perms.delete(override.permission.key);
    }
    return [...perms];
  } catch {
    return FALLBACK_ROLE_PERMISSIONS[role] ?? [];
  }
}

export function hasPermissionSync(role: UserRole, permission: string): boolean {
  const perms = FALLBACK_ROLE_PERMISSIONS[role] ?? [];
  if (perms.includes(permission)) return true;
  if (permission === "convert_to_ticket") return perms.includes("convert_to_issue");
  if (permission === "view_tickets") return perms.includes("view_issues");
  if (permission === "manage_tickets") return perms.includes("manage_issues");
  return false;
}

/** Can browse field solutions / knowledge base (مشرف، منسق، إدارة) */
export function canViewKnowledgeBase(
  user?: { role?: UserRole | string | null; permissions?: string[] } | null
): boolean {
  if (!user?.role) return false;
  if (user.role === "ADMIN") return true;
  if (isSupervisorRole(user.role) || isSupportCoordinatorRole(user.role)) return true;
  return userHasPermission(user, "view_issues") || userHasPermission(user, "view_dashboard");
}

export function isSupervisorRole(role?: UserRole | null | string): boolean {
  return role === "SUPERVISOR";
}

/** Support coordinator — first-line triage between supervisor and super admin */
export function isSupportCoordinatorRole(role?: UserRole | null | string): boolean {
  return role === "SUPPORT_COORDINATOR";
}

/** Super admin — full case review, classify, assign, users & roles */
export function isSuperAdminRole(role?: UserRole | null): boolean {
  return role === "ADMIN";
}

/** @deprecated Use isSuperAdminRole — kept for existing UI imports */
export function isManagerRole(role?: UserRole | null): boolean {
  return isSuperAdminRole(role);
}

export function isDeveloperRole(role?: UserRole | null | string): boolean {
  return role === "DEVELOPER";
}

/** Sync permission check for a resolved user object (store or session). */
export function userHasPermission(
  user?: { role?: UserRole | string | null; permissions?: string[] } | null,
  permission?: string
): boolean {
  if (!user?.role || !permission) return false;
  if (user.role === "ADMIN") return true;
  const perms = user.permissions ?? [];
  if (perms.includes(permission)) return true;
  return hasPermissionSync(user.role as UserRole, permission);
}
/** Can classify, assign, and fully manage cases (Super Admin or equivalent permissions). */
export function canManageCases(
  user?: { role?: UserRole | string | null; permissions?: string[] } | null
): boolean {
  if (!user?.role) return false;
  if (user.role === "ADMIN") return true;
  const perms = user.permissions ?? [];
  return (
    perms.includes("manage_issues") ||
    perms.includes("classify_reports") ||
    perms.includes("convert_to_issue")
  );
}
