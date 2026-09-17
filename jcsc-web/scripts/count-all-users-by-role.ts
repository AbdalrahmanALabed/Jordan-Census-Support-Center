import { prisma } from "../src/lib/db";

async function main() {
  const groups = await prisma.user.groupBy({
    by: ["role", "isActive"],
    _count: true,
    orderBy: { role: "asc" },
  });
  console.log("=== Users by role ===");
  for (const g of groups) {
    console.log(`${g.role} (active=${g.isActive}): ${g._count}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
