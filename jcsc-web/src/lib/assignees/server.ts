import { prisma } from "@/lib/db";
import { sortAssigneesByName } from "@/lib/assignees";
import { isTechnicalAssigneeRole } from "@/lib/developer-specialties";

export type AssigneeOption = {
  id: string;
  name: string;
  email: string;
  team?: string | null;
};

/** كل المستخدمين القابلين للإسناد — من قاعدة البيانات (بدون قائمة أسماء ثابتة) */
export async function listAssigneeOptions(): Promise<AssigneeOption[]> {
  const assignees = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, team: true, role: true },
    orderBy: { name: "asc" },
  });

  return sortAssigneesByName(
    assignees
      .filter((u) => isTechnicalAssigneeRole(u.role))
      .map(({ id, name, email, team }) => ({ id, name, email, team }))
  );
}

/** يحوّل id أو اسم أو بريد إلى user id */
export async function resolveAssigneeId(assigneeRef: string): Promise<string | null> {
  const ref = assigneeRef?.trim();
  if (!ref) return null;

  const byId = await prisma.user.findUnique({
    where: { id: ref },
    select: { id: true, role: true, isActive: true },
  });
  if (byId?.isActive && isTechnicalAssigneeRole(byId.role)) return byId.id;

  const byEmail = await prisma.user.findFirst({
    where: { email: ref, isActive: true },
    select: { id: true, role: true },
  });
  if (byEmail && isTechnicalAssigneeRole(byEmail.role)) return byEmail.id;

  const byName = await prisma.user.findFirst({
    where: { name: ref, isActive: true },
    select: { id: true, role: true },
  });
  if (byName && isTechnicalAssigneeRole(byName.role)) return byName.id;

  return null;
}
