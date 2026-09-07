/**
 * Smoke test: login as each demo role and hit key pages + APIs.
 * Usage: node scripts/smoke-routes.mjs
 */
import { chromium } from "playwright";
import { passwordFor } from "./test-credentials.mjs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const BP = "/Support_Center";

const ROLES = [
  {
    name: "ADMIN",
    email: "admin@jcsc.gov.jo",
    pages: ["/dashboard", "/cases", "/reports", "/users", "/notifications", "/settings", "/knowledge-base"],
  },
  {
    name: "SUPPORT_SUPERVISOR",
    email: "support-supervisor@jcsc.gov.jo",
    pages: ["/dashboard", "/cases", "/reports", "/users", "/notifications", "/settings"],
  },
  {
    name: "COORDINATOR",
    email: "manal.k@jcsc.gov.jo",
    pages: ["/dashboard", "/cases", "/reports", "/notifications", "/settings", "/knowledge-base"],
  },
  {
    name: "SUPERVISOR",
    email: "supervisor@jcsc.gov.jo",
    pages: ["/dashboard", "/reports/my", "/cases/create", "/notifications", "/settings", "/knowledge-base"],
  },
  {
    name: "DEVELOPER",
    email: "hazem@jcsc.gov.jo",
    pages: ["/cases", "/notifications", "/settings"],
  },
];

async function login(page, email, retries = 3) {
  const pwd = passwordFor(email);
  if (!pwd) throw new Error(`No test password for ${email}`);
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await page.goto(`${BASE}${BP}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector('form button[type="submit"]', { timeout: 15000 });
      const emailInput = page.locator('input[name="email"], input[type="email"]').first();
      const passInput = page.locator('input[name="password"], input[type="password"]').first();
      await emailInput.fill("");
      await passInput.fill("");
      await emailInput.fill(email);
      await passInput.fill(pwd);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 45000,
        waitUntil: "domcontentloaded",
      });
      return;
    } catch (e) {
      lastErr = e;
      await page.waitForTimeout(1000);
    }
  }
  throw lastErr ?? new Error(`Login failed for ${email}`);
}

async function checkPage(page, path) {
  const started = Date.now();
  const response = await page.goto(`${BASE}${BP}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(500);
  const body = await page.locator("body").innerText();
  const ms = Date.now() - started;
  const hasAppError =
    body.includes("Application error") ||
    body.includes("Unhandled Runtime Error") ||
    body.includes("Something went wrong");
  const forbidden = body.includes("غير مصرح بالوصول");
  const ok = response?.ok() && !hasAppError;
  return { path, ms, ok, status: response?.status(), hasAppError, forbidden };
}

async function checkApi(page, path) {
  const started = Date.now();
  const result = await page.evaluate(async (p) => {
    const res = await fetch(p);
    return { status: res.status, ok: res.ok };
  }, `${BP}${path}`);
  return { path, ms: Date.now() - started, ...result };
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

console.log(`\nJCSC smoke test — ${BASE}\n`);

for (const role of ROLES) {
  console.log(`\n=== ${role.name} (${role.email}) ===`);
  try {
    await login(page, role.email);
    console.log(`  logged in → ${page.url()}`);
  } catch (e) {
    console.log(`  LOGIN FAILED: ${e.message}`);
    continue;
  }

  for (const path of role.pages) {
    try {
      const r = await checkPage(page, path);
      const flag = r.ok ? "OK" : r.forbidden ? "FORBIDDEN" : "FAIL";
      console.log(`  [${flag}] ${path} — ${r.ms}ms (HTTP ${r.status})`);
    } catch (e) {
      console.log(`  [ERROR] ${path} — ${e.message}`);
    }
  }

  for (const api of ["/api/cases", "/api/cases/summary", "/api/notifications"]) {
    try {
      const r = await checkApi(page, api);
      console.log(`  [API ${r.ok ? "OK" : "FAIL"}] ${api} — ${r.ms}ms (HTTP ${r.status})`);
    } catch (e) {
      console.log(`  [API ERROR] ${api} — ${e.message}`);
    }
  }

  await page.goto(`${BASE}${BP}/login`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await context.clearCookies();
  await page.waitForTimeout(400);
}

await browser.close();
console.log("\nDone.\n");
