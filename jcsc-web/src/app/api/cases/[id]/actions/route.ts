import { NextRequest, NextResponse } from "next/server";
import type { CaseType, KnowledgeValue } from "@prisma/client";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import {
  getCaseById,
  mapCaseToClient,
  mapCaseComment,
  classifyCaseDb,
  resolveCaseImmediateDb,
  approveCaseAsBugDb,
  closeCaseDb,
  assignCaseDeveloperDb,
  addCaseCommentDb,
  markCaseSolvedDb,
  addCaseAttachmentDb,
  returnCaseToDeveloperDb,
  reassignCaseDeveloperDb,
  returnCaseToSuperAdminDb,
  acceptAndClassifyCaseDb,
  acceptCaseDb,
  classifyAndAssignCaseDb,
  dismissNotAProblemDb,
  reviewCaseAsProblemDb,
  reviewCaseNotProblemDb,
  coordinatorEscalateSystemBugDb,
  coordinatorDismissNotSystemBugDb,
} from "@/lib/cases/server";
import { sendNotification, notifySuperAdmins } from "@/lib/notifications/server";
import { resolveAssigneeId } from "@/lib/assignees/server";
import { isDeveloperRole, isSupportCoordinatorRole } from "@/lib/permissions";

const COORDINATOR_ALLOWED_ACTIONS = new Set([
  "coordinator_escalate_system_bug",
  "coordinator_dismiss_not_system",
]);

const COORDINATOR_QUEUE_BLOCKED = new Set([
  "accept_case",
  "review_problem",
  "review_not_problem",
  "dismiss_not_problem",
  "classify_and_assign",
  "accept_classify",
  "classify",
  "approve",
]);

