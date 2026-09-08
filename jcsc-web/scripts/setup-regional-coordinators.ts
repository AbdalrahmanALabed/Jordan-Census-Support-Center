/**
 * إنشاء/تحديث منسقي الدعم الإقليميين + منسق إدارة العمل الميداني
 * Run: npx tsx scripts/setup-regional-coordinators.ts
 */
import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import {
  REGIONAL_COORDINATORS,
  FIELD_OPERATIONS_COORDINATOR,
  RESEARCHER_FIELD_COORDINATOR,
  getCoordinatorEmailForGovernorate,
  isFieldOperationsAffectedSystem,
  isResearcherFieldIssue,
  resolveResearcherFieldCoordinator,
} from "../src/lib/coordinator-routing";

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

  await prisma.user.upsert({
    where: { email: FIELD_OPERATIONS_COORDINATOR.email },
    create: {
      name: FIELD_OPERATIONS_COORDINATOR.name,
      email: FIELD_OPERATIONS_COORDINATOR.email,
      password: passwordHash,
      role: UserRole.FIELD_OPERATIONS_COORDINATOR,
      team: "منسق إدارة العمل الميداني",
      governorate: "عمان",
      phone: "+962790000000",
      shift: "صباحي",
      specialtyTags: "[]",
      directManagerId: admin?.id ?? null,
    },
    update: {
      name: FIELD_OPERATIONS_COORDINATOR.name,
      role: UserRole.FIELD_OPERATIONS_COORDINATOR,
      team: "منسق إدارة العمل الميداني",
      isActive: true,
    },
  });
  console.log(`✓ ${FIELD_OPERATIONS_COORDINATOR.name} (${FIELD_OPERATIONS_COORDINATOR.email})`);

  await prisma.user.upsert({
    where: { email: RESEARCHER_FIELD_COORDINATOR.email },
    create: {
      name: RESEARCHER_FIELD_COORDINATOR.name,
      email: RESEARCHER_FIELD_COORDINATOR.email,
      password: passwordHash,
      role: UserRole.RESEARCHER_FIELD_COORDINATOR,
      team: "مشرف الدعم الفني",
      governorate: "عمان",
      phone: "+962790000000",
      shift: "صباحي",
      specialtyTags: "[]",
      directManagerId: admin?.id ?? null,
    },
    update: {
      name: RESEARCHER_FIELD_COORDINATOR.name,
      role: UserRole.RESEARCHER_FIELD_COORDINATOR,
      team: "مشرف الدعم الفني",
      isActive: true,
    },
  });
  console.log(`✓ ${RESEARCHER_FIELD_COORDINATOR.name} (${RESEARCHER_FIELD_COORDINATOR.email})`);

  const researcherFieldPerms = [
    "view_dashboard",
    "submit_report",
    "view_own_reports",
    "review_reports",
    "reject_reports",
    "view_issues",
    "close_issues",
    "manage_users",
  ];
  const allPerms = await prisma.permission.findMany();
  const permByKey = Object.fromEntries(allPerms.map((p) => [p.key, p.id]));
  for (const key of researcherFieldPerms) {
    const permissionId = permByKey[key];
    if (!permissionId) continue;
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: UserRole.RESEARCHER_FIELD_COORDINATOR,
          permissionId,
        },
      },
      create: {
        role: UserRole.RESEARCHER_FIELD_COORDINATOR,
        permissionId,
        granted: true,
      },
      update: { granted: true },
    });
  }
  console.log("✓ صلاحيات RESEARCHER_FIELD_COORDINATOR");

  const legacy = await prisma.user.findUnique({ where: { email: "coordinator@jcsc.gov.jo" } });
  if (legacy) {
    await prisma.user.update({
      where: { id: legacy.id },
      data: { isActive: false },
    });
    console.log("✓ تم تعطيل منسق الدعم التجريبي القديم (coordinator@jcsc.gov.jo)");
  }

  const fieldOpsCoordinator = await prisma.user.findFirst({
    where: { email: FIELD_OPERATIONS_COORDINATOR.email, isActive: true },
  });

  const openCases = await prisma.case.findMany({
    where: { status: "OPEN", assignedCoordinatorId: null },
    select: {
      id: true,
      governorate: true,
      affectedSystem: true,
      researcherIssueType: true,
    },
  });

  const researcherFieldCoordinator = await resolveResearcherFieldCoordinator();

  let routed = 0;
  for (const c of openCases) {
    let coordinator = null;
    if (isFieldOperationsAffectedSystem(c.affectedSystem) && fieldOpsCoordinator) {
      coordinator = fieldOpsCoordinator;
    } else if (isResearcherFieldIssue(c) && researcherFieldCoordinator) {
      coordinator = researcherFieldCoordinator;
    } else {
      const email = getCoordinatorEmailForGovernorate(c.governorate);
      if (!email) continue;
      coordinator = await prisma.user.findFirst({
        where: { email, role: "SUPPORT_COORDINATOR", isActive: true },
      });
    }
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
