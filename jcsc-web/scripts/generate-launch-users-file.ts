/**
 * إنشاء ملف المستخدمين الكامل للإطلاق (CSV + ملخص Markdown).
 * Run: npx tsx scripts/generate-launch-users-file.ts
 *      npx tsx scripts/generate-launch-users-file.ts --count 1006
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { OFFICIAL_USERS } from "../prisma/official-users";
import { PRODUCTION_PASSWORDS } from "../prisma/production-passwords";
import {
  DEFAULT_CENTER_SUPPORT_COUNT,
  listCenterSupportUsers,
} from "../src/lib/center-support-launch";
import { ROLE_LABELS, type UserRole } from "../src/lib/types";

function parseCount(): number {
  const idx = process.argv.indexOf("--count");
  if (idx >= 0 && process.argv[idx + 1]) {
    return Math.max(1, parseInt(process.argv[idx + 1], 10) || DEFAULT_CENTER_SUPPORT_COUNT);
  }
  return DEFAULT_CENTER_SUPPORT_COUNT;
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function main() {
  const centerCount = parseCount();
  const rows: string[][] = [
    ["tier", "name", "email", "password", "role", "role_label_ar", "team", "governorate"],
  ];

  for (const u of OFFICIAL_USERS) {
    const password = PRODUCTION_PASSWORDS[u.email];
    if (!password) {
      console.warn(`⚠ missing password: ${u.email}`);
      continue;
    }
    rows.push([
      "official",
      u.name,
      u.email,
      password,
      u.role,
      ROLE_LABELS[u.role as UserRole] ?? u.role,
      u.team,
      u.governorate,
    ]);
  }

  for (const u of listCenterSupportUsers(centerCount)) {
    rows.push([
      "center_support",
      u.name,
      u.email,
      u.password,
      u.role,
      "الدعم الفني المراكز",
      u.team,
      u.governorate,
    ]);
  }

  const csvBody = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const csvPath = join(process.cwd(), "prisma", "LAUNCH_USERS_COMPLETE.csv");
  writeFileSync(csvPath, "\uFEFF" + csvBody, "utf8");

  const mdPath = join(process.cwd(), "prisma", "LAUNCH_USERS_COMPLETE.md");
  const officialRows = rows.slice(1, 1 + OFFICIAL_USERS.length);
  const mdLines = [
    "# JCSC — ملف المستخدمين الكامل للإطلاق",
    "",
    `**تاريخ التوليد:** ${new Date().toISOString()}`,
    "",
    "| # | الاسم | البريد | كلمة المرور | الدور | المحافظة |",
    "|---|-------|--------|-------------|-------|----------|",
  ];
  officialRows.forEach((r, i) => {
    mdLines.push(`| ${i + 1} | ${r[1]} | \`${r[2]}\` | \`${r[3]}\` | ${r[5]} | ${r[7]} |`);
  });
  mdLines.push(
    "",
    "## دعم فني المراكز",
    "",
    `عدد الحسابات: **${centerCount}** (cs0001 … cs${String(centerCount).padStart(4, "0")}@jcsc.gov.jo)`,
    "",
    "كلمات المرور والتفاصيل الكاملة في:",
    "",
    "- `prisma/LAUNCH_USERS_COMPLETE.csv`",
    "",
    "إعادة التوليد:",
    "",
    "```bash",
    "npm run users:file",
    "```",
    ""
  );
  writeFileSync(mdPath, mdLines.join("\n"), "utf8");

  console.log(`✓ CSV: ${csvPath}`);
  console.log(`  total rows: ${rows.length - 1} (${OFFICIAL_USERS.length} official + ${centerCount} center support)`);
  console.log(`✓ MD summary: ${mdPath}`);
}

main();
