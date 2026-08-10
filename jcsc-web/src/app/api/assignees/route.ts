import { NextResponse } from "next/server";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import { listAssigneeOptions } from "@/lib/assignees/server";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  const canAssign =
    hasApiPermission(session!, "review_reports") ||
    hasApiPermission(session!, "manage_issues") ||
    hasApiPermission(session!, "assign_issues") ||
    hasApiPermission(session!, "convert_to_issue") ||
    session!.user.role === "ADMIN";

  if (!canAssign) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assignees = await listAssigneeOptions();
  return NextResponse.json(assignees);
}
