/**
 * فحص عميق للواجهات — كل الأدوار، القائمة، صفحات الإدارة، تفاصيل، أخطاء Console
 * Usage: HEADLESS=1 node scripts/deep-ui-audit.mjs
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { passwordFor } from "./test-credentials.mjs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const BP = "/Support_Center";

/** صفحات كل دور (من nav-config + مسارات مهمة) */
const ROLE_UI = [
  {
    label: "سوبر أدمن",
    email: "admin@jcsc.gov.jo",
    pages: [
      "/dashboard",
      "/cases",
      "/cases/create",
      "/reports",
      "/users",
      "/users?tab=add",
      "/notifications",
      "/knowledge-base",
      "/settings",
      "/approval-center",
      "/audit",
      "/routing-rules",
      "/roles",
      "/queues",
      "/search",
      "/shift-handover",
    ],
    forbidden: [],
    detailAudit: true,
  },
  {
    label: "مشرف الدعم",
    email: "support-supervisor@jcsc.gov.jo",
    detailAudit: true,
    pages: [
      "/dashboard",
      "/cases",
      "/users",
      "/users?tab=add",
      "/notifications",
      "/knowledge-base",
      "/settings",
    ],
    forbidden: ["/approval-center", "/audit"],
  },
  {
    label: "منسق إربد",
    detailAudit: true,
    email: "manal.k@jcsc.gov.jo",
    pages: [
      "/dashboard",
      "/reports/my",
      "/cases",
      "/cases?status=OPEN",
      "/cases/create",
      "/users",
      "/users?tab=add",
      "/knowledge-base",
      "/notifications",
      "/settings",
    ],
    forbidden: ["/reports"],
  },
  {
    label: "منسق عمان",
    email: "razan.m@jcsc.gov.jo",
    pages: ["/dashboard", "/cases", "/reports/my", "/settings"],
    forbidden: [],
  },
  {
    label: "منسق FOM",
    email: "fieldops.coord@jcsc.gov.jo",
    pages: ["/dashboard", "/cases", "/reports/my", "/knowledge-base", "/settings"],
    forbidden: [],
  },
  {
    label: "مشرف باحث فني",
    email: "sanaa@jcsc.gov.jo",
    pages: ["/dashboard", "/cases", "/reports/my", "/settings"],
    forbidden: [],
  },
  {
    label: "مشرف بنية",
    email: "infra.supervisor@jcsc.gov.jo",
    pages: ["/dashboard", "/reports", "/settings"],
    forbidden: [],
  },
  {
    label: "مركز الدعم إربد",
    email: "supervisor@jcsc.gov.jo",
    pages: [
      "/dashboard",
      "/reports/my",
      "/cases/create",
      "/knowledge-base",
      "/notifications",
      "/settings",
    ],
    forbidden: ["/users", "/cases"],
    detailAudit: true,
  },
  {
    label: "مطور",
    email: "hazem@jcsc.gov.jo",
    detailAudit: true,
    pages: ["/cases", "/notifications", "/settings"],
    forbidden: ["/users", "/cases/create"],
  },
];

const results = [];
const consoleIssues = [];

function record(role, page, ok, detail) {
  results.push({ role, page, ok, detail });
  console.log(`${ok ? "✓" : "✗"} [${role}] ${page} — ${detail}`);
}

