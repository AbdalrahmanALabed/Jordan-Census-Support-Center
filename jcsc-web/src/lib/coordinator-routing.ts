import { prisma } from "@/lib/db";
import {
  isSuperAdminRole,
  isSupportCoordinatorRole,
  isFieldOperationsCoordinatorRole,
  isResearcherFieldCoordinatorRole,
} from "@/lib/permissions";

/** منسق إدارة العمل الميداني — بلاغات نظام FIELD_OPERATIONS */
export const FIELD_OPERATIONS_COORDINATOR = {
  name: "منسق إدارة العمل الميداني",
  email: "fieldops.coord@jcsc.gov.jo",
} as const;

/** مشرف الدعم الفني — بلاغات نظام الباحث فنية (FIELD) بغض النظر عن المحافظة */
export const RESEARCHER_FIELD_COORDINATOR = {
  name: "مشرف الدعم الفني",
  email: "sanaa@jcsc.gov.jo",
} as const;

export const RESEARCHER_SYSTEM_VALUES = [
  "RESEARCHER_SYSTEM",
  "نظام الباحث",
  "researcher_system",
] as const;

/** منسقو الدعم الإقليميون — توجيه البلاغات حسب المحافظة */
export const REGIONAL_COORDINATORS = [
  {
    name: "رزان محفوظ",
    email: "razan.m@jcsc.gov.jo",
    governorates: ["عمان"] as const,
  },
  {
    name: "شذى عيسى",
    email: "shatha.a@jcsc.gov.jo",
    governorates: ["البلقاء", "الزرقاء"] as const,
  },
  {
    name: "زينة التل",
    email: "zina.t@jcsc.gov.jo",
    governorates: ["مادبا"] as const,
  },
  {
    name: "منال خفش",
    email: "manal.k@jcsc.gov.jo",
    governorates: ["إربد"] as const,
  },
  {
    name: "سائدة",
    email: "saida@jcsc.gov.jo",
    governorates: ["جرش"] as const,
  },
  {
    name: "امان حجة",
    email: "aman.h@jcsc.gov.jo",
    governorates: ["عجلون", "المفرق"] as const,
  },
  {
    name: "سوسن",
    email: "sawsan@jcsc.gov.jo",
    governorates: ["العقبة", "معان", "الكرك", "الطفيلة"] as const,
  },
] as const;

const GOVERNORATE_TO_EMAIL = new Map<string, string>();
for (const coord of REGIONAL_COORDINATORS) {
  for (const gov of coord.governorates) {
    GOVERNORATE_TO_EMAIL.set(gov, coord.email);
  }
}

export function isFieldOperationsAffectedSystem(affectedSystem?: string | null): boolean {
  if (!affectedSystem?.trim()) return false;
  const value = affectedSystem.trim();
  return (
    value === "FIELD_OPERATIONS" ||
    value === "إدارة العمل الميداني" ||
    value.toLowerCase() === "field_operations"
  );
}

export function isResearcherAffectedSystem(affectedSystem?: string | null): boolean {
  if (!affectedSystem?.trim()) return false;
  const value = affectedSystem.trim();
  return (
    RESEARCHER_SYSTEM_VALUES.includes(value as (typeof RESEARCHER_SYSTEM_VALUES)[number]) ||
    value.toLowerCase() === "researcher_system"
  );
}

export function isResearcherFieldIssue(item: {
  affectedSystem?: string | null;
  researcherIssueType?: string | null;
}): boolean {
  return (
    isResearcherAffectedSystem(item.affectedSystem) &&
    item.researcherIssueType === "FIELD"
  );
}

export function getCoordinatorEmailForGovernorate(governorate: string): string | null {
  return GOVERNORATE_TO_EMAIL.get(governorate.trim()) ?? null;
}

export function getGovernoratesForCoordinatorEmail(email: string): string[] {
  if (email === FIELD_OPERATIONS_COORDINATOR.email) return [];
  const entry = REGIONAL_COORDINATORS.find((c) => c.email === email);
  return entry ? [...entry.governorates] : [];
}

export async function resolveFieldOperationsCoordinator() {
  const user = await prisma.user.findFirst({
    where: {
      email: FIELD_OPERATIONS_COORDINATOR.email,
      role: "FIELD_OPERATIONS_COORDINATOR",
      isActive: true,
    },
    select: { id: true, name: true, email: true },
  });
  return user;
}

export async function resolveResearcherFieldCoordinator() {
  const user = await prisma.user.findFirst({
    where: {
      email: RESEARCHER_FIELD_COORDINATOR.email,
      role: "RESEARCHER_FIELD_COORDINATOR",
      isActive: true,
    },
    select: { id: true, name: true, email: true },
  });
  return user;
}

export async function resolveCoordinatorForGovernorate(governorate: string) {
  const email = getCoordinatorEmailForGovernorate(governorate);
  if (!email) return null;

  const user = await prisma.user.findFirst({
    where: { email, role: "SUPPORT_COORDINATOR", isActive: true },
    select: { id: true, name: true, email: true },
  });
  return user;
}

/** توجيه البلاغ: FOM → منسقها، باحث+فني → مشرف الدعم الفني، باحث+تقني → منسق المحافظة، غير ذلك → منسق المحافظة */
export async function resolveCoordinatorForReport(
  governorate: string,
  affectedSystem?: string | null,
  researcherIssueType?: string | null
) {
  if (isFieldOperationsAffectedSystem(affectedSystem)) {
    return resolveFieldOperationsCoordinator();
  }
  if (isResearcherAffectedSystem(affectedSystem) && researcherIssueType === "FIELD") {
    return resolveResearcherFieldCoordinator();
  }
  return resolveCoordinatorForGovernorate(governorate);
}

export function canViewRegionalCoordinatorUsers(role?: string | null): boolean {
  return (
    isSuperAdminRole(role as import("@/lib/types").UserRole) ||
    isSupportCoordinatorRole(role) ||
    isFieldOperationsCoordinatorRole(role) ||
    isResearcherFieldCoordinatorRole(role)
  );
}

export async function isCaseAssignedToCoordinator(
  coordinatorId: string,
  caseItem: {
    assignedCoordinatorId?: string | null;
    governorate: string;
    affectedSystem?: string | null;
    researcherIssueType?: string | null;
  }
): Promise<boolean> {
  const coordinator = await prisma.user.findUnique({
    where: { id: coordinatorId },
    select: { email: true, role: true },
  });
  if (!coordinator) return false;

  const isFieldOps = isFieldOperationsAffectedSystem(caseItem.affectedSystem);
  const isResearcherField = isResearcherFieldIssue(caseItem);

  if (coordinator.role === "FIELD_OPERATIONS_COORDINATOR") {
    if (!isFieldOps) return false;
    if (caseItem.assignedCoordinatorId) {
      return caseItem.assignedCoordinatorId === coordinatorId;
    }
    return true;
  }

  if (coordinator.role === "RESEARCHER_FIELD_COORDINATOR") {
    if (!isResearcherField) return false;
    if (caseItem.assignedCoordinatorId) {
      return caseItem.assignedCoordinatorId === coordinatorId;
    }
    return true;
  }

  if (isFieldOps || isResearcherField) return false;

  if (caseItem.assignedCoordinatorId) {
    return caseItem.assignedCoordinatorId === coordinatorId;
  }

  if (coordinator.role !== "SUPPORT_COORDINATOR") return false;

  const allowed = getGovernoratesForCoordinatorEmail(coordinator.email);
  return allowed.includes(caseItem.governorate);
}
