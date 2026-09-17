import { NextResponse } from "next/server";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import { getCaseSummaryStats } from "@/lib/cases/server";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  if (
    !hasApiPermission(session!, "view_issues") &&
    !hasApiPermission(session!, "review_reports") &&
    !hasApiPermission(session!, "view_dashboard")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stats = await getCaseSummaryStats(session!.user.role, session!.user.id);
  return NextResponse.json(stats);
}
