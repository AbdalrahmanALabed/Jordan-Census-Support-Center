/** Screen-level + action-level permission matrix — 8 census modules */
export interface PermissionAction {
  key: string;
  label: string;
}

export interface PermissionScreen {
  screen: string;
  label: string;
  actions: PermissionAction[];
}

export const PERMISSION_MATRIX: PermissionScreen[] = [
  {
    screen: "dashboard",
    label: "لوحة التحكم",
    actions: [{ key: "view_dashboard", label: "عرض" }],
  },
  {
    screen: "cases",
    label: "الحالات",
    actions: [
      { key: "view_issues", label: "عرض" },
      { key: "manage_issues", label: "تعديل / حل" },
      { key: "assign_issues", label: "تعيين" },
      { key: "close_issues", label: "إغلاق" },
      { key: "convert_to_issue", label: "إنشاء خلل" },
      { key: "classify_reports", label: "تصنيف" },
    ],
  },
  {
    screen: "people",
    label: "الأفراد",
    actions: [
      { key: "manage_users", label: "إدارة" },
      { key: "assign_user_permissions", label: "منح صلاحيات" },
    ],
  },
  {
    screen: "permissions",
    label: "الصلاحيات",
    actions: [{ key: "manage_roles", label: "إدارة" }],
  },
  {
    screen: "solutions",
    label: "الحلول",
    actions: [{ key: "view_issues", label: "عرض الحلول" }],
  },
  {
    screen: "notifications",
    label: "الإشعارات",
    actions: [{ key: "view_dashboard", label: "استلام" }],
  },
  {
    screen: "settings",
    label: "الإعدادات",
    actions: [{ key: "manage_routing", label: "إعدادات التوجيه" }],
  },
  {
    screen: "field",
    label: "بلاغ الدعم الفني المراكز",
    actions: [
      { key: "submit_report", label: "تقديم حالة" },
      { key: "view_own_reports", label: "عرض بلاغاتي" },
      { key: "review_reports", label: "مراجعة" },
      { key: "reject_reports", label: "رفض" },
    ],
  },
];

export function getAllPermissionKeys(): string[] {
  const keys = new Set<string>();
  for (const s of PERMISSION_MATRIX) {
    for (const a of s.actions) keys.add(a.key);
  }
  return [...keys];
}
