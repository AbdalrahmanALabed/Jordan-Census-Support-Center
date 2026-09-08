import { PrismaClient } from "@prisma/client";
import { ROLE_LABELS } from "../src/lib/types";
import type { UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      name: true,
      email: true,
      role: true,
      isActive: true,
      governorate: true,
      team: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  console.log(`\nإجمالي المستخدمين: ${users.length}\n`);
  console.log("| # | الاسم | الدور | البريد | المحافظة | نشط |");
  console.log("|---|-------|-------|--------|----------|-----|");

  users.forEach((u, i) => {
    const roleLabel = ROLE_LABELS[u.role as UserRole] ?? u.role;
    console.log(
      `| ${i + 1} | ${u.name} | ${roleLabel} | ${u.email} | ${u.governorate ?? "—"} | ${u.isActive ? "✓" : "✗"} |`
    );
  });
}

main().finally(() => prisma.$disconnect());
