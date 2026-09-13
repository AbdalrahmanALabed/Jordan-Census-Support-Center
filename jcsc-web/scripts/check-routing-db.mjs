import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const users = await p.user.findMany({
  where: {
    role: {
      in: [
        "INFRASTRUCTURE_SUPERVISOR",
        "FIELD_OPERATIONS_COORDINATOR",
        "RESEARCHER_FIELD_COORDINATOR",
        "SUPPORT_COORDINATOR",
      ],
    },
    isActive: true,
  },
  select: { id: true, email: true, role: true, name: true },
});

const cases = await p.case.findMany({
  orderBy: { createdAt: "desc" },
  take: 8,
  select: {
    number: true,
    affectedSystem: true,
    researcherIssueType: true,
    assignedCoordinatorId: true,
    governorate: true,
    assignedCoordinator: { select: { name: true, email: true, role: true } },
  },
});

console.log("ROUTING USERS:", JSON.stringify(users, null, 2));
console.log("RECENT CASES:", JSON.stringify(cases, null, 2));

await p.$disconnect();
