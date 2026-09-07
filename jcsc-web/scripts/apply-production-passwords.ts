/**
 * تحديث كلمات مرور جميع المستخدمين للإطلاق الرسمي.
 * Run: npx tsx scripts/apply-production-passwords.ts
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { writeFileSync } from "fs";
import { join } from "path";
import {
  PRODUCTION_PASSWORDS,
  formatCredentialsMarkdown,
  type CredentialRow,
} from "../prisma/production-passwords";
import { ROLE_LABELS } from "../src/lib/types";
import type { UserRole } from "../src/lib/types";

const prisma = new PrismaClient();

async function main() {
  const rows: CredentialRow[] = [];
  let updated = 0;

  for (const [email, password] of Object.entries(PRODUCTION_PASSWORDS)) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.warn(`⚠ User not found: ${email}`);
      continue;
    }
    const passwordHash = await hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash },
    });
    rows.push({
      name: user.name,
      roleLabel: ROLE_LABELS[user.role as UserRole] ?? user.role,
      email: user.email,
      password,
    });
    updated++;
  }

  rows.sort((a, b) => a.email.localeCompare(b.email));

  const outPath = join(process.cwd(), "PRODUCTION_CREDENTIALS.md");
  writeFileSync(outPath, formatCredentialsMarkdown(rows), "utf8");

  console.log(`✓ Updated passwords for ${updated} users`);
  console.log(`✓ Credentials list written to: ${outPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
