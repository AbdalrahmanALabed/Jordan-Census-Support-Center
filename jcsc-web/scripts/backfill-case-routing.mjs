/**
 * إعادة توجيه الحالات OPEN بدون منسق مسند.
 * Usage: node scripts/backfill-case-routing.mjs
 */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

function normalizeSystem(value) {
  if (!value?.trim()) return "FIELD_OPERATIONS";
  const v = value.trim();
  const map = {
    CALL_CENTER: "CALL_CENTER",
    "مركز اتصال": "CALL_CENTER",
    SELF_ENUMERATION: "SELF_ENUMERATION",
    "عد ذاتي": "SELF_ENUMERATION",
    RESEARCHER_SYSTEM: "RESEARCHER_SYSTEM",
    "نظام الباحث": "RESEARCHER_SYSTEM",
    FIELD_OPERATIONS: "FIELD_OPERATIONS",
    "إدارة العمل الميداني": "FIELD_OPERATIONS",
    INFRASTRUCTURE: "INFRASTRUCTURE",
    "البنية التحتية": "INFRASTRUCTURE",
  };
  return map[v] ?? v;
}

async function resolveCoordinator(governorate, affectedSystem, researcherIssueType) {
  const system = normalizeSystem(affectedSystem);
  if (system === "FIELD_OPERATIONS") {
    return p.user.findFirst({
      where: { email: "fieldops.coord@jcsc.gov.jo", role: "FIELD_OPERATIONS_COORDINATOR", isActive: true },
    });
  }
  if (system === "INFRASTRUCTURE") {
    return p.user.findFirst({
      where: { email: "infra.supervisor@jcsc.gov.jo", role: "INFRASTRUCTURE_SUPERVISOR", isActive: true },
    });
  }
  if (system === "RESEARCHER_SYSTEM" && researcherIssueType === "FIELD") {
    return p.user.findFirst({
      where: { email: "sanaa@jcsc.gov.jo", role: "RESEARCHER_FIELD_COORDINATOR", isActive: true },
    });
  }
  const govMap = {
    عمان: "razan.m@jcsc.gov.jo",
    البلقاء: "shatha.a@jcsc.gov.jo",
    الزرقاء: "shatha.a@jcsc.gov.jo",
    مادبا: "zina.t@jcsc.gov.jo",
    إربد: "manal.k@jcsc.gov.jo",
    جرش: "saida@jcsc.gov.jo",
    عجلون: "aman.h@jcsc.gov.jo",
    المفرق: "aman.h@jcsc.gov.jo",
    العقبة: "sawsan@jcsc.gov.jo",
    معان: "sawsan@jcsc.gov.jo",
    الكrk: "sawsan@jcsc.gov.jo",
    الكرك: "sawsan@jcsc.gov.jo",
    الطفيلة: "sawsan@jcsc.gov.jo",
  };
  const email = govMap[governorate?.trim()];
  if (!email) return null;
  return p.user.findFirst({ where: { email, role: "SUPPORT_COORDINATOR", isActive: true } });
}

const openCases = await p.case.findMany({
  where: { status: "OPEN", assignedCoordinatorId: null },
  select: {
    id: true,
    number: true,
    governorate: true,
    affectedSystem: true,
    researcherIssueType: true,
  },
});

let updated = 0;
for (const c of openCases) {
  const coordinator = await resolveCoordinator(c.governorate, c.affectedSystem, c.researcherIssueType);
  if (!coordinator) {
    console.log("SKIP (no coordinator):", c.number, c.affectedSystem, c.governorate);
    continue;
  }
  await p.case.update({
    where: { id: c.id },
    data: { assignedCoordinatorId: coordinator.id },
  });
  console.log("ROUTED:", c.number, "→", coordinator.name, `(${coordinator.email})`);
  updated++;
}

console.log(`\nDone — updated ${updated} of ${openCases.length} unassigned OPEN cases.`);
await p.$disconnect();
