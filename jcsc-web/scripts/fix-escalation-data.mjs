/**
 * One-time fix: link developers to admin manager + backfill assignedAt + config.
 */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const admin = await p.user.findFirst({
  where: { role: "ADMIN", isActive: true },
});
if (!admin) {
  console.error("No admin user found");
  process.exit(1);
}

await p.systemConfig.upsert({
  where: { key: "developer_fix_escalation_hours" },
  create: { key: "developer_fix_escalation_hours", value: "2" },
  update: {},
});

const devs = await p.user.updateMany({
  where: { role: "DEVELOPER", directManagerId: null },
  data: { directManagerId: admin.id },
});
console.log("developers linked to admin:", devs.count);

const cases = await p.case.findMany({
  where: { assignedDeveloperId: { not: null }, assignedAt: null },
  include: {
    timeline: {
      where: { action: { in: ["إسناد", "إعادة إسناد", "تصنيف الحالة", "قبول وتصنيف"] } },
      orderBy: { createdAt: "desc" },
      take: 1,
    },
  },
});

let backfilled = 0;
for (const c of cases) {
  const when = c.timeline[0]?.createdAt ?? c.updatedAt;
  await p.case.update({
    where: { id: c.id },
    data: { assignedAt: when },
  });
  backfilled++;
}
console.log("assignedAt backfilled:", backfilled);

await p.$disconnect();
