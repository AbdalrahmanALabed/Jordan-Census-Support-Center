"use client";

import { useSession } from "next-auth/react";
import { useUserStore, type SessionUser } from "@/stores/user-store";
import type { UserRole } from "@/lib/types";

/** Merges zustand store with NextAuth session so role/permissions are available immediately. */
export function useEffectiveUser(): SessionUser | null {
  const { currentUser } = useUserStore();
  const { data: session } = useSession();

  if (currentUser) return currentUser;
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role as UserRole,
    team: session.user.team,
    permissions: session.user.permissions ?? [],
  };
}

/** Session + store merged; `isLoading` until role is known (avoids SUPERVISOR fallback bugs). */
export function useAuthReady(): { user: SessionUser | null; isLoading: boolean } {
  const user = useEffectiveUser();
  const { status } = useSession();
  return {
    user,
    isLoading: status === "loading" && !user?.role,
  };
}
