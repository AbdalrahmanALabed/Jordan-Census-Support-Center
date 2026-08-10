import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const cfg = await p.systemConfig.findUnique({
  where: { key: "developer_fix_escalation_hours" },
});
console.log("config:", cfg);

const cases = await p.case.findMany({
  where: {
    assignedDeveloperId: { not: null },
    status: { in: ["IN_PROGRESS", "UNDER_REVIEW"] },
  },
  include: {
    assignedDeveloper: { include: { directManager: true } },
  },
  take: 15,
});

for (const c of cases) {
  const lastAssign = await p.caseTimelineEvent.findFirst({
    where: { caseId: c.id, action: { in: ["إسناد", "إعادة إسناد"] } },
    orderBy: { createdAt: "desc" },
  });
  console.log({
    number: c.number,
    caseType: c.caseType,
    status: c.status,
    assignedAt: c.assignedAt,
    timelineAssign: lastAssign?.createdAt,
    dev: c.assignedDeveloper?.email,
    manager: c.assignedDeveloper?.directManager?.email,
  });
}

const esc = await p.notification.findMany({
  where: { type: "escalation_developer_sla" },
});
console.log("escalations:", esc.length);

await p.$disconnect();
