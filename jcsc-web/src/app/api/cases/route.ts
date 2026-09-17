import { NextRequest, NextResponse } from "next/server";
import type { CaseType, CaseStatus } from "@prisma/client";
import { requireSession, hasApiPermission } from "@/lib/api-auth";
import {
  isSuperAdminRole,
  isSupportSupervisorRole,
  isSupportCoordinatorRole,
} from "@/lib/permissions";
import { usesAssignedCoordinatorCaseScope } from "@/lib/coordinator-case-scope";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/server";
import {
  listCases,
  createCaseManual,
  mapCaseToClient,
  getAwaitingApprovalCasesDb,
} from "@/lib/cases/server";
import { censusSystemToLabel } from "@/lib/types";
import { resolveAssigneeId } from "@/lib/assignees/server";
import { filterItemsByFieldOpsVisibility } from "@/lib/field-ops-visibility";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  if (
    !hasApiPermission(session!, "view_issues") &&
    !hasApiPermission(session!, "review_reports") &&
    !hasApiPermission(session!, "view_own_reports")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const awaiting = req.nextUrl.searchParams.get("awaiting") === "true";
  const mineOnly = req.nextUrl.searchParams.get("mine") === "true";

  const canViewAll =
    hasApiPermission(session!, "view_issues") ||
    hasApiPermission(session!, "review_reports");
  const canViewOwn = hasApiPermission(session!, "view_own_reports");

  if (!canViewAll && !canViewOwn) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (awaiting) {
    const cases = await getAwaitingApprovalCasesDb();
    const visibleCases = filterItemsByFieldOpsVisibility(cases, session!.user.role);
    return NextResponse.json(visibleCases.map(mapCaseToClient));
  }

  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const caseType = (req.nextUrl.searchParams.get("caseType") ?? "ALL") as CaseType | "ALL";
  const status = (req.nextUrl.searchParams.get("status") ?? "ALL") as CaseStatus | "ALL";
  const simpleStatus = req.nextUrl.searchParams.get("simpleStatus") as
    | "NEW"
    | "IN_PROGRESS"
    | "SOLVED"
    | "CLOSED"
    | "ALL"
    | null;
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 0, 200) : undefined;

  const createdById =
    (!canViewAll && canViewOwn) || mineOnly ? session!.user.id : undefined;

  let supportSupervisorUserId: string | undefined;
  let assignedCoordinatorId: string | undefined;

  const mineOnlyRequest = Boolean(createdById);

  if (isSupportSupervisorRole(session!.user.role) && !mineOnlyRequest) {
    supportSupervisorUserId = session!.user.id;
  }

  if (
    !mineOnlyRequest &&
    usesAssignedCoordinatorCaseScope(session!.user.role) &&
    !isSuperAdminRole(session!.user.role as import("@prisma/client").UserRole)
  ) {
    assignedCoordinatorId = session!.user.id;
  }

  const cases = await listCases({
    search,
    caseType,
    status,
    simpleStatus: simpleStatus && simpleStatus !== "ALL" ? simpleStatus : undefined,
    createdById: supportSupervisorUserId ? undefined : createdById,
    supportSupervisorUserId,
    assignedCoordinatorId,
    limit: limit && limit > 0 ? limit : undefined,
    role: session!.user.role,
  });

  const visibleCases = filterItemsByFieldOpsVisibility(cases, session!.user.role, {
    viewerId: session!.user.id,
    includeOwnSubmissions: Boolean(createdById),
  });

  return NextResponse.json(visibleCases.map(mapCaseToClient));
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const canManage =
    hasApiPermission(session!, "convert_to_issue") ||
    hasApiPermission(session!, "manage_issues") ||
    isSuperAdminRole(session!.user.role as import("@prisma/client").UserRole);
  const canSubmit = hasApiPermission(session!, "submit_report");

  if (!canManage && !canSubmit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    description,
    severity = "MEDIUM",
    affectedSystem,
  } = body;
  let {
    caseType = "QUESTION",
    priority = "MEDIUM",
    governorate,
    affectedUsers,
    assignedTeam,
    developerId,
  } = body;

  if (!description?.trim() || !affectedSystem) {
    return NextResponse.json({ error: "الوصف والنظام مطلوبان" }, { status: 400 });
  }

  // الدعم الفني المراكز: حقول محدودة فقط — بانتظار تصنيف منسق الدعم
  if (!canManage && canSubmit) {
    caseType = "QUESTION";
    priority = "MEDIUM";
    developerId = undefined;
    assignedTeam = undefined;

    if (!governorate?.trim()) {
      return NextResponse.json({ error: "المحافظة مطلوبة" }, { status: 400 });
    }
    const users = Number(affectedUsers);
    if (!Number.isFinite(users) || users < 1) {
      return NextResponse.json({ error: "عدد المتأثرين مطلوب" }, { status: 400 });
    }
    affectedUsers = users;
    governorate = governorate.trim();
  }

  // السوبر أدمن: يُصنّف تلقائياً كـ BUG
  if (isSuperAdminRole(session!.user.role as import("@prisma/client").UserRole)) {
    caseType = "BUG";
  }

  const systemLabel = censusSystemToLabel(affectedSystem);

  if (developerId) {
    developerId = (await resolveAssigneeId(developerId)) ?? undefined;
  }

  const actor = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { id: true, isActive: true },
  });
  if (!actor?.isActive) {
    return NextResponse.json(
      { error: "انتهت الجلسة — سجّل الدخول مجدداً" },
      { status: 401 }
    );
  }

  try {
    const created = await createCaseManual({
      description: description.trim(),
      caseType: caseType as CaseType,
      priority,
      severity,
      governorate: governorate?.trim() || undefined,
      affectedSystem: systemLabel,
      affectedUsers,
      createdById: actor.id,
      assignedTeam,
      developerId,
    });

    if (created.assignedDeveloperId) {
      await sendNotification({
        userId: created.assignedDeveloperId,
        title: "تم تعيينك على حالة جديدة",
        message: `${created.number} — ${created.title}`,
        type: "case_assigned",
        entityType: "Case",
        entityId: created.id,
        level: "info",
        actionRequired: true,
      });
    }

    await logAudit({
      action: "CREATE",
      entityType: "Case",
      entityId: created.id,
      userId: actor.id,
      details: JSON.stringify({ number: created.number, caseType }),
    });

    return NextResponse.json(mapCaseToClient(created), { status: 201 });
  } catch (err) {
    console.error("POST /api/cases", err);
    return NextResponse.json({ error: "فشل إنشاء الحالة" }, { status: 500 });
  }
}
