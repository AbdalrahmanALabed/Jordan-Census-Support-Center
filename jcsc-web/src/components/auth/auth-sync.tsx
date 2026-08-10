"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useUserStore } from "@/stores/user-store";
import type { UserRole } from "@/lib/types";

export function AuthSync() {
  const { data: session, status } = useSession();
  const setUser = useUserStore((s) => s.setUser);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setUser({
        id: session.user.id,
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        role: session.user.role as UserRole,
        team: session.user.team,
        permissions: session.user.permissions ?? [],
      });
    } else if (status === "unauthenticated") {
      setUser(null);
    }
  }, [session, status, setUser]);

  return null;
}
