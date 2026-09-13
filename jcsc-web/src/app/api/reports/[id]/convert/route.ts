import { NextRequest, NextResponse } from "next/server";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import {
  getReportWithRelations,
  mapReportToClient,
  generateIssueNumber,
  reportClientInclude,
} from "@/lib/reports/server";
import { createIssueChecklist } from "@/lib/issues/server";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { session, response } = await requireSession();
  if (response) return response;

  if (!hasApiPermission(session!, "convert_to_issue")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { team, priority, category, assigneeId, reason, slaHours = 4 } = body;
  const issueCategory = category ?? body.issueType ?? "أخرى";

  const report = await getReportWithRelations(id);
  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (report.status === "CONVERTED" || report.status === "REJECTED") {
    return NextResponse.json({ error: "Report already processed" }, { status: 400 });
  }

  const issueNumber = await generateIssueNumber(report.affectedSystem);
  const slaTargetAt = new Date(Date.now() + slaHours * 3600000);

  const issue = await prisma.issue.create({
    data: {
      number: issueNumber,
      title: report.description,
      description: reason ? `سبب التحويل: ${reason}` : undefined,
      category: issueCategory,
      team,
      priority,
      governorate: report.governorate,
      enumeratorsAffected: report.enumeratorsAffected,
      assigneeId: assigneeId || null,
      status: assigneeId ? "ASSIGNED" : "RECEIVED",
      slaTargetAt,
      reports: {
        create: { reportId: id },
      },
      timeline: {
        create: {
          action: "إنشاء المسألة",
          details: `من الملاحظة ${report.number} — ${report.enumeratorsAffected} مستخدم متأثر`,
          actorId: session!.user.id,
        },
      },
    },
  });

  await createIssueChecklist(issue.id, issueCategory);

  const updatedReport = await prisma.report.update({
    where: { id },
    data: {
      status: "CONVERTED",
      convertedIssueId: issue.id,
      classification: body.classification ?? "BUG",
      reviewedById: session!.user.id,
      reviewedAt: new Date(),
    },
    include: reportClientInclude,
  });

  if (assigneeId) {
    await sendNotification({
      userId: assigneeId,
      title: "مسألة جديدة",
      message: `${issueNumber} — ${report.description.slice(0, 80)}`,
      type: "issue_assigned",
      entityType: "Issue",
      entityId: issue.id,
      issueNumber,
      priority: priority === "CRITICAL" ? "CRITICAL" : undefined,
    });
  }

  await logAudit({
    action: "CREATE",
    entityType: "Issue",
    entityId: issue.id,
    userId: session!.user.id,
    details: JSON.stringify({ reportId: id, issueNumber }),
  });

  return NextResponse.json({
    report: mapReportToClient(updatedReport),
    issue: {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      team: issue.team,
      enumeratorsAffected: issue.enumeratorsAffected,
    },
  });
}
