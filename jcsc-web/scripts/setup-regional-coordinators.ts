/**
 * إنشاء/تحديث منسقي الدعم الإقليميين + توجيه الحالات المفتوحة حسب المحافظة
 * Run: npx tsx scripts/setup-regional-coordinators.ts
 */
import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { REGIONAL_COORDINATORS, getCoordinatorEmailForGovernorate } from "../src/lib/coordinator-routing";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("jcsc2026", 10);
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });

  for (const coord of REGIONAL_COORDINATORS) {
    const primaryGov = coord.governorates[0];
    await prisma.user.upsert({
      where: { email: coord.email },
      create: {
        name: coord.name,
        email: coord.email,
        password: passwordHash,
        role: UserRole.SUPPORT_COORDINATOR,
        team: "منسق الدعم",
        governorate: primaryGov,
        phone: "+962790000000",
        shift: "صباحي",
        specialtyTags: "[]",
        directManagerId: admin?.id ?? null,
      },
      update: {
        name: coord.name,
        role: UserRole.SUPPORT_COORDINATOR,
        governorate: primaryGov,
        isActive: true,
      },
    });
    console.log(`✓ ${coord.name} (${coord.email}) — ${coord.governorates.join("، ")}`);
  }

  const legacy = await prisma.user.findUnique({ where: { email: "coordinator@jcsc.gov.jo" } });
  if (legacy) {
    await prisma.user.update({
      where: { id: legacy.id },
      data: { isActive: false },
    });
    console.log("✓ تم تعطيل منسق الدعم التجريبي القديم (coordinator@jcsc.gov.jo)");
  }

  const openCases = await prisma.case.findMany({
    where: { status: "OPEN", assignedCoordinatorId: null },
    select: { id: true, governorate: true },
  });

  let routed = 0;
  for (const c of openCases) {
    const email = getCoordinatorEmailForGovernorate(c.governorate);
    if (!email) continue;
    const coordinator = await prisma.user.findFirst({
      where: { email, role: "SUPPORT_COORDINATOR", isActive: true },
    });
    if (!coordinator) continue;
    await prisma.case.update({
      where: { id: c.id },
      data: { assignedCoordinatorId: coordinator.id },
    });
    routed++;
  }

  console.log(`✓ تم توجيه ${routed} حالة مفتوحة للمنسقين`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
