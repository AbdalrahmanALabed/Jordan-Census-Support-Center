import type { User, UserRole } from "@/lib/types";
import { mockUsers } from "@/lib/mock-data";
import {
  DEFAULT_ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
  type RolePermission,
} from "@/lib/reports";
import { apiFetchResult, apiFetchOrThrow, shouldUseMockFallback } from "@/lib/api-client";

function delay(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getEffectivePermissions(user: User): string[] {
  if (user.permissions?.length) return user.permissions;
  const rolePerms = DEFAULT_ROLE_PERMISSIONS.find((r) => r.role === user.role);
  return rolePerms?.permissions ?? [];
}

export async function getUsersWithPermissions(): Promise<User[]> {
  const result = await apiFetchResult<User[]>("/api/users");
  if (result.ok) return result.data;
  if (!shouldUseMockFallback(result.status)) return [];

  await delay();
  return mockUsers;
}

export async function createUser(data: {
  name: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  role: UserRole;
  team?: string;
  governorate?: string;
  password?: string;
  permissions?: string[];
}): Promise<User & { initialPassword?: string }> {
  return apiFetchOrThrow<User & { initialPassword?: string }>("/api/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateUser(
  userId: string,
  data: Partial<{
    name: string;
    email: string;
    phone: string;
    jobTitle: string;
    role: UserRole;
    team: string;
    governorate: string;
  }>
): Promise<User | null> {
  try {
    await apiFetchOrThrow<{ id: string }>(`/api/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    const users = await getUsersWithPermissions();
    return users.find((u) => u.id === userId) ?? null;
  } catch {
    if (!shouldUseMockFallback(0)) return null;
  }

  await delay(200);
  const idx = mockUsers.findIndex((u) => u.id === userId);
  if (idx === -1) return null;
  mockUsers[idx] = { ...mockUsers[idx], ...data };
  return mockUsers[idx];
}

export async function resetUserPassword(
  userId: string,
  password?: string
): Promise<string | null> {
  const result = await apiFetchResult<{ success: boolean; initialPassword?: string }>(
    `/api/users/${userId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ action: "reset_password", password }),
    }
  );
  if (!result.ok || !result.data.success) return null;
  return result.data.initialPassword ?? null;
}

export async function updateUserPermissions(
  userId: string,
  permissions: string[]
): Promise<User | null> {
  try {
    await apiFetchOrThrow(`/api/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "update_permissions", permissions }),
    });
    const users = await getUsersWithPermissions();
    return users.find((u) => u.id === userId) ?? null;
  } catch {
    return null;
  }
}

export async function toggleUserActive(userId: string): Promise<User | null> {
  const result = await apiFetchResult<{ isActive: boolean }>(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "toggle_active" }),
  });
  if (result.ok) {
    const users = await getUsersWithPermissions();
    return users.find((u) => u.id === userId) ?? null;
  }
  if (!shouldUseMockFallback(result.status)) return null;

  await delay(200);
  const idx = mockUsers.findIndex((u) => u.id === userId);
  if (idx === -1) return null;
  mockUsers[idx] = { ...mockUsers[idx], isActive: !mockUsers[idx].isActive };
  return mockUsers[idx];
}

export async function getRolePermissionsList(): Promise<RolePermission[]> {
  const result = await apiFetchResult<RolePermission[]>("/api/roles");
  if (result.ok) return result.data;
  if (!shouldUseMockFallback(result.status)) return DEFAULT_ROLE_PERMISSIONS;

  await delay();
  return DEFAULT_ROLE_PERMISSIONS;
}

export { ALL_PERMISSIONS };
