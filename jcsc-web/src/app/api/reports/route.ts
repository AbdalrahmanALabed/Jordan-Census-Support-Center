import { NextRequest, NextResponse } from "next/server";
import { ReportStatus } from "@prisma/client";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import { isSupportCoordinatorRole } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  generateReportNumber,
  recommendRouting,
  mapReportToClient,
  listReportsWithRelations,
} from "@/lib/reports/server";
import { prisma } from "@/lib/db";
import { notifySupportCoordinators } from "@/lib/notifications/server";
import { createCaseFromReport } from "@/lib/cases/server";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const status = req.nextUrl.searchParams.get("status");
  const governorate = req.nextUrl.searchParams.get("governorate");
  const search = req.nextUrl.searchParams.get("search");
  const supervisorOnly = req.nextUrl.searchParams.get("supervisorOnly") === "true";

  const where: Record<string, unknown> = {};

  if (supervisorOnly && hasApiPermission(session!, "view_own_reports")) {
    where.supervisorId = session!.user.id;
  } else if (!hasApiPermission(session!, "review_reports")) {
    where.supervisorId = session!.user.id;
  }

  if (status && status !== "ALL") {
    const statusMap: Record<string, ReportStatus> = {
      NEW: "NEW",
      UNDER_REVIEW: "UNDER_REVIEW",
      WAITING_CLASSIFICATION: "CLASSIFIED",
      CONVERTED_TO_TICKET: "CONVERTED",
      REJECTED: "REJECTED",
    };
    where.status = statusMap[status] ?? status;
  }

  if (governorate && governorate !== "ALL") {
    where.governorate = governorate;
  }

  let reports = await listReportsWithRelations(where);

  if (search) {
    const q = search.toLowerCase();
    reports = reports.filter(
      (r) =>
        r.description.toLowerCase().includes(q) ||
        r.number.toLowerCase().includes(q) ||
        r.supervisor.name.includes(q)
    );
  }

  return NextResponse.json(reports.map(mapReportToClient));
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  if (!hasApiPermission(session!, "submit_report") && !hasApiPermission(session!, "log_report_fallback")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    observation,
    governorate = "غير محدد",
    district,
    center,
    enumeratorsAffected = 1,
    submissionChannel = "app",
    affectedSystem = "FIELD_OPERATIONS",
    attachmentNames = [],
    supervisorId,
  } = body;

  if (!observation?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!governorate?.trim() || governorate === "غير محدد") {
    return NextResponse.json({ error: "المحافظة مطلوبة" }, { status: 400 });
  }
  const affectedCount = Number(enumeratorsAffected);
  if (!Number.isFinite(affectedCount) || affectedCount < 1) {
    return NextResponse.json({ error: "عدد المتأثرين مطلوب" }, { status: 400 });
  }

  const validSystems = ["CALL_CENTER", "SELF_ENUMERATION", "RESEARCHER_SYSTEM", "FIELD_OPERATIONS"];
  const system = validSystems.includes(affectedSystem) ? affectedSystem : "FIELD_OPERATIONS";

  const routing = await recommendRouting(observation);
  const number = await generateReportNumber(system);

  const status: ReportStatus = "NEW";
  const convertedIssueId: string | undefined = undefined;

  const report = await prisma.report.create({
    data: {
      number,
      description: observation.trim(),
      governorate,
      district: district || null,
      center: center || null,
      enumeratorsAffected: Math.max(1, Number(enumeratorsAffected) || 1),
      supervisorId: supervisorId || session!.user.id,
      submissionChannel,
      affectedSystem: system,
      recommendedTeam: routing.team,
      recommendedPriority: routing.priority,
      status,
      convertedIssueId,
      attachments: {
        create: attachmentNames.map((a: { name: string; type: string; url?: string }) => ({
          name: a.name,
          type: a.type.toUpperCase(),
          url: a.url || "/uploads/placeholder",
        })),
      },
    },
    include: {
      supervisor: true,
      reviewedBy: true,
      convertedIssue: true,
      attachments: true,
    },
  });

  if (status === "NEW") {
    await createCaseFromReport({
      reportId: report.id,
      reportNumber: number,
      description: observation.trim(),
      governorate,
      affectedUsers: Math.max(1, Number(enumeratorsAffected) || 1),
      createdById: supervisorId || session!.user.id,
      affectedSystem: system,
    });

    await notifySupportCoordinators({
      title: "بلاغ جديد — يحتاج تصنيف",
      message: `${number} — ${enumeratorsAffected} مستخدم متأثر`,
      type: "report_new",
      entityType: "Report",
      entityId: report.id,
      level: "warning",
      actionRequired: true,
      excludeUserId: isSupportCoordinatorRole(session!.user.role)
        ? session!.user.id
        : undefined,
    });
  }

  await logAudit({
    action: "CREATE",
    entityType: "Report",
    entityId: report.id,
    userId: session!.user.id,
    details: JSON.stringify({ number, enumeratorsAffected }),
  });

  return NextResponse.json(mapReportToClient(report), { status: 201 });
}
