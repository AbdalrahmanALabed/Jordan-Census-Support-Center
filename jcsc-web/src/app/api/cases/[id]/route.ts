import { NextRequest, NextResponse } from "next/server";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import {
  getCaseById,
  mapCaseToClient,
  mapCaseComment,
  mapCaseTimeline,
  mapCaseDecision,
  mapCaseAttachment,
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

  return NextResponse.json({
    case: mapCaseToClient(caseItem),
    comments: caseItem.comments.map(mapCaseComment),
    timeline: caseItem.timeline.map(mapCaseTimeline),
    decisions: caseItem.decisions.map(mapCaseDecision),
    attachments: caseItem.attachments.map(mapCaseAttachment),
  });
}
