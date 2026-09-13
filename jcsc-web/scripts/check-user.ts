import { prisma } from "../src/lib/db";

async function main() {
  const email = process.argv[2] ?? "sanaa@jcsc.gov.jo";
  const u = await prisma.user.findFirst({
    where: { email },
    select: { email: true, name: true, role: true, isActive: true },
  });
  console.log(u ?? "NOT FOUND");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
