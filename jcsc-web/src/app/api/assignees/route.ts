import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { canSelectDeveloperAssignee } from "@/lib/permissions";
import { listAssigneeOptions } from "@/lib/assignees/server";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  if (!canSelectDeveloperAssignee(session!.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assignees = await listAssigneeOptions();
  return NextResponse.json(assignees);
}
