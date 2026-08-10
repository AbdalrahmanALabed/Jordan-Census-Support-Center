import {
  LayoutGrid,
  FolderKanban,
  UsersRound,
  Lightbulb,
  BellRing,
  SlidersHorizontal,
  ClipboardList,
  PlusCircle,
  Bug,
} from "lucide-react";
import { hasPermission, isSupervisorRole, isSupportCoordinatorRole } from "@/lib/reports";
import { isDeveloperRole } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  iconColor: string;
  activeGradient: string;
};

const KNOWLEDGE_NAV: NavItem = {
  href: "/knowledge-base",
  label: "الحلول",
  icon: Lightbulb,
  iconColor: "text-yellow-600 dark:text-yellow-400",
  activeGradient: "from-yellow-500 to-amber-500",
};

export function buildNavItems(role: UserRole): NavItem[] {
  if (isDeveloperRole(role)) {
    return [
      {
        href: "/cases",
        label: "أعطالي",
        icon: Bug,
        iconColor: "text-amber-600 dark:text-amber-400",
        activeGradient: "from-amber-500 to-orange-500",
      },
      {
        href: "/notifications",
        label: "الإشعارات",
        icon: BellRing,
        iconColor: "text-orange-600 dark:text-orange-400",
        activeGradient: "from-orange-500 to-red-500",
      },
      {
        href: "/settings",
        label: "الإعدادات",
        icon: SlidersHorizontal,
        iconColor: "text-slate-600 dark:text-slate-400",
        activeGradient: "from-slate-500 to-zinc-600",
      },
    ];
  }

  if (isSupportCoordinatorRole(role)) {
    return [
      {
        href: "/dashboard",
        label: "لوحة التحكم",
        icon: LayoutGrid,
        iconColor: "text-sky-600 dark:text-sky-400",
        activeGradient: "from-sky-500 to-cyan-600",
      },
      {
        href: "/reports/my",
        label: "بلاغاتي",
        icon: ClipboardList,
        iconColor: "text-sky-600 dark:text-sky-400",
        activeGradient: "from-sky-500 to-cyan-600",
      },
      {
        href: "/cases",
        label: "تصنيف البلاغات",
        icon: FolderKanban,
        iconColor: "text-indigo-600 dark:text-indigo-400",
        activeGradient: "from-indigo-500 to-blue-600",
      },
      KNOWLEDGE_NAV,
      {
        href: "/notifications",
        label: "الإشعارات",
        icon: BellRing,
        iconColor: "text-orange-600 dark:text-orange-400",
        activeGradient: "from-orange-500 to-red-500",
      },
      {
        href: "/settings",
        label: "الإعدادات",
        icon: SlidersHorizontal,
        iconColor: "text-slate-600 dark:text-slate-400",
        activeGradient: "from-slate-500 to-zinc-600",
      },
    ];
  }

  if (isSupervisorRole(role)) {
    return [
      {
        href: "/dashboard",
        label: "الرئيسية",
        icon: LayoutGrid,
        iconColor: "text-violet-600 dark:text-violet-400",
        activeGradient: "from-violet-500 to-purple-600",
      },
      {
        href: "/reports/my",
        label: "بلاغاتي",
        icon: ClipboardList,
        iconColor: "text-sky-600 dark:text-sky-400",
        activeGradient: "from-sky-500 to-cyan-600",
      },
      {
        href: "/cases/create",
        label: "إنشاء بلاغ",
        icon: PlusCircle,
        iconColor: "text-indigo-600 dark:text-indigo-400",
        activeGradient: "from-indigo-500 to-violet-600",
      },
      KNOWLEDGE_NAV,
      {
        href: "/notifications",
        label: "الإشعارات",
        icon: BellRing,
        iconColor: "text-orange-600 dark:text-orange-400",
        activeGradient: "from-orange-500 to-red-500",
      },
      {
        href: "/settings",
        label: "الإعدادات",
        icon: SlidersHorizontal,
        iconColor: "text-slate-600 dark:text-slate-400",
        activeGradient: "from-slate-500 to-zinc-600",
      },
    ];
  }

  const items: NavItem[] = [
    {
      href: "/dashboard",
      label: "لوحة التحكم",
      icon: LayoutGrid,
      iconColor: "text-violet-600 dark:text-violet-400",
      activeGradient: "from-violet-500 to-purple-600",
    },
    {
      href: "/cases",
      label: "الحالات",
      icon: FolderKanban,
      iconColor: "text-sky-600 dark:text-sky-400",
      activeGradient: "from-sky-500 to-cyan-600",
    },
  ];

  if (
    !isDeveloperRole(role) &&
    (hasPermission(role, "manage_issues") ||
      hasPermission(role, "convert_to_issue") ||
      role === "ADMIN")
  ) {
    items.push({
      href: "/cases/create",
      label: "إنشاء بلاغ",
      icon: PlusCircle,
      iconColor: "text-indigo-600 dark:text-indigo-400",
      activeGradient: "from-indigo-500 to-violet-600",
    });
  }

  if (hasPermission(role, "review_reports")) {
    items.splice(2, 0, {
      href: "/reports",
      label: "البلاغات الواردة",
      icon: ClipboardList,
      iconColor: "text-orange-600 dark:text-orange-400",
      activeGradient: "from-orange-500 to-amber-500",
    });
  }

  if (hasPermission(role, "manage_users") || hasPermission(role, "manage_roles")) {
    items.push({
      href: "/users",
      label: "الأفراد والصلاحيات",
      icon: UsersRound,
      iconColor: "text-amber-600 dark:text-amber-400",
      activeGradient: "from-amber-500 to-orange-500",
    });
  }

  if (!isSupervisorRole(role) && !isDeveloperRole(role)) {
    items.push(KNOWLEDGE_NAV);
  }

  items.push(
    {
      href: "/notifications",
      label: "الإشعارات",
      icon: BellRing,
      iconColor: "text-orange-600 dark:text-orange-400",
      activeGradient: "from-orange-500 to-red-500",
    },
    {
      href: "/settings",
      label: "الإعدادات",
      icon: SlidersHorizontal,
      iconColor: "text-slate-600 dark:text-slate-400",
      activeGradient: "from-slate-500 to-zinc-600",
    }
  );

  return items;
}
