import { NextRequest, NextResponse } from "next/server";
import type { ReportClassification, ReportStatus } from "@prisma/client";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import {
  mapReportToClient,
  getReportWithRelations,
} from "@/lib/reports/server";
import {
  classifyAndAssignCaseDb,
  reviewCaseNotProblemDb,
  findCaseByReportId,
} from "@/lib/cases/server";
import { sendNotification } from "@/lib/notifications/server";
import { prisma } from "@/lib/db";
import { censusSystemToLabel } from "@/lib/types";
import { resolveAssigneeId } from "@/lib/assignees/server";

type Params = { params: Promise<{ id: string }> };

const CLIENT_TO_DB_STATUS: Record<string, ReportStatus> = {
  NEW: "NEW",
  UNDER_REVIEW: "UNDER_REVIEW",
  WAITING_CLASSIFICATION: "CLASSIFIED",
  CLASSIFIED: "CLASSIFIED",
  CONVERTED_TO_TICKET: "CONVERTED",
  CONVERTED: "CONVERTED",
  REJECTED: "REJECTED",
};

export async function GET(_req: NextRequest, { params }: Params) {
  const { session, response } = await requireSession();
  if (response) return response;

  const { id } = await params;
  const report = await getReportWithRelations(id);

  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canViewAll = hasApiPermission(session!, "review_reports");
  if (!canViewAll && report.supervisorId !== session!.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await logAudit({
    action: "VIEW",
    entityType: "Report",
    entityId: id,
    userId: session!.user.id,
  });

  return NextResponse.json(mapReportToClient(report));
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, response } = await requireSession();
  if (response) return response;

  if (!hasApiPermission(session!, "review_reports")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { action, reason, classification, status: clientStatus, assigneeId, assignedTeam, priority, severity, observation, affectedSystem } = body;
  const actorId = session!.user.id;
  const actorName = session!.user.name ?? "مدير";

  const existing = await getReportWithRelations(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const linkedCase = await findCaseByReportId(id);

  if (action === "confirm_and_assign") {
    const resolvedId = await resolveAssigneeId(assigneeId ?? assignedTeam ?? "");
    if (!resolvedId) {
      return NextResponse.json({ error: "يجب اختيار المسؤول" }, { status: 400 });
    }
    const assignee = await prisma.user.findUnique({
      where: { id: resolvedId },
      select: { team: true },
    });
    const team = assignedTeam ?? assignee?.team ?? "Developer";
    const systemLabel = affectedSystem
      ? censusSystemToLabel(affectedSystem)
      : existing.affectedSystem ?? undefined;
    if (linkedCase) {
      const assignResult = await classifyAndAssignCaseDb(
        linkedCase.id,
        "BUG",
        actorId,
        actorName,
        resolvedId,
        {
          assignedTeam: team,
          priority,
          severity,
          description: observation?.trim() || undefined,
          affectedSystem: systemLabel,
        }
      );
      const alreadyAssigned =
        !assignResult &&
        linkedCase.status === "IN_PROGRESS" &&
        linkedCase.caseType === "BUG" &&
        linkedCase.assignedDeveloperId === resolvedId;

      if (!assignResult && !alreadyAssigned) {
        return NextResponse.json(
          {
            error: "فشل إسناد الحالة المرتبطة",
            details:
              linkedCase.status !== "OPEN" &&
              linkedCase.status !== "UNDER_REVIEW" &&
              linkedCase.status !== "AWAITING_APPROVAL"
                ? `حالة البلاغ: ${linkedCase.status} — لا يمكن الإسناد من هذه الحالة`
                : "تعذّر تحديث الحالة",
          },
          { status: 400 }
        );
      }
      if (assignResult) {
        await sendNotification({
          userId: resolvedId,
          title: "تم تعيينك على مشكلة جديدة",
          message: `${linkedCase.number} — ${linkedCase.title}`,
          type: "case_assigned",
          entityType: "Case",
          entityId: linkedCase.id,
          level: "info",
          actionRequired: true,
        });
      }
    }
    const report = await prisma.report.update({
      where: { id },
      data: {
        status: "CLASSIFIED",
        classification: "BUG",
        reviewedById: actorId,
        reviewedAt: new Date(),
        ...(observation?.trim() && { description: observation.trim() }),
        ...(systemLabel && { affectedSystem: systemLabel }),
      },
      include: {
        supervisor: true,
        reviewedBy: true,
        convertedIssue: true,
        attachments: true,
      },
    });
    await logAudit({
      action: "EDIT",
      entityType: "Report",
      entityId: id,
      userId: actorId,
      details: JSON.stringify({ action, assignedTeam: team, priority }),
    });
    return NextResponse.json(mapReportToClient(report));
  }

  if (action === "reject") {
    const cls = (classification as ReportClassification) ?? "USER_MISTAKE";
    const rejectReason = reason?.trim() || "ليست مشكلة";
    if (linkedCase) {
      await reviewCaseNotProblemDb(linkedCase.id, actorId, actorName, cls, rejectReason);
    }
    const report = await prisma.report.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: rejectReason,
        classification: cls,
        reviewedById: actorId,
        reviewedAt: new Date(),
      },
      include: {
        supervisor: true,
        reviewedBy: true,
        convertedIssue: true,
        attachments: true,
      },
    });
    await logAudit({
      action: "REJECT",
      entityType: "Report",
      entityId: id,
      userId: actorId,
      details: JSON.stringify({ action, reason, classification: cls }),
    });
    return NextResponse.json(mapReportToClient(report));
  }

  const data: {
    status?: ReportStatus;
    classification?: ReportClassification;
    rejectionReason?: string;
    reviewedById: string;
    reviewedAt: Date;
  } = {
    reviewedById: actorId,
    reviewedAt: new Date(),
  };

  switch (action) {
    case "start_review":
      data.status = "UNDER_REVIEW";
      break;
    case "ready_for_classification":
      data.status = "CLASSIFIED";
      break;
    case "confirm_problem":
      data.status = "CLASSIFIED";
      data.classification = (classification as ReportClassification) ?? "BUG";
      break;
    default:
      if (clientStatus && CLIENT_TO_DB_STATUS[clientStatus]) {
        data.status = CLIENT_TO_DB_STATUS[clientStatus];
      } else {
        return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
      }
  }

  const report = await prisma.report.update({
    where: { id },
    data,
    include: {
      supervisor: true,
      reviewedBy: true,
      convertedIssue: true,
      attachments: true,
    },
  });

  await logAudit({
    action: action === "reject" ? "REJECT" : "EDIT",
    entityType: "Report",
    entityId: id,
    userId: actorId,
    details: JSON.stringify({ action, reason }),
  });

  return NextResponse.json(mapReportToClient(report));
}
