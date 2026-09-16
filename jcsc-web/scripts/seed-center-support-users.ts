/**
 * إنشاء/تحديث حسابات دعم فني المراكز (SUPERVISOR) — لا يحذف أي حساب موجود.
 *
 * Run:
 *   npx tsx scripts/seed-center-support-users.ts
 *   npx tsx scripts/seed-center-support-users.ts --count 1000
 *   npx tsx scripts/seed-center-support-users.ts --count 1000 --refresh
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import {
  CENTER_SUPPORT_EMAIL_PREFIX as EMAIL_PREFIX,
  DEFAULT_CENTER_SUPPORT_COUNT,
  centerSupportEmail as emailFor,
  centerSupportDisplayName as displayNameFor,
  centerSupportPassword as passwordFor,
  centerSupportGovernorate as governorateFor,
  CENTER_SUPPORT_TEAM as TEAM,
} from "../src/lib/center-support-launch";

const prisma = new PrismaClient();

const SUPPORT_SUPERVISOR_EMAIL = "support-supervisor@jcsc.gov.jo";

function parseArgs() {
  const args = process.argv.slice(2);
  let count = DEFAULT_CENTER_SUPPORT_COUNT;
  let refresh = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--count" && args[i + 1]) {
      count = Math.max(1, parseInt(args[i + 1], 10) || DEFAULT_CENTER_SUPPORT_COUNT);
    }
    if (args[i] === "--refresh") refresh = true;
  }
  return { count, refresh };
}

async function main() {
  const { count, refresh } = parseArgs();
  const manager = await prisma.user.findFirst({
    where: { email: SUPPORT_SUPERVISOR_EMAIL, isActive: true },
    select: { id: true },
  });

  const targetEmails = Array.from({ length: count }, (_, i) => emailFor(i + 1));
  const existing = await prisma.user.findMany({
    where: { email: { in: targetEmails } },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((u) => u.email.toLowerCase()));

  const rows: { name: string; email: string; password: string; governorate: string }[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 1; i <= count; i++) {
    const email = emailFor(i);
    const name = displayNameFor(i);
    const gov = governorateFor(i);
    const plainPassword = passwordFor(i);
    const exists = existingEmails.has(email.toLowerCase());

    const passwordHash = await hash(plainPassword, 10);
    const mustSetPassword = !exists || refresh;

    if (exists && !refresh) {
      await prisma.user.update({
        where: { email },
        data: {
          name,
          role: UserRole.SUPERVISOR,
          team: TEAM,
          governorate: gov,
          directManagerId: manager?.id ?? undefined,
          isActive: true,
        },
      });
      skipped++;
      rows.push({ name, email, password: "(unchanged — use --refresh to sync Excel passwords)", governorate: gov });
      continue;
    }

    await prisma.user.upsert({
      where: { email },
      create: {
        name,
        email,
        password: passwordHash,
        role: UserRole.SUPERVISOR,
        team: TEAM,
        governorate: gov,
        phone: "+962790000000",
        shift: "صباحي",
        specialtyTags: "[]",
        directManagerId: manager?.id ?? null,
        isActive: true,
      },
      update: {
        name,
        role: UserRole.SUPERVISOR,
        team: TEAM,
        governorate: gov,
        directManagerId: manager?.id ?? undefined,
        isActive: true,
        ...(mustSetPassword ? { password: passwordHash } : {}),
      },
    });

    if (exists) updated++;
    else created++;
    rows.push({ name, email, password: plainPassword, governorate: gov });
  }

  const outDir = join(process.cwd(), "scripts", "output");
  mkdirSync(outDir, { recursive: true });
  const csvPath = join(outDir, "center-support-credentials.csv");
  const header = "name,email,password,governorate\n";
  const body = rows.map((r) => `"${r.name}","${r.email}","${r.password}","${r.governorate}"`).join("\n");
  writeFileSync(csvPath, header + body, "utf8");

  console.log(`✓ center support users — created: ${created}, updated: ${updated}, skipped: ${skipped}`);
  console.log(`✓ credentials: ${csvPath}`);
  console.log(`  total in DB (cs*): ${await prisma.user.count({ where: { email: { startsWith: EMAIL_PREFIX } } })}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
