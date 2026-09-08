import { PrismaClient } from "@prisma/client";
import { PRODUCTION_PASSWORDS } from "../prisma/production-passwords";

const prisma = new PrismaClient();

async function main() {
  const emails = Object.keys(PRODUCTION_PASSWORDS);
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { name: true, email: true, role: true, isActive: true, governorate: true, team: true },
    orderBy: { role: "asc" },
  });

  console.log(`Found ${users.length}/${emails.length} official users:\n`);
  for (const u of users) {
    console.log(`${u.isActive ? "✓" : "✗"} ${u.name} | ${u.role} | ${u.email} | ${u.governorate}`);
  }

  const missing = emails.filter((e) => !users.some((u) => u.email === e));
  if (missing.length) {
    console.log("\nMissing:");
    missing.forEach((e) => console.log("  -", e));
  }

  const extra = await prisma.user.findMany({
    where: { email: { notIn: emails } },
    select: { name: true, email: true, role: true },
  });
  if (extra.length) {
    console.log(`\nNon-official users still in DB (${extra.length}):`);
    extra.forEach((u) => console.log(`  - ${u.name} (${u.email})`));
  }
}

main().finally(() => prisma.$disconnect());
