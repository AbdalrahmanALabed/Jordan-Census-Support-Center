/**
 * إنشاء/تحديث المستخدمين الرسميين — لا يحذف أي حساب موجود.
 * Run: npx tsx scripts/setup-production-users.ts
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { OFFICIAL_USERS } from "../prisma/official-users";
import { getProductionPassword } from "../prisma/production-passwords";
import { REGIONAL_COORDINATORS } from "../src/lib/coordinator-routing";
import { applyDeveloperEscalationHierarchy } from "../src/lib/developers/escalation-hierarchy";

const prisma = new PrismaClient();

async function main() {
  const createdUsers: Record<string, string> = {};
  let created = 0;
  let updated = 0;

  for (const u of OFFICIAL_USERS) {
    const plainPassword = getProductionPassword(u.email);
    if (!plainPassword) {
      console.warn(`⚠ No password in production-passwords.ts for ${u.email} — skipped`);
      continue;
    }
    const passwordHash = await hash(plainPassword, 10);
    const existing = await prisma.user.findUnique({ where: { email: u.email } });

    const user = await prisma.user.upsert({
      where: { email: u.email },
      create: {
        ...u,
        password: passwordHash,
        phone: "+962790000000",
        shift: "صباحي",
        specialtyTags: "[]",
        isActive: true,
      },
      update: {
        name: u.name,
        role: u.role,
        team: u.team,
        governorate: u.governorate,
        password: passwordHash,
        isActive: true,
      },
    });

    createdUsers[u.email] = user.id;
    if (existing) updated++;
    else created++;
  }

  const adminId = createdUsers["admin@jcsc.gov.jo"];
  const supportSupervisorId = createdUsers["support-supervisor@jcsc.gov.jo"];
  const supervisorId = createdUsers["supervisor@jcsc.gov.jo"];
  const supervisorAqabaId = createdUsers["supervisor.aqaba@jcsc.gov.jo"];

  if (supportSupervisorId && adminId) {
    await prisma.user.update({
      where: { id: supportSupervisorId },
      data: { directManagerId: adminId },
    });
  }

  for (const coord of REGIONAL_COORDINATORS) {
    const id = createdUsers[coord.email];
    if (id && adminId) {
      await prisma.user.update({
        where: { id },
        data: { directManagerId: adminId },
      });
    }
  }

  if (supervisorId && supportSupervisorId) {
    await prisma.user.update({
      where: { id: supervisorId },
      data: { directManagerId: supportSupervisorId },
    });
  }

  if (supervisorAqabaId && supportSupervisorId) {
    await prisma.user.update({
      where: { id: supervisorAqabaId },
      data: { directManagerId: supportSupervisorId },
    });
  }

  await applyDeveloperEscalationHierarchy(prisma, createdUsers);

  console.log(`✓ Official users — created: ${created}, updated: ${updated}, total: ${OFFICIAL_USERS.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
