import { prisma } from "../src/lib/db";
import { getManagedUserIds } from "../src/lib/support-supervisor/server";
import { listCases, mapCaseToClient } from "../src/lib/cases/server";
import { filterItemsByFieldOpsVisibility } from "../src/lib/field-ops-visibility";

async function main() {
  const sup = await prisma.user.findFirst({
    where: { email: "support-supervisor@jcsc.gov.jo" },
  });
  if (!sup) {
    console.log("supervisor not found");
    return;
  }
  const ids = await getManagedUserIds(sup.id);
  console.log("managed users:", ids.length);

  const cases = await listCases({
    supportSupervisorUserId: sup.id,
    limit: 5,
    role: sup.role,
  });
  console.log("cases fetched:", cases.length);

  const visible = filterItemsByFieldOpsVisibility(cases, sup.role, {
    viewerId: sup.id,
  });
  console.log("visible:", visible.length);

  for (const c of visible.slice(0, 2)) {
    try {
      mapCaseToClient(c);
      console.log("map OK", c.number);
    } catch (e) {
      console.error("map FAIL", c.number, e);
    }
  }
}

main()
  .catch((e) => {
    console.error("ERROR", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
