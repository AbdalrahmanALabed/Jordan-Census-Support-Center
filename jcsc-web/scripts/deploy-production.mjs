#!/usr/bin/env node
/**
 * نشر آمن للإنتاج — لا يحذف المستخدمين ولا يشغّل db:seed.
 *
 * Run from jcsc-web:
 *   node scripts/deploy-production.mjs
 *
 * Env (optional):
 *   SKIP_GIT_PULL=1        — لا تسحب من GitHub
 *   SKIP_PM2=1             — لا تعيد تحميل PM2
 *   SYNC_OFFICIAL_USERS=1  — شغّل setup-regional-coordinators بعد db push
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function run(cmd, label) {
  console.log(`\n▸ ${label}\n   ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, env: process.env });
}

function main() {
  console.log("═".repeat(52));
  console.log("  JCSC — نشر الإنتاج (آمن — بدون حذف مستخدمين)");
  console.log("═".repeat(52));

  if (process.env.SKIP_GIT_PULL !== "1") {
    run("git pull origin master", "سحب آخر نسخة من GitHub");
  } else {
    console.log("\n▸ تخطي git pull (SKIP_GIT_PULL=1)");
  }

  run("npm install", "تثبيت الحزم");
  run("npm run db:generate", "توليد Prisma Client");
  run("npx prisma db push", "تحديث المخطط (بدون حذف بيانات)");

  if (process.env.SYNC_OFFICIAL_USERS === "1") {
    run("npx tsx scripts/setup-regional-coordinators.ts", "مزامنة المنسقين الرسميين");
  }

  if (!existsSync(join(root, "prisma", "production-passwords.ts"))) {
    console.warn("\n⚠ prisma/production-passwords.ts غير موجود — انسخ من production-passwords.example.ts");
  } else if (process.env.APPLY_PASSWORDS === "1") {
    run("npx tsx scripts/apply-production-passwords.ts", "تحديث كلمات مرور الحسابات الرسمية");
  }

  run("npm run build", "بناء Next.js");

  if (process.env.SKIP_PM2 !== "1") {
    try {
      run("npm run pm2:reload", "إعادة تحميل PM2");
    } catch {
      console.warn("\n⚠ pm2 reload failed — جرّب: npm run pm2:start");
    }
  } else {
    console.log("\n▸ تخطي PM2 (SKIP_PM2=1) — شغّل يدوياً: npm run pm2:start");
  }

  console.log("\n✓ اكتمل النشر");
  console.log("  URL: https://realsoftapps.com/Support_Center/login");
  console.log("  ⚠ لا تشغّل db:setup أو db:seed — يمسح المستخدمين");
  console.log("  ⚠ لا تشغّل prepare-production-launch مع REMOVE_UNOFFICIAL_USERS=true");
}

main();
