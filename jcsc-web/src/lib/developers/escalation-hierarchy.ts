import type { PrismaClient } from "@prisma/client";

/** مطورون — التصعيد إلى محمود مطاوع */
export const DEVELOPER_TEAM_A_EMAILS = [
  "ahmad.m@jcsc.gov.jo",
  "mais@jcsc.gov.jo",
  "abdullah.m@jcsc.gov.jo",
  "mohammad.h@jcsc.gov.jo",
  "mustafa@jcsc.gov.jo",
  "mohammad.ab@jcsc.gov.jo",
  "abdelrahman@jcsc.gov.jo",
] as const;

export const TEAM_A_MANAGER_EMAIL = "mahmoud@jcsc.gov.jo";
export const TEAM_B_MANAGER_EMAIL = "ahmad.ay@jcsc.gov.jo";

export const AHMED_AY_PROFILE = {
  name: "احمد اي",
  email: TEAM_B_MANAGER_EMAIL,
  team: "مدير فريق",
  governorate: "عمان",
};

const TEAM_A_SET = new Set<string>(DEVELOPER_TEAM_A_EMAILS);
const LEAD_EMAILS = new Set<string>([
  TEAM_A_MANAGER_EMAIL,
  TEAM_B_MANAGER_EMAIL,
]);

/** يربط directManagerId حسب مجموعات التصعيد */
export async function applyDeveloperEscalationHierarchy(
  prisma: PrismaClient,
  emailToId: Record<string, string>
) {
  const mahmoudId = emailToId[TEAM_A_MANAGER_EMAIL];
  const ahmedAyId = emailToId[TEAM_B_MANAGER_EMAIL];
  const adminId = emailToId["admin@jcsc.gov.jo"];

  if (!mahmoudId) {
    throw new Error(`مدير المجموعة الأولى غير موجود: ${TEAM_A_MANAGER_EMAIL}`);
  }
  if (!ahmedAyId) {
    throw new Error(`مدير المجموعة الثانية غير موجود: ${TEAM_B_MANAGER_EMAIL}`);
  }

  for (const email of DEVELOPER_TEAM_A_EMAILS) {
    const devId = emailToId[email];
    if (!devId) continue;
    await prisma.user.update({
      where: { id: devId },
      data: { directManagerId: mahmoudId },
    });
  }

  const developers = await prisma.user.findMany({
    where: { role: "DEVELOPER", isActive: true },
    select: { id: true, email: true },
  });

  for (const dev of developers) {
    if (TEAM_A_SET.has(dev.email) || LEAD_EMAILS.has(dev.email)) continue;
    await prisma.user.update({
      where: { id: dev.id },
      data: { directManagerId: ahmedAyId },
    });
  }

  if (adminId) {
    await prisma.user.updateMany({
      where: { email: { in: [TEAM_A_MANAGER_EMAIL, TEAM_B_MANAGER_EMAIL] } },
      data: { directManagerId: adminId },
    });
  }
}

export function escalationManagerLabel(developerEmail: string): string {
  if (TEAM_A_SET.has(developerEmail)) return "محمود مطاوع";
  return "احمد اي";
}
