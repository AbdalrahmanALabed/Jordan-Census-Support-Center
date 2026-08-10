import { NextResponse } from "next/server";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { parseKeywords } from "@/lib/reports/server";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  if (!hasApiPermission(session!, "manage_routing")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rules = await prisma.routingRule.findMany({ orderBy: { createdAt: "asc" } });

  return NextResponse.json(
    rules.map((r) => ({
      id: r.id,
      keywords: parseKeywords(r.keywords),
      recommendedTeam: r.recommendedTeam,
      recommendedClassification: r.recommendedClassification,
      priority: r.priority,
      autoConvertAllowed: r.autoConvertAllowed,
      enabled: r.enabled,
    }))
  );
}
