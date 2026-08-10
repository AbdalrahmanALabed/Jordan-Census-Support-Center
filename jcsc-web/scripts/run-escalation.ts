import { processEscalations } from "../src/lib/notifications/escalation";
import { prisma } from "../src/lib/db";

async function main() {
  await processEscalations();

  const esc = await prisma.notification.findMany({
    where: { type: "escalation_developer_sla" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log("escalations created:", esc.length);
  for (const e of esc) {
    console.log("-", e.issueNumber, "|", e.channel, "|", e.title);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
