import { prisma } from "../src/lib/db";
import { LEAD_TRANSFER_ROLES, listCoordinatorTransferPeers } from "../src/lib/coordinator-transfer";
import { ROLE_LABELS } from "../src/lib/types";

async function main() {
  const all = await prisma.user.findMany({
    where: { role: { in: [...LEAD_TRANSFER_ROLES] }, isActive: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  console.log("=== ALL ACTIVE LEAD USERS IN DB ===");
  console.log("Total:", all.length);
  for (const u of all) {
    console.log(`  - ${u.name} (${ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}) — ${u.email}`);
  }

  const byRole = Object.fromEntries(
    LEAD_TRANSFER_ROLES.map((r) => [r, all.filter((u) => u.role === r).length])
  );
  console.log("\nBy role:", byRole);

  const openCase = await prisma.case.findFirst({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });
  if (!openCase) {
    console.log("\nNo OPEN case found");
    return;
  }

  const razan = await prisma.user.findFirst({ where: { email: "razan.m@jcsc.gov.jo" } });
  const peers = await listCoordinatorTransferPeers(
    {
      governorate: openCase.governorate,
      affectedSystem: openCase.affectedSystem,
      researcherIssueType: openCase.researcherIssueType,
      assignedCoordinatorId: openCase.assignedCoordinatorId,
      status: openCase.status,
    },
    razan?.id
  );

  console.log(`\n=== TRANSFER PEERS for ${openCase.number} (viewer: razan) ===`);
  console.log("Assigned coordinator id:", openCase.assignedCoordinatorId);
  console.log("Peer count:", peers.length);
  for (const p of peers) {
    console.log(`  - ${p.name} (${ROLE_LABELS[p.role as keyof typeof ROLE_LABELS] ?? p.role})`);
  }
  console.log("\nExpected:", all.length, "- assigned(1 if razan not assigned) - viewer razan(1) = ?");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
