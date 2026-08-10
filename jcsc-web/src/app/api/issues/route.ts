import { NextRequest, NextResponse } from "next/server";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import { isManagerRole } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { listIssues, mapIssueListItem } from "@/lib/issues/server";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  if (!hasApiPermission(session!, "view_issues") && !hasApiPermission(session!, "view_tickets")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const team = req.nextUrl.searchParams.get("team");
  const status = req.nextUrl.searchParams.get("status");
  const priority = req.nextUrl.searchParams.get("priority");
  const category = req.nextUrl.searchParams.get("category");
  const search = req.nextUrl.searchParams.get("search");
  const governorate = req.nextUrl.searchParams.get("governorate");

  const where: Record<string, unknown> = {};
  const role = session!.user.role as UserRole;
  const isManager = isManagerRole(role);

  if (!isManager) {
    const userTeam = session!.user.team;
    if (userTeam) {
      where.team = userTeam;
    } else {
      where.assigneeId = session!.user.id;
    }
  } else if (team && team !== "ALL") {
    where.team = team;
  }

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (governorate && governorate !== "ALL") {
    where.governorate = governorate;
  }

  if (priority && priority !== "ALL") {
    where.priority = priority;
  }

  if (category && category !== "ALL") {
    where.category = category;
  }

  let issues = await listIssues(where);

  if (search) {
    const q = search.toLowerCase();
    issues = issues.filter(
      (i) =>
        i.number.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        i.governorate.includes(q)
    );
  }

  return NextResponse.json(issues.map(mapIssueListItem));
}
