import { prisma } from "@/lib/db";
import { ASSIGNEE_NAMES, ASSIGNEE_SEED_USERS, type AssigneeName } from "@/lib/assignees";

export type AssigneeOption = {
  id: string | null;
  name: AssigneeName;
  email: string;
};

/** كل الأسماء المعتمدة — مع ربط id من قاعدة البيانات إن وُجد */
export async function listAssigneeOptions(): Promise<AssigneeOption[]> {
  const developers = await prisma.user.findMany({
    where: { role: "DEVELOPER", isActive: true },
    select: { id: true, name: true, email: true },
  });

  return ASSIGNEE_NAMES.map((name) => {
    const seed = ASSIGNEE_SEED_USERS.find((s) => s.name === name)!;
    const match =
      developers.find((d) => d.name === name) ??
      developers.find((d) => d.email === seed.email);
    return {
      id: match?.id ?? null,
      name,
      email: seed.email,
    };
  });
}

/** يحوّل id أو اسم أو بريد إلى user id */
export async function resolveAssigneeId(assigneeRef: string): Promise<string | null> {
  const ref = assigneeRef?.trim();
  if (!ref) return null;

  const byId = await prisma.user.findUnique({ where: { id: ref }, select: { id: true } });
  if (byId) return byId.id;

  const byName = await prisma.user.findFirst({
    where: { name: ref, role: "DEVELOPER" },
    select: { id: true },
  });
  if (byName) return byName.id;

  const seed = ASSIGNEE_SEED_USERS.find((s) => s.name === ref || s.email === ref);
  if (seed) {
    const byEmail = await prisma.user.findUnique({
      where: { email: seed.email },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }

  return null;
}
