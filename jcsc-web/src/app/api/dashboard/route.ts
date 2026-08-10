import { NextResponse } from "next/server";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  if (!hasApiPermission(session!, "view_dashboard")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  const [
    pendingReview,
    waitingClassification,
    waitingAssignment,
    waitingDeployment,
    waitingConfirmation,
    slaBreached,
    reports,
    issues,
    reportTypeGroups,
    teamGroups,
  ] = await Promise.all([
    prisma.report.count({ where: { status: "NEW" } }),
    prisma.report.count({ where: { status: { in: ["UNDER_REVIEW", "CLASSIFIED"] } } }),
    prisma.issue.count({ where: { status: "RECEIVED", assigneeId: null } }),
    prisma.issue.count({ where: { status: "WAITING_DEPLOYMENT" } }),
    prisma.issue.count({ where: { status: "READY_FOR_TESTING" } }),
    prisma.issue.count({
      where: {
        slaTargetAt: { lt: now },
        status: { notIn: ["CLOSED"] },
      },
    }),
    prisma.report.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: { description: true, enumeratorsAffected: true },
    }),
    prisma.issue.findMany({
      where: { status: { notIn: ["CLOSED"] } },
      select: { title: true, team: true, category: true },
    }),
    prisma.issue.groupBy({
      by: ["category"],
      where: { createdAt: { gte: weekAgo } },
      _count: true,
      orderBy: { _count: { category: "desc" } },
      take: 1,
    }),
    prisma.issue.groupBy({
      by: ["team"],
      where: { status: { notIn: ["CLOSED"] } },
      _count: true,
      orderBy: { _count: { team: "desc" } },
      take: 1,
    }),
  ]);

  const topImpactReport = [...reports].sort(
    (a, b) => b.enumeratorsAffected - a.enumeratorsAffected
  )[0];

  const mostFrequentType = reportTypeGroups[0]?.category ?? "—";
  const mostLoadedTeam = teamGroups[0]?.team ?? "—";

  return NextResponse.json({
    pendingReview,
    waitingClassification,
    waitingAssignment,
    waitingDeployment,
    waitingConfirmation,
    slaBreached,
    topImpactToday: topImpactReport
      ? {
          description: topImpactReport.description,
          enumeratorsAffected: topImpactReport.enumeratorsAffected,
        }
      : null,
    mostFrequentTypeThisWeek: mostFrequentType,
    mostLoadedTeam,
    openIssues: issues.length,
  });
}
