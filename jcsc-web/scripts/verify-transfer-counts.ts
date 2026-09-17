import { prisma } from "../src/lib/db";
import {
  isTransferPeerSelectable,
  listCoordinatorTransferPeers,
} from "../src/lib/coordinator-transfer";

async function main() {
  const leads = await prisma.user.findMany({
    where: {
      role: {
        in: [
          "SUPPORT_COORDINATOR",
          "FIELD_OPERATIONS_COORDINATOR",
          "RESEARCHER_FIELD_COORDINATOR",
          "INFRASTRUCTURE_SUPERVISOR",
          "SUPPORT_SUPERVISOR",
        ],
      },
      isActive: true,
    },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  const openCase = await prisma.case.findFirst({
    where: { status: "OPEN", number: "R-260913-0012" },
  });
  if (!openCase) {
    console.log("Case not found");
    return;
  }

  const viewers = await prisma.user.findMany({
    where: {
      email: {
        in: [
          "razan.m@jcsc.gov.jo",
          "manal.k@jcsc.gov.jo",
          "fieldops.coord@jcsc.gov.jo",
          "support-supervisor@jcsc.gov.jo",
        ],
      },
    },
    select: { id: true, name: true, email: true },
  });

  console.log("DB total active lead users:", leads.length);
  console.log("Case assigned to:", openCase.assignedCoordinatorId);
  console.log("");

  for (const viewer of viewers) {
    const peers = await listCoordinatorTransferPeers();
    const selectable = peers.filter((p) =>
      isTransferPeerSelectable(p.id, viewer.id, openCase.assignedCoordinatorId)
    );
    console.log(`Viewer: ${viewer.name} → ${peers.length} shown, ${selectable.length} selectable`);
    console.log(`  ${peers.map((p) => p.name).join(" | ")}`);
    console.log("");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
