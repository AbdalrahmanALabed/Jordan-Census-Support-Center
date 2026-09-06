"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { useAuthReady } from "@/hooks/use-effective-user";
import { isSupervisorRole, hasPermission } from "@/lib/reports";
import { isSuperAdminRole, isSupportCoordinatorRole } from "@/lib/permissions";

/** زر عائم — للمنسق على الجوال فقط (دعم المراكز يستخدم الشريط العلوي أو شاشة الإنشاء) */
export function MobileFab() {
  const { user } = useAuthReady();
  const role = user?.role;
  if (!role) return null;

  if (isSuperAdminRole(role)) return null;
  if (isSupervisorRole(role)) return null;
  if (!isSupportCoordinatorRole(role) || !hasPermission(role, "submit_report")) return null;

  return (
    <Link
      href="/cases/create"
      className="fixed bottom-6 start-6 z-40 btn-create-report flex h-14 items-center gap-2 rounded-full px-5 text-base font-black lg:hidden animate-fade-in-up"
      aria-label="إنشاء بلاغ"
    >
      <PlusCircle className="h-6 w-6" />
      إنشاء بلاغ
    </Link>
  );
}
