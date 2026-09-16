/**
 * فحص حسابات مراكز الدعم — وجود + كلمة مرور مطابقة لملف الإطلاق.
 * Run: npx tsx scripts/verify-center-support-auth.ts
 *      npx tsx scripts/verify-center-support-auth.ts --sample 20
 */
import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";
import {
  DEFAULT_CENTER_SUPPORT_COUNT,
  centerSupportEmail,
  centerSupportPassword,
} from "../src/lib/center-support-launch";
import { authenticateUser } from "../src/lib/authenticate-user";

const prisma = new PrismaClient();

function parseSample(): number {
  const idx = process.argv.indexOf("--sample");
  if (idx >= 0 && process.argv[idx + 1]) {
    return Math.max(1, parseInt(process.argv[idx + 1], 10) || 10);
  }
  return 10;
}

async function main() {
  const sample = parseSample();
  const total = await prisma.user.count({
    where: { email: { startsWith: "cs" } },
  });

  console.log(`\nCenter support users in DB (cs*): ${total} (expected ${DEFAULT_CENTER_SUPPORT_COUNT})\n`);

  if (total === 0) {
    console.error("✗ لا توجد حسابات — شغّل على السيرفر:");
    console.error("  npm run db:seed-center-support -- --count 1006 --refresh");
    process.exit(1);
  }

  const indices = [1, 2, 3, 100, 500, 1000, 1006].filter((i) => i <= DEFAULT_CENTER_SUPPORT_COUNT);
  while (indices.length < sample) {
    const n = Math.floor(Math.random() * DEFAULT_CENTER_SUPPORT_COUNT) + 1;
    if (!indices.includes(n)) indices.push(n);
  }

  let failed = 0;
  for (const i of indices.slice(0, sample)) {
    const email = centerSupportEmail(i);
    const pwd = centerSupportPassword(i);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`✗ ${email} — غير موجود في قاعدة البيانات`);
      failed++;
      continue;
    }
    if (!user.isActive) {
      console.log(`✗ ${email} — الحساب غير نشط`);
      failed++;
      continue;
    }
    const hashOk = await compare(pwd, user.password);
    const authOk = await authenticateUser(email, pwd);
    if (hashOk && authOk) {
      console.log(`✓ ${email}`);
    } else {
      console.log(`✗ ${email} — كلمة المرور لا تطابق ملف Excel (شغّل --refresh)`);
      failed++;
    }
  }

  if (total < DEFAULT_CENTER_SUPPORT_COUNT) {
    console.log(`\n⚠ ناقص ${DEFAULT_CENTER_SUPPORT_COUNT - total} حساب — زِد العدد:`);
    console.log("  npm run db:seed-center-support -- --count 1006");
    failed++;
  }

  console.log(failed ? `\n${failed} مشكلة — أصلِح بـ --refresh` : "\n✓ العينة سليمة");
  process.exit(failed ? 1 : 0);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
