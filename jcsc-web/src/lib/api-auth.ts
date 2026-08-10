import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { hasPermissionSync } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, response: null };
}

export function hasApiPermission(session: { user: { permissions: string[]; role: string } }, permission: string) {
  if (session.user.role === "ADMIN") return true;
  if (session.user.permissions.includes(permission)) return true;
  return hasPermissionSync(session.user.role as UserRole, permission);
}
