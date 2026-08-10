import { NextRequest, NextResponse } from "next/server";
import type { IssueStatus } from "@prisma/client";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import { isManagerRole, isDeveloperRole } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import {
  getIssueById,
  mapIssueToTicket,
  DEVELOPER_ALLOWED_STATUSES,
  MANAGER_ONLY_STATUSES,
  statusLabel,
} from "@/lib/issues/server";
import { prisma } from "@/lib/db";
import { sendNotification, notifySuperAdmins } from "@/lib/notifications/server";

type Params = { params: Promise<{ id: string }> };

function canAccessIssue(
  session: { user: { id: string; role: string; team?: string | null } },
  issue: NonNullable<Awaited<ReturnType<typeof getIssueById>>>
) {
  const role = session.user.role as UserRole;
  if (isManagerRole(role)) return true;
  if (issue.assigneeId === session.user.id) return true;
  if (session.user.team && issue.team === session.user.team) return true;
  return false;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { session, response } = await requireSession();
  if (response) return response;

  const { id } = await params;
  const issue = await getIssueById(id);
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canAccessIssue(session!, issue)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await logAudit({
    action: "VIEW",
    entityType: "Issue",
    entityId: id,
    userId: session!.user.id,
  });

  return NextResponse.json(mapIssueToTicket(issue));
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, response } = await requireSession();
  if (response) return response;

  const { id } = await params;
  const body = await req.json();
  const issue = await getIssueById(id);
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canAccessIssue(session!, issue)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const role = session!.user.role as UserRole;
  const isManager = isManagerRole(role);
  const canManage = hasApiPermission(session!, "manage_issues");
  const canClose = hasApiPermission(session!, "close_issues");
  const canAssign = hasApiPermission(session!, "assign_issues");

  if (body.action === "add_comment") {
    if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const comment = await prisma.issueComment.create({
      data: {
        issueId: id,
        authorId: session!.user.id,
        content: body.content,
        isInternal: body.isInternal ?? true,
      },
      include: { author: true },
    });
    await prisma.issueTimelineEvent.create({
      data: {
        issueId: id,
        action: "تعليق جديد",
        details: body.content.slice(0, 120),
        actorId: session!.user.id,
      },
    });
    return NextResponse.json({
      id: comment.id,
      content: comment.content,
      authorName: comment.author.name,
      createdAt: comment.createdAt.toISOString(),
    });
  }

  if (body.action === "toggle_checklist") {
    if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const item = await prisma.issueChecklistItem.update({
      where: { id: body.itemId },
      data: { completed: body.completed },
    });
    return NextResponse.json(item);
  }

  const newStatus = body.status as IssueStatus | undefined;
  if (!newStatus) {
    return NextResponse.json({ error: "Missing status" }, { status: 400 });
  }

  if (newStatus === "CLOSED") {
    if (!canClose) {
      return NextResponse.json(
        { error: "Only the Support Manager can close issues" },
        { status: 403 }
      );
    }
  } else if (newStatus === "RETURNED") {
    if (!canClose) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!body.comment?.trim()) {
      return NextResponse.json({ error: "Return requires a comment" }, { status: 400 });
    }
  } else if (MANAGER_ONLY_STATUSES.includes(newStatus) && newStatus !== "ASSIGNED") {
    if (!isManager && !canAssign) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!DEVELOPER_ALLOWED_STATUSES.includes(newStatus)) {
    return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
  } else if (isDeveloperRole(role) && !DEVELOPER_ALLOWED_STATUSES.includes(newStatus)) {
    return NextResponse.json({ error: "Developers can only mark bugs as solved" }, { status: 403 });
  } else if (!canManage && issue.assigneeId !== session!.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (newStatus === "CLOSED" && !isManager) {
    return NextResponse.json({ error: "Developers cannot close issues directly" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = { status: newStatus };
  const previousAssigneeId = issue.assigneeId;
  if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId;
  if (body.resolutionNote) updateData.resolutionNote = body.resolutionNote;
  if (body.rootCause) updateData.rootCause = body.rootCause;
  if (newStatus === "CLOSED") updateData.closeReason = body.closeReason ?? "تم التأكيد من المدير";

  const updated = await prisma.issue.update({
    where: { id },
    data: updateData,
    include: {
      assignee: true,
      reports: { include: { report: { include: { supervisor: true } } } },
      comments: { include: { author: true } },
      timeline: true,
      checklist: true,
      attachments: true,
    },
  });

  await prisma.issueTimelineEvent.create({
    data: {
      issueId: id,
      action: "تغيير الحالة",
      details: `${statusLabel(issue.status)} → ${statusLabel(newStatus)}${body.comment ? `: ${body.comment}` : ""}`,
      actorId: session!.user.id,
    },
  });

  if (body.comment && newStatus === "RETURNED") {
    await prisma.issueComment.create({
      data: {
        issueId: id,
        authorId: session!.user.id,
        content: body.comment,
        isInternal: true,
      },
    });
  }

  if (body.assigneeId && body.assigneeId !== previousAssigneeId) {
    await sendNotification({
      userId: body.assigneeId,
      title: "إعادة تعيين مسألة",
      message: `${updated.number} — ${statusLabel(newStatus)}`,
      type: "issue_reassigned",
      entityType: "Issue",
      entityId: id,
      issueNumber: updated.number,
      priority: updated.priority === "CRITICAL" ? "CRITICAL" : undefined,
    });
  } else if (
    newStatus !== issue.status &&
    updated.assigneeId &&
    updated.assigneeId !== session!.user.id &&
    !["READY_FOR_TESTING", "WAITING_DEPLOYMENT"].includes(newStatus)
  ) {
    await sendNotification({
      userId: updated.assigneeId,
      title: "تحديث حالة المسألة",
      message: `${updated.number}: ${statusLabel(issue.status)} → ${statusLabel(newStatus)}`,
      type: "issue_status_change",
      entityType: "Issue",
      entityId: id,
      issueNumber: updated.number,
    });
  }

  if (newStatus === "READY_FOR_TESTING" || newStatus === "WAITING_DEPLOYMENT") {
    await notifySuperAdmins({
      title: "مسألة تحتاج تأكيدك",
      message: `${updated.number} — ${statusLabel(newStatus)}`,
      type: "issue_status",
      entityType: "Issue",
      entityId: id,
      issueNumber: updated.number,
      level: "warning",
      actionRequired: true,
    });
  }

  if (newStatus === "RETURNED" && updated.assigneeId) {
    await sendNotification({
      userId: updated.assigneeId,
      title: "مسألة مُعادّة",
      message: `${updated.number} — ${body.comment?.slice(0, 80)}`,
      type: "issue_returned",
      entityType: "Issue",
      entityId: id,
      issueNumber: updated.number,
      level: "warning",
      actionRequired: true,
    });
  }

  if (newStatus === "CLOSED" && updated.assigneeId) {
    await sendNotification({
      userId: updated.assigneeId,
      title: "تم إغلاق المسألة",
      message: `${updated.number} — ${body.closeReason ?? "تم التأكيد من المدير"}`,
      type: "issue_closed",
      entityType: "Issue",
      entityId: id,
      issueNumber: updated.number,
    });
  }

  await logAudit({
    action: newStatus === "CLOSED" ? "CLOSE" : "STATUS_CHANGE",
    entityType: "Issue",
    entityId: id,
    userId: session!.user.id,
    details: JSON.stringify({ from: issue.status, to: newStatus }),
  });

  return NextResponse.json(mapIssueToTicket(updated));
}
