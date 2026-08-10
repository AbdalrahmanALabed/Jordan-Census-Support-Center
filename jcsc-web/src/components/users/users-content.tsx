"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getUsers } from "@/lib/services";
import { ROLE_LABELS } from "@/lib/types";

export function UsersContent() {
  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-start font-medium">المستخدم</th>
                <th className="px-4 py-3 text-start font-medium">البريد</th>
                <th className="px-4 py-3 text-start font-medium">الصلاحية</th>
                <th className="px-4 py-3 text-start font-medium">الفريق</th>
                <th className="px-4 py-3 text-start font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    جاري التحميل...
                  </td>
                </tr>
              ) : (
                users?.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {user.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
                    </td>
                    <td className="px-4 py-3">{user.team ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.isActive ? "success" : "secondary"}>
                        {user.isActive ? "نشط" : "معطّل"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
