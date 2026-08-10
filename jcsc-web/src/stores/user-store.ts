"use client";



import { create } from "zustand";
import type { UserRole } from "@/lib/types";
import { hasPermissionSync } from "@/lib/permissions";



export interface SessionUser {

  id: string;

  name: string;

  email: string;

  role: UserRole;

  team?: string | null;

  permissions: string[];

}



interface UserState {

  currentUser: SessionUser | null;

  setUser: (user: SessionUser | null) => void;

  hasPermission: (permission: string) => boolean;

}



export const useUserStore = create<UserState>()((set, get) => ({

  currentUser: null,

  setUser: (user) => set({ currentUser: user }),

  hasPermission: (permission) => {
    const user = get().currentUser;
    if (!user) return false;
    if (user.role === "ADMIN") return true;
    if (user.permissions.includes(permission)) return true;
    if (permission === "convert_to_ticket") return user.permissions.includes("convert_to_issue");
    if (permission === "view_tickets") return user.permissions.includes("view_issues");
    if (permission === "manage_tickets") return user.permissions.includes("manage_issues");
    return hasPermissionSync(user.role as UserRole, permission);
  },

}));

