import { NextResponse } from "next/server";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { isSupportCoordinatorRole } from "@/lib/permissions";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  if (
    !isSupportCoordinatorRole(session!.user.role) ||
    !hasApiPermission(session!, "submit_report")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["ADMIN", "SUPPORT_SUPERVISOR"] },
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      roleLabel: ROLE_LABELS[u.role as UserRole] ?? u.role,
      label:
        u.role === "ADMIN"
          ? `${u.name} — السوبر أدمن`
          : `${u.name} — مشرف الدعم`,
    }))
  );
}