function isAssignedDeveloper(
  caseRow: { assignedDeveloperId: string | null },
  actorId: string
) {
  return caseRow.assignedDeveloperId === actorId;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireSession();
  if (response) return response;

  const { id } = await params;
  const body = await req.json();
  const { action } = body;
  const actorId = session!.user.id;
  const actorName = session!.user.name ?? "مستخدم";

  const existing = await getCaseById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    isSupportCoordinatorRole(session!.user.role) &&
    !COORDINATOR_ALLOWED_ACTIONS.has(action)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    existing.status === "OPEN" &&
    COORDINATOR_QUEUE_BLOCKED.has(action) &&
    !(
      isSupportCoordinatorRole(session!.user.role) &&
      COORDINATOR_ALLOWED_ACTIONS.has(action)
    )
  ) {
    return NextResponse.json(
      { error: "الحالة بانتظار تصنيف منسق الدعم" },
      { status: 403 }
    );
  }

  switch (action) {
    case "classify": {
      if (!hasApiPermission(session!, "classify_reports") && !hasApiPermission(session!, "manage_issues")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await classifyCaseDb(id, body.caseType as CaseType, actorId, actorName);
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await logAudit({ action: "EDIT", entityType: "Case", entityId: id, userId: actorId, details: `classify:${body.caseType}` });
      return NextResponse.json(mapCaseToClient(updated));
    }

    case "resolve": {
      if (!hasApiPermission(session!, "manage_issues") && !hasApiPermission(session!, "close_issues")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await resolveCaseImmediateDb({
        caseId: id,
        resolutionType: body.resolutionType,
        resolutionNotes: body.resolutionNotes,
        timeSpentMinutes: body.timeSpentMinutes ?? 15,
        solvedById: actorId,
        solvedByName: actorName,
        knowledgeValue: body.knowledgeValue as KnowledgeValue | undefined,
      });
      await logAudit({ action: "STATUS_CHANGE", entityType: "Case", entityId: id, userId: actorId, details: "resolved_immediate" });
      return NextResponse.json(mapCaseToClient(updated));
    }

    case "approve": {
      if (!hasApiPermission(session!, "close_issues") && !hasApiPermission(session!, "convert_to_issue")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await approveCaseAsBugDb(id, actorId, actorName);
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await logAudit({ action: "APPROVE", entityType: "Case", entityId: id, userId: actorId });
      return NextResponse.json(mapCaseToClient(updated));
    }

    case "close": {
      if (!hasApiPermission(session!, "close_issues")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await closeCaseDb(id, actorId, actorName, body.resolutionNotes);
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (updated.createdById && updated.createdById !== actorId) {
        await sendNotification({
          userId: updated.createdById,
          title: "تم إغلاق حالتك",
          message: `${updated.number} — ${updated.title}`,
          type: "case_closed",
          entityType: "Case",
          entityId: id,
          issueNumber: updated.number,
          level: "info",
        });
      }
      await logAudit({ action: "CLOSE", entityType: "Case", entityId: id, userId: actorId });
      return NextResponse.json(mapCaseToClient(updated));
    }

    case "assign": {
      if (!hasApiPermission(session!, "assign_issues")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await assignCaseDeveloperDb(id, body.developerId, actorId, actorName);
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (updated.assignedDeveloperId) {
        await sendNotification({
          userId: updated.assignedDeveloperId,
          title: "تم تعيينك على حالة",
          message: `${updated.number} — ${updated.title}`,
          type: "case_assigned",
          entityType: "Case",
          entityId: id,
          level: "info",
          actionRequired: true,
        });
      }
      await logAudit({ action: "ASSIGN", entityType: "Case", entityId: id, userId: actorId });
      return NextResponse.json(mapCaseToClient(updated));
    }

    case "return": {
      if (!hasApiPermission(session!, "close_issues")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const result = await returnCaseToDeveloperDb(id, actorId, actorName, body.reason ?? "");
      if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await sendNotification({
        userId: result.developerId,
        title: "تم إرجاع الحالة إليك",
        message: `${result.updated.number} — ${body.reason?.slice(0, 80) ?? ""}`,
        type: "case_returned",
        entityType: "Case",
        entityId: id,
        level: "warning",
        actionRequired: true,
      });
      await logAudit({ action: "STATUS_CHANGE", entityType: "Case", entityId: id, userId: actorId, details: "returned" });
      return NextResponse.json(mapCaseToClient(result.updated));
    }

    case "comment": {
      if (
        isDeveloperRole(session!.user.role) &&
        !isAssignedDeveloper(existing, actorId)
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const comment = await addCaseCommentDb({
        caseId: id,
        content: body.content,
        authorId: actorId,
        isInternal: body.isInternal ?? false,
      });
      return NextResponse.json(mapCaseComment(comment));
    }

    case "mark_solved": {
      if (!hasApiPermission(session!, "manage_issues")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (
        isDeveloperRole(session!.user.role) &&
        !isAssignedDeveloper(existing, actorId)
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await markCaseSolvedDb(
        id,
        actorId,
        actorName,
        body.resolutionNotes ?? "",
        body.requiresDeployment === true
      );
      await notifySuperAdmins({
        title: "تم حل المشكلة — بانتظار تأكيدك",
        message: `${updated.number} — ${body.resolutionNotes?.slice(0, 80) ?? ""}`,
        type: "case_solved",
        entityType: "Case",
        entityId: id,
        level: "warning",
        actionRequired: true,
      });
      await logAudit({ action: "STATUS_CHANGE", entityType: "Case", entityId: id, userId: actorId, details: "solved" });
      return NextResponse.json(mapCaseToClient(updated));
    }

    case "reassign": {
      const canAssign = hasApiPermission(session!, "assign_issues");
      const assignedDev = isAssignedDeveloper(existing, actorId);
      if (!canAssign && !assignedDev) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const reason = body.reason?.trim();
      if (!reason) {
        return NextResponse.json({ error: "السبب مطلوب" }, { status: 400 });
      }
      const rawTarget = body.developerId;
      if (!rawTarget) {
        return NextResponse.json({ error: "يجب اختيار مطور" }, { status: 400 });
      }
      const resolvedTarget = await resolveAssigneeId(String(rawTarget));
      if (!resolvedTarget) {
        return NextResponse.json({ error: "المطور غير موجود" }, { status: 400 });
      }
      if (assignedDev && !canAssign && resolvedTarget === actorId) {
        return NextResponse.json({ error: "لا يمكن إعادة الإسناد لنفسك" }, { status: 400 });
      }
      if (resolvedTarget === existing.assignedDeveloperId) {
        return NextResponse.json({ error: "الحالة مسندة لهذا الشخص مسبقاً" }, { status: 400 });
      }
      const result = await reassignCaseDeveloperDb(
        id,
        resolvedTarget,
        actorId,
        actorName,
        reason
      );
      if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await sendNotification({
        userId: result.newDeveloperId,
        title: "تم إسناد حالة إليك",
        message: `${result.updated.number} — ${reason.slice(0, 80)}`,
        type: "case_assigned",
        entityType: "Case",
        entityId: id,
        level: "info",
        actionRequired: true,
      });
      if (
        result.previousDeveloperId &&
        result.previousDeveloperId !== result.newDeveloperId
      ) {
        await sendNotification({
          userId: result.previousDeveloperId,
          title: "تم تحويل الحالة لشخص آخر",
          message: `${result.updated.number} — ${reason.slice(0, 80)}`,
          type: "case_assigned",
          entityType: "Case",
          entityId: id,
          level: "info",
        });
      }
      await logAudit({
        action: "ASSIGN",
        entityType: "Case",
        entityId: id,
        userId: actorId,
        details: canAssign && !assignedDev ? "admin_reassign" : "reassign",
      });
      return NextResponse.json(mapCaseToClient(result.updated));
    }

    case "return_to_admin": {
      if (!isAssignedDeveloper(existing, actorId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const reason = body.reason?.trim();
      if (!reason) {
        return NextResponse.json({ error: "السبب مطلوب" }, { status: 400 });
      }
      const updated = await returnCaseToSuperAdminDb(id, actorId, actorName, reason);
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await notifySuperAdmins({
        title: "إرجاع حالة من المطور",
        message: `${updated.number} — ${reason.slice(0, 80)}`,
        type: "case_returned",
        entityType: "Case",
        entityId: id,
        level: "warning",
        actionRequired: true,
      });
      await logAudit({
        action: "STATUS_CHANGE",
        entityType: "Case",
        entityId: id,
        userId: actorId,
        details: "return_to_admin",
      });
      return NextResponse.json(mapCaseToClient(updated));
    }

    case "add_attachment": {
      if (
        isDeveloperRole(session!.user.role) &&
        !isAssignedDeveloper(existing, actorId)
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const att = await addCaseAttachmentDb({
        caseId: id,
        name: body.name,
        type: body.type ?? "IMAGE",
        url: body.url ?? "/uploads/placeholder",
        size: body.size,
        uploadedBy: actorName,
      });
      return NextResponse.json({ id: att.id, name: att.name, url: att.url });
    }

    case "accept_case": {
      if (!hasApiPermission(session!, "classify_reports") && !hasApiPermission(session!, "manage_issues")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await acceptCaseDb(id, actorId, actorName);
      if (!updated) {
        return NextResponse.json({ error: "لا يمكن قبول هذه الحالة" }, { status: 400 });
      }
      await logAudit({ action: "APPROVE", entityType: "Case", entityId: id, userId: actorId, details: "accept_case" });
      return NextResponse.json(mapCaseToClient(updated));
    }

    case "classify_and_assign": {
      if (!hasApiPermission(session!, "classify_reports") && !hasApiPermission(session!, "manage_issues")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      try {
        const rawAssignee = body.assigneeId ?? body.developerId;
        const resolvedAssignee = rawAssignee
          ? await resolveAssigneeId(String(rawAssignee))
          : null;
        const result = await classifyAndAssignCaseDb(
          id,
          body.caseType as CaseType,
          actorId,
          actorName,
          resolvedAssignee ?? undefined,
          {
            assignedTeam: body.assignedTeam,
            priority: body.priority,
            severity: body.severity,
          }
        );
        if (!result) {
          return NextResponse.json({ error: "لا يمكن تصنيف هذه الحالة" }, { status: 400 });
        }
        if (result.assigneeId) {
          await sendNotification({
            userId: result.assigneeId,
            title: "تم إسناد حالة إليك",
            message: `${result.updated.number} — ${result.updated.title}`,
            type: "case_assigned",
            entityType: "Case",
            entityId: id,
            level: "info",
            actionRequired: true,
          });
        }
        await logAudit({ action: "ASSIGN", entityType: "Case", entityId: id, userId: actorId, details: "classify_and_assign" });
        return NextResponse.json(mapCaseToClient(result.updated));
      } catch (err) {
        const message = err instanceof Error ? err.message : "فشل التصنيف";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    case "accept_classify": {
      if (!hasApiPermission(session!, "classify_reports") && !hasApiPermission(session!, "manage_issues")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const result = await acceptAndClassifyCaseDb(
        id,
        body.caseType as CaseType,
        actorId,
        actorName,
        body.developerId
      );
      if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (result.developerId) {
        await sendNotification({
          userId: result.developerId,
          title: "تم تعيينك على خلل",
          message: `${result.updated.number} — ${result.updated.title}`,
          type: "case_assigned",
          entityType: "Case",
          entityId: id,
          level: "info",
          actionRequired: true,
        });
      }
      await logAudit({ action: "APPROVE", entityType: "Case", entityId: id, userId: actorId, details: "accept_classify" });
      return NextResponse.json(mapCaseToClient(result.updated));
    }

    case "review_problem": {
      if (!hasApiPermission(session!, "classify_reports") && !hasApiPermission(session!, "manage_issues")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const rawAssignee = body.developerId ?? body.assigneeId ?? body.assignedTeam;
      if (!rawAssignee) {
        return NextResponse.json({ error: "يجب اختيار المسؤول" }, { status: 400 });
      }
      const resolvedAssignee = await resolveAssigneeId(String(rawAssignee));
      if (!resolvedAssignee) {
        return NextResponse.json({ error: "المسؤول غير موجود — شغّل npm run db:seed" }, { status: 400 });
      }
      const result = await reviewCaseAsProblemDb(id, actorId, actorName, {
        assignedTeam: body.assignedTeam ?? "Developer",
        priority: body.priority,
        severity: body.severity,
        developerId: resolvedAssignee,
      });
      if (!result) return NextResponse.json({ error: "لا يمكن معالجة هذه الحالة" }, { status: 400 });
      if (resolvedAssignee) {
        await sendNotification({
          userId: resolvedAssignee,
          title: "تم إسناد مشكلة جديدة",
          message: `${result.updated.number} — ${result.updated.title}`,
          type: "case_assigned",
          entityType: "Case",
          entityId: id,
          level: "info",
          actionRequired: true,
        });
      }
      await logAudit({ action: "ASSIGN", entityType: "Case", entityId: id, userId: actorId, details: "review_problem" });
      return NextResponse.json(mapCaseToClient(result.updated));
    }

    case "review_not_problem": {
      if (!hasApiPermission(session!, "classify_reports") && !hasApiPermission(session!, "close_issues")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await reviewCaseNotProblemDb(
        id,
        actorId,
        actorName,
        body.classification ?? "USER_MISTAKE",
        body.reason ?? "ليست مشكلة"
      );
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (updated.createdById && updated.createdById !== actorId) {
        await sendNotification({
          userId: updated.createdById,
          title: "تم إغلاق حالتك",
          message: `${updated.number} — ليست مشكلة تقنية`,
          type: "case_closed",
          entityType: "Case",
          entityId: id,
          issueNumber: updated.number,
        });
      }
      await logAudit({ action: "CLOSE", entityType: "Case", entityId: id, userId: actorId, details: "review_not_problem" });
      return NextResponse.json(mapCaseToClient(updated));
    }

    case "dismiss_not_problem": {
      if (!hasApiPermission(session!, "classify_reports") && !hasApiPermission(session!, "close_issues")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await dismissNotAProblemDb(id, actorId, actorName, body.reason);
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (updated.createdById && updated.createdById !== actorId) {
        await sendNotification({
          userId: updated.createdById,
          title: "تم إغلاق حالتك",
          message: `${updated.number} — ${body.reason?.slice(0, 80) ?? "ليست مشكلة"}`,
          type: "case_closed",
          entityType: "Case",
          entityId: id,
          issueNumber: updated.number,
        });
      }
      await logAudit({ action: "CLOSE", entityType: "Case", entityId: id, userId: actorId, details: "not_a_problem" });
      return NextResponse.json(mapCaseToClient(updated));
    }

    case "coordinator_escalate_system_bug": {
      if (!hasApiPermission(session!, "review_reports")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await coordinatorEscalateSystemBugDb(
        id,
        actorId,
        actorName,
        body.note ?? body.reason
      );
      if (!updated) {
        return NextResponse.json({ error: "لا يمكن تصعيد هذه الحالة" }, { status: 400 });
      }
      await notifySuperAdmins({
        title: "System Bug — يحتاج مراجعتك",
        message: `${updated.number} — ${updated.title}`,
        type: "case_escalated",
        entityType: "Case",
        entityId: id,
        level: "warning",
        actionRequired: true,
      });
      if (updated.createdById && updated.createdById !== actorId) {
        await sendNotification({
          userId: updated.createdById,
          title: "تم تصعيد بلاغك",
          message: `${updated.number} — تم تصنيفه كـ System Bug وإرساله للسوبر أدمن`,
          type: "case_status",
          entityType: "Case",
          entityId: id,
          issueNumber: updated.number,
        });
      }
      await logAudit({
        action: "STATUS_CHANGE",
        entityType: "Case",
        entityId: id,
        userId: actorId,
        details: "coordinator_escalate_system_bug",
      });
      return NextResponse.json(mapCaseToClient(updated));
    }

    case "coordinator_dismiss_not_system": {
      if (
        !hasApiPermission(session!, "reject_reports") &&
        !hasApiPermission(session!, "review_reports")
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await coordinatorDismissNotSystemBugDb(
        id,
        actorId,
        actorName,
        body.classification,
        body.reason ?? body.note ?? "سبب خارج النظام"
      );
      if (!updated) {
        return NextResponse.json({ error: "لا يمكن إغلاق هذه الحالة" }, { status: 400 });
      }
      if (updated.createdById && updated.createdById !== actorId) {
        await sendNotification({
          userId: updated.createdById,
          title: "تم إغلاق بلاغك",
          message: `${updated.number} — ${(body.reason ?? body.note ?? "").slice(0, 80)}`,
          type: "case_closed",
          entityType: "Case",
          entityId: id,
          issueNumber: updated.number,
        });
      }
      await logAudit({
        action: "CLOSE",
        entityType: "Case",
        entityId: id,
        userId: actorId,
        details: "coordinator_dismiss_not_system",
      });
      return NextResponse.json(mapCaseToClient(updated));
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
