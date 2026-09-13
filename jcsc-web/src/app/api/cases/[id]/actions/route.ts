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
  transferCaseCoordinatorDb,
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
import { isDeveloperRole, isSupportCoordinatorRole, isSuperAdminRole } from "@/lib/permissions";
import { isCaseAssignedToCoordinator } from "@/lib/coordinator-routing";
import {
  canUserReceiveCoordinatorCase,
  isLeadTransferRole,
} from "@/lib/coordinator-transfer";
import { canViewItemByFieldOpsRules } from "@/lib/field-ops-visibility";
import {
  CASE_TRIAGE_ACTIONS,
  releaseCaseLock,
  requireCaseProcessingLock,
} from "@/lib/cases/processing-lock";

const COORDINATOR_ALLOWED_ACTIONS = new Set([
  "coordinator_escalate_system_bug",
  "coordinator_dismiss_not_system",
  "transfer_coordinator",
]);

/** Coordinators may comment on any case they can view */
const COORDINATOR_UNRESTRICTED_ACTIONS = new Set(["comment"]);

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
  const lockToken = body.lockToken as string | undefined;
  const actorId = session!.user.id;
  const actorName = session!.user.name ?? "مستخدم";

  if (CASE_TRIAGE_ACTIONS.has(action)) {
    const lockCheck = await requireCaseProcessingLock(id, lockToken);
    if (!lockCheck.ok) {
      return NextResponse.json({ error: lockCheck.message }, { status: 409 });
    }
  }

  const releaseLock = async () => {
    if (lockToken) await releaseCaseLock(id, lockToken);
  };

  const triageAlreadyHandled = () =>
    NextResponse.json(
      { error: "تمت معالجة هذا البلاغ من جلسة أخرى — حدّث الصفحة" },
      { status: 409 }
    );

  const existing = await getCaseById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    isSupportCoordinatorRole(session!.user.role) &&
    !isSuperAdminRole(session!.user.role as import("@prisma/client").UserRole) &&
    action !== "transfer_coordinator" &&
    !COORDINATOR_UNRESTRICTED_ACTIONS.has(action)
  ) {
    const allowed = await isCaseAssignedToCoordinator(actorId, {
      assignedCoordinatorId: existing.assignedCoordinatorId,
      governorate: existing.governorate,
      affectedSystem: existing.affectedSystem,
      researcherIssueType: existing.researcherIssueType,
    });
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (
    isSupportCoordinatorRole(session!.user.role) &&
    !COORDINATOR_ALLOWED_ACTIONS.has(action) &&
    !COORDINATOR_UNRESTRICTED_ACTIONS.has(action)
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
      if (!updated) return triageAlreadyHandled();
      await logAudit({ action: "EDIT", entityType: "Case", entityId: id, userId: actorId, details: `classify:${body.caseType}` });
      await releaseLock();
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
      const content = String(body.content ?? "").trim();
      if (!content) {
        return NextResponse.json({ error: "نص التعليق مطلوب" }, { status: 400 });
      }
      const comment = await addCaseCommentDb({
        caseId: id,
        content,
        authorId: actorId,
        isInternal: false,
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

    case "transfer_coordinator": {
      if (!isLeadTransferRole(session!.user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (existing.status !== "OPEN") {
        return NextResponse.json(
          { error: "التحويل متاح فقط للحالات بانتظار التصنيف" },
          { status: 400 }
        );
      }
      if (
        !canViewItemByFieldOpsRules(
          {
            affectedSystem: existing.affectedSystem,
            researcherIssueType: existing.researcherIssueType,
          },
          session!.user.role
        )
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const coordinatorId = body.coordinatorId?.trim();
      const reason = body.reason?.trim();
      if (!coordinatorId) {
        return NextResponse.json({ error: "يجب اختيار منسق/مشرف" }, { status: 400 });
      }
      if (!reason) {
        return NextResponse.json({ error: "سبب التحويل مطلوب" }, { status: 400 });
      }
      if (coordinatorId === actorId) {
        return NextResponse.json({ error: "لا يمكن التحويل لنفسك" }, { status: 400 });
      }
      if (coordinatorId === existing.assignedCoordinatorId) {
        return NextResponse.json({ error: "الحالة مسندة لهذا الشخص مسبقاً" }, { status: 400 });
      }

      const canReceive = await canUserReceiveCoordinatorCase(coordinatorId, {
        governorate: existing.governorate,
        affectedSystem: existing.affectedSystem,
        researcherIssueType: existing.researcherIssueType,
        assignedCoordinatorId: existing.assignedCoordinatorId,
        status: existing.status,
      });
      if (!canReceive) {
        return NextResponse.json(
          { error: "لا يمكن تحويل الحالة لهذا المستخدم" },
          { status: 400 }
        );
      }

      const result = await transferCaseCoordinatorDb(
        id,
        coordinatorId,
        actorId,
        actorName,
        reason
      );
      if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

      await sendNotification({
        userId: result.newCoordinatorId,
        title: "تم تحويل حالة إليك",
        message: `${result.updated.number} — ${reason.slice(0, 80)}`,
        type: "case_assigned",
        entityType: "Case",
        entityId: id,
        level: "warning",
        actionRequired: true,
      });
      if (
        result.previousCoordinatorId &&
        result.previousCoordinatorId !== result.newCoordinatorId
      ) {
        await sendNotification({
          userId: result.previousCoordinatorId,
          title: "تم تحويل الحالة لمنسق/مشرف آخر",
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
        details: "coordinator_transfer",
      });
      await releaseLock();
      return NextResponse.json(mapCaseToClient(result.updated));
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
      if (!body.url || String(body.url).includes("placeholder")) {
        return NextResponse.json({ error: "رابط المرفق غير صالح" }, { status: 400 });
      }
      const att = await addCaseAttachmentDb({
        caseId: id,
        name: body.name,
        type: body.type ?? "IMAGE",
        url: body.url,
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
          return triageAlreadyHandled();
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
        await releaseLock();
        return NextResponse.json(mapCaseToClient(result.updated));
      } catch (err) {
        const message = err instanceof Error ? err.message : "فشل التصنيف";
        return NextResponse.json({ error: message }, { status: 400 });
      }
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
          return triageAlreadyHandled();
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
        await releaseLock();
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
      if (!result) return triageAlreadyHandled();
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
      await releaseLock();
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
        return NextResponse.json({ error: "المسؤول غير موجود أو غير نشط — تأكد من دور مطوّr" }, { status: 400 });
      }
      const result = await reviewCaseAsProblemDb(id, actorId, actorName, {
        assignedTeam: body.assignedTeam ?? "Developer",
        priority: body.priority,
        severity: body.severity,
        developerId: resolvedAssignee,
      });
      if (!result) return triageAlreadyHandled();
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
      await releaseLock();
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
      if (!updated) return triageAlreadyHandled();
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
      await releaseLock();
      return NextResponse.json(mapCaseToClient(updated));
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
        return NextResponse.json({ error: "المسؤول غير موجود أو غير نشط — تأكد من دور مطوّr" }, { status: 400 });
      }
      const result = await reviewCaseAsProblemDb(id, actorId, actorName, {
        assignedTeam: body.assignedTeam ?? "Developer",
        priority: body.priority,
        severity: body.severity,
        developerId: resolvedAssignee,
      });
      if (!result) return triageAlreadyHandled();
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
      await releaseLock();
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
      if (!updated) return triageAlreadyHandled();
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
      await releaseLock();
      return NextResponse.json(mapCaseToClient(updated));
    }

    case "dismiss_not_problem": {
      if (!hasApiPermission(session!, "classify_reports") && !hasApiPermission(session!, "close_issues")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await dismissNotAProblemDb(id, actorId, actorName, body.reason);
      if (!updated) return triageAlreadyHandled();
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
      await releaseLock();
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
        return triageAlreadyHandled();
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
      await releaseLock();
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
        return triageAlreadyHandled();
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
      await releaseLock();
      return NextResponse.json(mapCaseToClient(updated));
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
