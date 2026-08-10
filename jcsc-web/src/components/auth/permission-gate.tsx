"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ShieldAlert } from "lucide-react";
import type { UserRole } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { canViewKnowledgeBase, userHasPermission } from "@/lib/permissions";

type PermissionGateProps = {
  permission?: string | string[];
  requireAll?: boolean;
  excludeRoles?: UserRole[];
  allowRoles?: UserRole[];
  knowledgeBase?: boolean;
  children: ReactNode;
};

export function PermissionGate({
  permission,
  requireAll = false,
  excludeRoles,
  allowRoles,
  knowledgeBase = false,
  children,
}: PermissionGateProps) {
  const { status } = useSession();
  const user = useEffectiveUser();
  const keys = permission ? (Array.isArray(permission) ? permission : [permission]) : [];

  const permissionAllowed = knowledgeBase
    ? canViewKnowledgeBase(user)
    : requireAll
      ? keys.every((k) => userHasPermission(user, k))
      : keys.length === 0
        ? true
        : keys.some((k) => userHasPermission(user, k));

  const roleAllowed = allowRoles?.includes(user?.role as UserRole) ?? false;
  const roleExcluded = excludeRoles?.includes(user?.role as UserRole) ?? false;
  const allowed = roleAllowed || (permissionAllowed && !roleExcluded);

  if (status === "loading" && !user) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (allowed) return <>{children}</>;

  return (
    <Card className="border-amber-500/30">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <ShieldAlert className="h-12 w-12 text-amber-500" />
        <div>
          <p className="font-medium">غير مصرح بالوصول</p>
          <p className="text-sm text-muted-foreground mt-1">
            لا تملك الصلاحية اللازمة لعرض هذه الصفحة.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">العودة للوحة التحكم</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