async function login(page, email) {
  const pwd = passwordFor(email);
  if (!pwd) throw new Error(`No password: ${email}`);
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(`${BASE}${BP}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector('button[type="submit"]', { timeout: 15000 });
      await page.locator('input[name="email"], input[type="email"]').first().fill(email);
      await page.locator('input[name="password"]').first().fill(pwd);
      await page.click('button[type="submit"]');
      await page.waitForURL((u) => !u.pathname.includes("/login"), {
        timeout: 45000,
        waitUntil: "domcontentloaded",
      });
      return;
    } catch (e) {
      if (i === 2) throw e;
      await page.waitForTimeout(800);
    }
  }
}

async function auditPage(page, role, path, expectForbidden = false) {
  const consoleErrors = [];
  const handler = (msg) => {
    if (msg.type() === "error") {
      const t = msg.text();
      if (!/favicon|404.*\.(png|ico)|hydration/i.test(t)) consoleErrors.push(t.slice(0, 200));
    }
  };
  page.on("console", handler);

  const started = Date.now();
  let response;
  try {
    response = await page.goto(`${BASE}${BP}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 35000,
    });
  } catch (e) {
    page.off("console", handler);
    record(role, path, false, `navigation: ${e.message.slice(0, 80)}`);
    return;
  }

  await page.locator(".animate-spin").first().waitFor({ state: "hidden", timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(600);

  const body = await page.locator("body").innerText();
  const ms = Date.now() - started;
  page.off("console", handler);

  const appError =
    body.includes("Application error") ||
    body.includes("Unhandled Runtime Error") ||
    body.includes("Something went wrong");
  const forbiddenUi = body.includes("غير مصرح") || body.includes("403");
  const hasShell = (await page.locator("main, .content-container, [dir='rtl']").count()) > 0;
  const status = response?.status() ?? 0;

  if (expectForbidden) {
    const pathBase = path.split("?")[0];
    const urlPath = new URL(page.url()).pathname;
    const redirectedAway =
      (pathBase === "/reports" && urlPath.endsWith("/reports/my")) ||
      (!urlPath.includes(pathBase) && page.url().includes(BP) && !urlPath.includes("/login"));
    const ok =
      forbiddenUi || status === 403 || page.url().includes("/login") || redirectedAway;
    record(role, path, ok, ok ? "محظور/إعادة توجيه" : `status=${status} url=${page.url()}`);
    return;
  }

  const ok = status < 400 && !appError && hasShell;
  let detail = `${ms}ms HTTP ${status}`;
  if (appError) detail += " | Application error";
  if (!hasShell) detail += " | لا shell";
  if (consoleErrors.length) {
    detail += ` | console×${consoleErrors.length}`;
    consoleIssues.push({ role, path, errors: consoleErrors });
  }
  record(role, path, ok, detail);
}

async function auditDetailPages(page, role) {
  const sample = await page.evaluate(async () => {
    const casesRes = await fetch("/Support_Center/api/cases?limit=3");
    const cases = casesRes.ok ? await casesRes.json() : [];
    const c = Array.isArray(cases) ? cases[0] : null;
    let reportId = c?.sourceReportId;
    if (!reportId) {
      const rep = await fetch("/Support_Center/api/reports?limit=3");
      const reports = rep.ok ? await rep.json() : [];
      reportId = Array.isArray(reports) ? reports[0]?.id : null;
    }
    return { caseId: c?.id ?? null, reportId };
  });

  if (sample.caseId) {
    await auditPage(page, role, `/cases/${sample.caseId}`);
  } else {
    record(role, "/cases/:id", true, "تخطي — لا عينة");
  }
  if (sample.reportId) {
    const skipReportDetail = role === "سوبر أدمن" || role === "مشرف الدعم";
    if (!skipReportDetail) {
      await auditPage(page, role, `/reports/${sample.reportId}`);
    }
  }
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  JCSC — فحص عميق للواجهات (UI Deep Audit)            ║");
  console.log(`║  ${BASE}${BP}`.padEnd(55) + "║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  const health = await fetch(`${BASE}${BP}/login`);
  if (health.status >= 500) {
    console.error("الخادم غير متاح");
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== "0",
    channel: process.env.HEADLESS === "0" ? "chrome" : undefined,
  });
  const context = await browser.newContext({ locale: "ar-JO" });
  const page = await context.newPage();

  for (const role of ROLE_UI) {
    console.log(`\n── ${role.label} (${role.email}) ──`);
    try {
      await context.clearCookies();
      await login(page, role.email);
      for (const p of role.pages) {
        await auditPage(page, role.label, p);
      }
      for (const p of role.forbidden) {
        await auditPage(page, role.label, p, true);
      }
      if (role.detailAudit) {
        await auditDetailPages(page, role.label);
      }
    } catch (e) {
      record(role.label, "(session)", false, e.message.slice(0, 120));
    }
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);
  console.log("\n══════════════════════════════════════════════════════");
  console.log(`  UI: ${passed.length}/${results.length} نجح — ${failed.length} فشل`);
  if (consoleIssues.length) {
    console.log(`  تحذيرات Console: ${consoleIssues.length} صفحة`);
  }
  console.log("══════════════════════════════════════════════════════\n");

  if (failed.length) {
    console.log("فشل:");
    for (const f of failed) console.log(`  • [${f.role}] ${f.page}: ${f.detail}`);
  }

  try {
    mkdirSync(join(process.cwd(), "scripts", "output"), { recursive: true });
    const out = join(process.cwd(), "scripts", "output", `deep-ui-audit-${Date.now()}.json`);
    writeFileSync(out, JSON.stringify({ results, consoleIssues }, null, 2), "utf8");
    console.log(`\nتقرير JSON: ${out}`);
  } catch {
    /* ignore */
  }

  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
