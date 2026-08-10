"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getRolePermissions, toggleRolePermission } from "@/lib/services/reports";
import { PERMISSION_MATRIX, getAllPermissionKeys } from "@/lib/permissions-matrix";
import { ROLE_LABELS, CORE_ROLES } from "@/lib/types";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { hasPermission } from "@/lib/reports";
import { cn } from "@/lib/utils";

const MATRIX_KEYS = getAllPermissionKeys();

const ROLE_ACCENT: Record<string, string> = {
  ADMIN: "border-s-violet-500 bg-violet-50/50 dark:bg-violet-950/20",
  SUPERVISOR: "border-s-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
  DEVELOPER: "border-s-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20",
};

export function RoleManagementContent() {
  const queryClient = useQueryClient();
  const user = useEffectiveUser();
  const canEdit =
    user?.role === "ADMIN" ||
    (user?.role ? hasPermission(user.role, "manage_roles") : false);

  const { data: roles, isLoading } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: getRolePermissions,
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      role,
      permissionKey,
      granted,
    }: {
      role: string;
      permissionKey: string;
      granted: boolean;
    }) => toggleRolePermission(role, permissionKey, granted),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["role-permissions"] }),
  });

  return (
    <div className="space-y-6 text-start">
      <p className="text-sm text-muted-foreground font-bold">
        {canEdit
          ? "اضغط على «مفعّل / معطّل» لتعديل صلاحيات كل دور"
          : "عرض صلاحيات الأدوار — للقراءة فقط"}
      </p>

      {/* دليل الشاشات */}
      <Card className="border-2">
        <CardHeader className="border-b bg-muted/30 pb-3">
          <CardTitle className="text-base font-black">دليل الشاشات والإجراءات</CardTitle>
        </CardHeader>
        <CardContent className="p-5 grid gap-3 sm:grid-cols-2">
          {PERMISSION_MATRIX.map((screen) => (
            <div key={screen.screen} className="rounded-xl border bg-muted/20 p-3 space-y-2">
              <p className="font-black text-sm text-primary">{screen.label}</p>
              <div className="flex flex-wrap gap-1">
                {screen.actions.map((a) => (
                  <Badge key={`${screen.screen}-${a.key}`} variant="outline" className="text-xs font-bold">
                    {a.label}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <h2 className="text-base font-black flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        صلاحيات الأدوار
      </h2>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8 font-bold">جاري التحميل...</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {roles
            ?.filter((rp) => CORE_ROLES.includes(rp.role as (typeof CORE_ROLES)[number]))
            .map((rp) => (
              <Card
                key={rp.role}
                className={cn(
                  "border-2 border-s-4 overflow-hidden",
                  ROLE_ACCENT[rp.role] ?? "border-s-primary"
                )}
              >
                <CardHeader className="pb-2 border-b bg-background/60">
                  <CardTitle className="flex items-center gap-2 text-base font-black">
                    <Shield className="h-4 w-4 text-primary shrink-0" />
                    {ROLE_LABELS[rp.role]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-1">
                  {MATRIX_KEYS.map((key) => {
                    const label =
                      PERMISSION_MATRIX.flatMap((s) => s.actions).find((a) => a.key === key)
                        ?.label ?? key;
                    const has = rp.permissions.includes(key);
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-2 text-sm py-2 border-b border-border/50 last:border-0"
                      >
                        <span
                          className={cn(
                            "font-bold text-start flex-1",
                            !has && "text-muted-foreground"
                          )}
                        >
                          {label}
                        </span>
                        {canEdit && rp.role !== "ADMIN" ? (
                          <Button
                            size="sm"
                            variant={has ? "default" : "outline"}
                            disabled={toggleMutation.isPending}
                            className="gap-1 text-xs font-black shrink-0 h-8"
                            onClick={() =>
                              toggleMutation.mutate({
                                role: rp.role,
                                permissionKey: key,
                                granted: !has,
                              })
                            }
                          >
                            {has ? (
                              <>
                                <Check className="h-3 w-3" /> مفعّل
                              </>
                            ) : (
                              <>
                                <X className="h-3 w-3" /> معطّل
                              </>
                            )}
                          </Button>
                        ) : (
                          <Badge
                            variant={has ? "success" : "outline"}
                            className="text-xs font-black shrink-0"
                          >
                            {has ? "نعم" : "لا"}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
