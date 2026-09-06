import { PrismaClient } from "@prisma/client";
import { normalizeEmail } from "../src/lib/email";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  let fixed = 0;

  for (const user of users) {
    const normalized = normalizeEmail(user.email);
    if (user.email === normalized) continue;

    const conflict = await prisma.user.findUnique({ where: { email: normalized } });
    if (conflict && conflict.id !== user.id) {
      console.warn(`Skip ${user.email}: ${normalized} already taken by ${conflict.id}`);
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { email: normalized },
    });
    console.log(`${user.email} → ${normalized}`);
    fixed++;
  }

  console.log(`Normalized ${fixed} email(s)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
