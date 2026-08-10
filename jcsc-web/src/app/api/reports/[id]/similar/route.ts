import { NextRequest, NextResponse } from "next/server";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import {
  getReportWithRelations,
  findSimilarReports,
} from "@/lib/reports/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { session, response } = await requireSession();
  if (response) return response;

  if (!hasApiPermission(session!, "review_reports")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const report = await getReportWithRelations(id);
  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const similar = await findSimilarReports(
    id,
    report.description,
    report.affectedSystem
  );

  return NextResponse.json(similar);
}
