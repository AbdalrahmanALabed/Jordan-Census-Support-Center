/**
 * Adds SUPPORT_SUPERVISOR role permissions + demo user to an existing DB.
 * Run: npx tsx scripts/setup-support-supervisor.ts
 */
import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const PERM_KEYS = [
  "view_dashboard",
  "view_issues",
  "manage_users",
  "assign_user_permissions",
];

async function main() {
  const permByKey: Record<string, string> = {};
  for (const key of PERM_KEYS) {
    const p = await prisma.permission.upsert({
      where: { key },
      create: {
        key,
        label: key,
        screen: "users",
        action: "assign",
      },
      update: {},
    });
    permByKey[key] = p.id;
  }

  for (const key of PERM_KEYS) {
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: UserRole.SUPPORT_SUPERVISOR,
          permissionId: permByKey[key],
        },
      },
      create: {
        role: UserRole.SUPPORT_SUPERVISOR,
        permissionId: permByKey[key],
        granted: true,
      },
      update: { granted: true },
    });
  }

  const passwordHash = await hash("jcsc2026", 10);
  const admin = await prisma.user.findUnique({ where: { email: "admin@jcsc.gov.jo" } });

  const supervisor = await prisma.user.upsert({
    where: { email: "support-supervisor@jcsc.gov.jo" },
    create: {
      name: "مشرف الدعم",
      email: "support-supervisor@jcsc.gov.jo",
      role: UserRole.SUPPORT_SUPERVISOR,
      team: "الدعم",
      governorate: "عمان",
      password: passwordHash,
      directManagerId: admin?.id ?? null,
    },
    update: {
      name: "مشرف الدعم",
      role: UserRole.SUPPORT_SUPERVISOR,
      directManagerId: admin?.id ?? null,
    },
  });

  const coordinator = await prisma.user.findUnique({
    where: { email: "coordinator@jcsc.gov.jo" },
  });
  if (coordinator) {
    await prisma.user.update({
      where: { id: coordinator.id },
      data: { directManagerId: supervisor.id },
    });
  }

  for (const email of ["supervisor@jcsc.gov.jo", "supervisor.aqaba@jcsc.gov.jo"]) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (u) {
      await prisma.user.update({
        where: { id: u.id },
        data: { directManagerId: supervisor.id },
      });
    }
  }

  console.log("✓ SUPPORT_SUPERVISOR ready — support-supervisor@jcsc.gov.jo / jcsc2026");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
