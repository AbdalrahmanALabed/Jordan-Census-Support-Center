/**
 * إعداد كامل للإطلاق — المستخدمون الرسميون + دعم المراكز + كلمات المرور.
 * Run: npx tsx scripts/setup-production-launch.ts
 *      npx tsx scripts/setup-production-launch.ts --count 1006
 */
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const countIdx = args.indexOf("--count");
const count = countIdx >= 0 && args[countIdx + 1] ? args[countIdx + 1] : "1006";

function run(label: string, cmd: string) {
  console.log(`\n▸ ${label}`);
  execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
}

async function main() {
  console.log("══════════════════════════════════════════");
  console.log("  JCSC — إعداد المستخدمين للإطلاق");
  console.log("══════════════════════════════════════════");

  run("1/3 — المستخدمون الرسميون (26 حساب)", "npx tsx scripts/setup-production-users.ts");
  run(`2/3 — دعم فني المراكز (${count} حساب)`, `npx tsx scripts/seed-center-support-users.ts --count ${count}`);
  run("3/3 — تطبيق كلمات المرور الرسمية", "npx tsx scripts/apply-production-passwords.ts");

  console.log("\n✓ اكتمل إعداد المستخدمين للإطلاق");
  console.log("  • official-users: prisma/official-users.ts");
  console.log("  • passwords: prisma/production-passwords.ts");
  console.log("  • center support CSV: scripts/output/center-support-credentials.csv");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
