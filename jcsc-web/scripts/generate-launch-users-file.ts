/**
 * إنشاء ملف المستخدمين الكامل للإطلاق (Excel + CSV + ملخص Markdown).
 * Run: npx tsx scripts/generate-launch-users-file.ts
 *      npx tsx scripts/generate-launch-users-file.ts --count 1006
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { OFFICIAL_USERS } from "../prisma/official-users";
import { PRODUCTION_PASSWORDS } from "../prisma/production-passwords";
import {
  DEFAULT_CENTER_SUPPORT_COUNT,
  listCenterSupportUsers,
} from "../src/lib/center-support-launch";
import { ROLE_LABELS, type UserRole } from "../src/lib/types";

const HEADERS_EN = [
  "tier",
  "name",
  "email",
  "password",
  "role",
  "role_label_ar",
  "team",
  "governorate",
] as const;

const HEADERS_AR = [
  "الفئة",
  "الاسم",
  "البريد",
  "كلمة المرور",
  "الدور (كود)",
  "الدور",
  "الفريق",
  "المحافظة",
] as const;

type UserRow = {
  tier: string;
  name: string;
  email: string;
  password: string;
  role: string;
  roleLabelAr: string;
  team: string;
  governorate: string;
};

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

function buildRows(centerCount: number): UserRow[] {
  const rows: UserRow[] = [];

  for (const u of OFFICIAL_USERS) {
    const password = PRODUCTION_PASSWORDS[u.email];
    if (!password) {
      console.warn(`⚠ missing password: ${u.email}`);
      continue;
    }
    rows.push({
      tier: "official",
      name: u.name,
      email: u.email,
      password,
      role: u.role,
      roleLabelAr: ROLE_LABELS[u.role as UserRole] ?? u.role,
      team: u.team,
      governorate: u.governorate,
    });
  }

  for (const u of listCenterSupportUsers(centerCount)) {
    rows.push({
      tier: "center_support",
      name: u.name,
      email: u.email,
      password: u.password,
      role: u.role,
      roleLabelAr: "الدعم الفني المراكز",
      team: u.team,
      governorate: u.governorate,
    });
  }

  return rows;
}

function rowToEnArray(r: UserRow): string[] {
  return [r.tier, r.name, r.email, r.password, r.role, r.roleLabelAr, r.team, r.governorate];
}

function rowToArArray(r: UserRow): string[] {
  return [
    r.tier === "official" ? "رسمي" : "دعم مراكز",
    r.name,
    r.email,
    r.password,
    r.role,
    r.roleLabelAr,
    r.team,
    r.governorate,
  ];
}

function writeExcel(rows: UserRow[], xlsxPath: string) {
  const official = rows.filter((r) => r.tier === "official");
  const center = rows.filter((r) => r.tier === "center_support");

  const wb = XLSX.utils.book_new();

  const allSheet = XLSX.utils.aoa_to_sheet([
    HEADERS_AR,
    ...rows.map(rowToArArray),
  ]);
  allSheet["!cols"] = [
    { wch: 12 },
    { wch: 28 },
    { wch: 32 },
    { wch: 22 },
    { wch: 28 },
    { wch: 22 },
    { wch: 24 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, allSheet, "جميع المستخدمين");

  const officialSheet = XLSX.utils.aoa_to_sheet([
    HEADERS_AR,
    ...official.map(rowToArArray),
  ]);
  XLSX.utils.book_append_sheet(wb, officialSheet, "الحسابات الرسمية");

  const centerSheet = XLSX.utils.aoa_to_sheet([
    HEADERS_AR,
    ...center.map(rowToArArray),
  ]);
  centerSheet["!cols"] = [
    { wch: 12 },
    { wch: 22 },
    { wch: 28 },
    { wch: 22 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, centerSheet, "دعم المراكز");

  XLSX.writeFile(wb, xlsxPath);
}

function main() {
  const centerCount = parseCount();
  const rows = buildRows(centerCount);

  const csvRows = [HEADERS_EN as unknown as string[], ...rows.map(rowToEnArray)];
  const csvBody = csvRows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const csvPath = join(process.cwd(), "prisma", "LAUNCH_USERS_COMPLETE.csv");
  writeFileSync(csvPath, "\uFEFF" + csvBody, "utf8");

  const xlsxPath = join(process.cwd(), "prisma", "LAUNCH_USERS_COMPLETE.xlsx");
  writeExcel(rows, xlsxPath);

  const mdPath = join(process.cwd(), "prisma", "LAUNCH_USERS_COMPLETE.md");
  const officialRows = rows.filter((r) => r.tier === "official");
  const mdLines = [
    "# JCSC — ملف المستخدمين الكامل للإطلاق",
    "",
    `**تاريخ التوليد:** ${new Date().toISOString()}`,
    "",
    "| # | الاسم | البريد | كلمة المرور | الدور | المحافظة |",
    "|---|-------|--------|-------------|-------|----------|",
  ];
  officialRows.forEach((r, i) => {
    mdLines.push(`| ${i + 1} | ${r.name} | \`${r.email}\` | \`${r.password}\` | ${r.roleLabelAr} | ${r.governorate} |`);
  });
  mdLines.push(
    "",
    "## دعم فني المراكز",
    "",
    `عدد الحسابات: **${centerCount}** (cs0001 … cs${String(centerCount).padStart(4, "0")}@jcsc.gov.jo)`,
    "",
    "الملفات الكاملة:",
    "",
    "- **`prisma/LAUNCH_USERS_COMPLETE.xlsx`** — Excel (3 أوراق)",
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

  console.log(`✓ Excel: ${xlsxPath}`);
  console.log(`✓ CSV: ${csvPath}`);
  console.log(
    `  total rows: ${rows.length} (${officialRows.length} official + ${centerCount} center support)`
  );
  console.log(`✓ MD summary: ${mdPath}`);
}

main();
