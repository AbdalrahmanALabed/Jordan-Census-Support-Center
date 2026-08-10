import { PrismaClient } from "@prisma/client";

// Dynamic import after prisma is ready — run via tsx or compile path
const { processEscalations } = await import("../src/lib/notifications/escalation.ts");

await processEscalations();

const p = new PrismaClient();
const esc = await p.notification.findMany({
  where: { type: "escalation_developer_sla" },
  orderBy: { createdAt: "desc" },
  take: 10,
});
console.log("escalations created:", esc.length);
for (const e of esc) {
  console.log("-", e.issueNumber, e.title, e.channel);
}
await p.$disconnect();
