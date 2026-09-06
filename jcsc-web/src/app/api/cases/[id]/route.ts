import { NextRequest, NextResponse } from "next/server";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import { isSupportSupervisorRole, isSupportCoordinatorRole, isSuperAdminRole } from "@/lib/permissions";
import { isCaseVisibleToSupportSupervisor } from "@/lib/support-supervisor/server";
import { isCaseAssignedToCoordinator } from "@/lib/coordinator-routing";
import {
  getCaseById,
  mapCaseToClient,
  mapCaseComment,
  mapCaseTimeline,
  mapCaseDecision,
  resolveCaseAttachmentsForClient,
} from "@/lib/cases/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireSession();
  if (response) return response;

  const canViewAll =
    hasApiPermission(session!, "view_issues") ||
    hasApiPermission(session!, "review_reports");
  const canViewOwn = hasApiPermission(session!, "view_own_reports");

  if (!canViewAll && !canViewOwn) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const caseItem = await getCaseById(id);
  if (!caseItem) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    !canViewAll &&
    canViewOwn &&
    caseItem.createdById !== session!.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isSupportSupervisorRole(session!.user.role)) {
    const visible = await isCaseVisibleToSupportSupervisor(
      session!.user.id,
      caseItem.createdById
    );
    if (!visible) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (
    isSupportCoordinatorRole(session!.user.role) &&
    !isSuperAdminRole(session!.user.role as import("@prisma/client").UserRole)
  ) {
    const allowed = await isCaseAssignedToCoordinator(session!.user.id, {
      assignedCoordinatorId: caseItem.assignedCoordinatorId,
      governorate: caseItem.governorate,
    });
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({
    case: mapCaseToClient(caseItem),
    comments: caseItem.comments.map(mapCaseComment),
    timeline: caseItem.timeline.map(mapCaseTimeline),
    decisions: caseItem.decisions.map(mapCaseDecision),
    attachments: await resolveCaseAttachmentsForClient(caseItem),
  });
}
