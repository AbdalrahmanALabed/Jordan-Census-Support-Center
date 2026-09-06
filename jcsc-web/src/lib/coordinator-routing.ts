import { prisma } from "@/lib/db";
import { isSuperAdminRole, isSupportCoordinatorRole } from "@/lib/permissions";

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

export function getCoordinatorEmailForGovernorate(governorate: string): string | null {
  return GOVERNORATE_TO_EMAIL.get(governorate.trim()) ?? null;
}

export function getGovernoratesForCoordinatorEmail(email: string): string[] {
  const entry = REGIONAL_COORDINATORS.find((c) => c.email === email);
  return entry ? [...entry.governorates] : [];
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

export function canViewRegionalCoordinatorUsers(role?: string | null): boolean {
  return isSuperAdminRole(role as import("@/lib/types").UserRole) || isSupportCoordinatorRole(role);
}

export async function isCaseAssignedToCoordinator(
  coordinatorId: string,
  caseItem: { assignedCoordinatorId?: string | null; governorate: string }
): Promise<boolean> {
  if (caseItem.assignedCoordinatorId) {
    return caseItem.assignedCoordinatorId === coordinatorId;
  }

  const coordinator = await prisma.user.findUnique({
    where: { id: coordinatorId },
    select: { email: true, role: true },
  });
  if (!coordinator || coordinator.role !== "SUPPORT_COORDINATOR") return false;

  const allowed = getGovernoratesForCoordinatorEmail(coordinator.email);
  return allowed.includes(caseItem.governorate);
}
