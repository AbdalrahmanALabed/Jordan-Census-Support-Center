import { prisma } from "../src/lib/db";
import { listCoordinatorTransferPeers } from "../src/lib/coordinator-transfer";

async function main() {
  const cases = await prisma.case.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const razan = await prisma.user.findFirst({ where: { email: "razan.m@jcsc.gov.jo" } });

  for (const c of cases) {
    const caseItem = {
      governorate: c.governorate,
      affectedSystem: c.affectedSystem,
      researcherIssueType: c.researcherIssueType,
      assignedCoordinatorId: c.assignedCoordinatorId,
      status: c.status,
    };
    const peers = await listCoordinatorTransferPeers(caseItem, razan?.id);
    console.log(
      c.number,
      c.affectedSystem,
      c.researcherIssueType,
      "→ peers:",
      peers.length,
      peers.map((p) => p.name).join(", ") || "(none)"
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
