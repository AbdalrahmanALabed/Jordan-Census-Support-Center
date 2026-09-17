/**
 * تشغيل كل suites الاختبار بالتسلسل
 * Usage: node scripts/run-full-test-suite.mjs
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const env = {
  ...process.env,
  PASSWORD_REQUIRE_API: "1",
  HEADLESS: "1",
  CI: "true",
};

const steps = [
  { name: "comprehensive-qa", cmd: "npx tsx scripts/comprehensive-qa.ts" },
  { name: "coordinator-regression", cmd: "node scripts/coordinator-regression-api.mjs" },
  { name: "smoke", cmd: "npm run test:smoke" },
  { name: "password-api", cmd: "npm run test:password" },
  { name: "password-ui", cmd: "npm run test:password:ui" },
  { name: "deep-lifecycle", cmd: "npm run test:deep-lifecycle" },
  { name: "e2e", cmd: "npm run test:e2e" },
  { name: "ui-audit", cmd: "npm run test:ui-audit" },
];

const results = [];

console.log("\n╔══════════════════════════════════════════════════════╗");
console.log("║  JCSC — اختبار شامل كامل                             ║");
console.log("╚══════════════════════════════════════════════════════╝\n");

for (const step of steps) {
  console.log(`\n▶ ${step.name} ...\n`);
  const started = Date.now();
  try {
    execSync(step.cmd, { cwd: ROOT, env, stdio: "inherit", shell: true });
    results.push({ name: step.name, ok: true, ms: Date.now() - started });
  } catch (e) {
    results.push({
      name: step.name,
      ok: false,
      ms: Date.now() - started,
      code: e.status ?? 1,
    });
    console.error(`\n✗ ${step.name} failed (exit ${e.status ?? 1})\n`);
  }
}

mkdirSync(join(ROOT, "scripts", "output"), { recursive: true });
const report = join(ROOT, "scripts", "output", `full-suite-${Date.now()}.json`);
writeFileSync(report, JSON.stringify({ results, at: new Date().toISOString() }, null, 2));

console.log("\n══════════════════════════════════════════════════════");
console.log("  الملخص:");
for (const r of results) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.name} (${Math.round(r.ms / 1000)}s)`);
}
console.log(`\n  تقرير: ${report}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n  فشل: ${failed}/${results.length}` : `\n  ✓ الكل نجح (${results.length}/${results.length})`);
console.log("══════════════════════════════════════════════════════\n");
process.exit(failed ? 1 : 0);
