import { NextResponse } from "next/server";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import { isSupportSupervisorRole } from "@/lib/permissions";
import { getManagedUsers } from "@/lib/support-supervisor/server";
import { listCases } from "@/lib/cases/server";
import { mapCaseToClient } from "@/lib/cases/server";
import { filterItemsByFieldOpsVisibility } from "@/lib/field-ops-visibility";
import { toSimpleCaseStatus } from "@/lib/cases/types";
import { ROLE_LABELS } from "@/lib/types";
import type { UserRole } from "@/lib/types";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  if (
    !isSupportSupervisorRole(session!.user.role) &&
    !hasApiPermission(session!, "view_dashboard")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isSupportSupervisorRole(session!.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const managerId = session!.user.id;
  const team = await getManagedUsers(managerId);

  const rawCases = await listCases({
    supportSupervisorUserId: managerId,
    limit: 200,
    role: session!.user.role,
  });

  const visibleRawCases = filterItemsByFieldOpsVisibility(rawCases, session!.user.role);
  const cases = visibleRawCases.map(mapCaseToClient);
  const today = new Date().toDateString();

  const stats = {
    teamSize: team.length,
    activeTeam: team.filter((u) => u.isActive).length,
    totalCases: cases.length,
    openCases: cases.filter((c) => toSimpleCaseStatus(c.status) !== "CLOSED").length,
    newToday: cases.filter((c) => new Date(c.createdAt).toDateString() === today).length,
    inProgress: cases.filter((c) => toSimpleCaseStatus(c.status) === "IN_PROGRESS").length,
  };

  const byMember = team.map((member) => {
    const memberCases = cases.filter((c) => c.createdBy === member.id);
    return {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      roleLabel: ROLE_LABELS[member.role as UserRole] ?? member.role,
      governorate: member.governorate,
      isActive: member.isActive,
      caseCount: memberCases.length,
      openCount: memberCases.filter((c) => toSimpleCaseStatus(c.status) !== "CLOSED").length,
    };
  });

  const recentCases = [...cases]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 30)
    .map((c) => ({
      id: c.id,
      number: c.number,
      title: c.title,
      status: c.status,
      simpleStatus: toSimpleCaseStatus(c.status),
      createdByName: c.createdByName,
      createdByRole: c.createdByRole
        ? (ROLE_LABELS[c.createdByRole as UserRole] ?? c.createdByRole)
        : undefined,
      governorate: c.governorate,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

  return NextResponse.json({ stats, team: byMember, recentCases });
}
