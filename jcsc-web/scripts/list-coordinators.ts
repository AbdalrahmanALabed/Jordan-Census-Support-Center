import { prisma } from "../src/lib/db";

async function main() {
  const coords = await prisma.user.findMany({
    where: { role: "SUPPORT_COORDINATOR" },
    select: { name: true, email: true, isActive: true },
    orderBy: { name: "asc" },
  });
  console.log(coords);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
