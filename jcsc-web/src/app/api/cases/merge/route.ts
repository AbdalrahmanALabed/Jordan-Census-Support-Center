import { NextRequest, NextResponse } from "next/server";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { mergeCasesDb } from "@/lib/cases/server";

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  if (!hasApiPermission(session!, "manage_issues") && !hasApiPermission(session!, "close_issues")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { primaryCaseId, mergeCaseIds } = body;

  if (!primaryCaseId || !Array.isArray(mergeCaseIds) || mergeCaseIds.length === 0) {
    return NextResponse.json({ error: "Invalid merge payload" }, { status: 400 });
  }

  const result = await mergeCasesDb(
    primaryCaseId,
    mergeCaseIds,
    session!.user.name ?? "مدير"
  );

  await logAudit({
    action: "EDIT",
    entityType: "Case",
    entityId: primaryCaseId,
    userId: session!.user.id,
    details: JSON.stringify({ merged: mergeCaseIds }),
  });

  return NextResponse.json(result);
}
