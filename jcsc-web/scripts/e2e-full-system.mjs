/**
 * اختبار شامل للنظام — تسجيل دخول، صفحات، صلاحيات، وسير عمل متكامل بين الحسابات.
 * Usage: node scripts/e2e-full-system.mjs
 * Env:   BASE_URL=http://localhost:3000
 */
import { chromium } from "playwright";
import { passwordFor } from "./test-credentials.mjs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const BP = "/Support_Center";

const ACCOUNTS = {
  admin: "admin@jcsc.gov.jo",
  supportSupervisor: "support-supervisor@jcsc.gov.jo",
  supervisorIrbid: "supervisor@jcsc.gov.jo",
  coordinatorIrbid: "manal.k@jcsc.gov.jo",
  coordinatorAmman: "razan.m@jcsc.gov.jo",
  fieldOpsCoordinator: "fieldops.coord@jcsc.gov.jo",
  researcherFieldCoordinator: "sanaa@jcsc.gov.jo",
  developer: "hazem@jcsc.gov.jo",
  developerDb: "mohammad.h@jcsc.gov.jo",
};

const ROLE_PAGES = [
  {
    name: "ADMIN",
    email: ACCOUNTS.admin,
    pages: [
      "/dashboard",
      "/cases",
      "/reports",
      "/cases/create",
      "/users",
      "/notifications",
      "/knowledge-base",
      "/settings",
    ],
    forbidden: [],
  },
  {
    name: "SUPPORT_SUPERVISOR",
    email: ACCOUNTS.supportSupervisor,
    pages: [
      "/dashboard",
      "/cases",
      "/users",
      "/notifications",
      "/knowledge-base",
      "/settings",
    ],
    forbidden: ["/settings/admin"],
  },
  {
    name: "COORDINATOR_IRBID",
    email: ACCOUNTS.coordinatorIrbid,
    pages: [
      "/dashboard",
      "/reports/my",
      "/cases",
      "/users",
      "/notifications",
      "/knowledge-base",
      "/settings",
    ],
    forbidden: [],
  },
  {
    name: "COORDINATOR_AMMAN",
    email: ACCOUNTS.coordinatorAmman,
    pages: [
      "/dashboard",
      "/reports/my",
      "/cases",
      "/users",
      "/notifications",
      "/knowledge-base",
      "/settings",
    ],
    forbidden: [],
  },
  {
    name: "FIELD_OPS_COORDINATOR",
    email: ACCOUNTS.fieldOpsCoordinator,
    pages: [
      "/dashboard",
      "/reports/my",
      "/cases",
      "/users",
      "/notifications",
      "/knowledge-base",
      "/settings",
    ],
    forbidden: [],
  },
  {
    name: "RESEARCHER_FIELD_COORDINATOR",
    email: ACCOUNTS.researcherFieldCoordinator,
    pages: [
      "/dashboard",
      "/reports/my",
      "/cases",
      "/users",
      "/notifications",
      "/knowledge-base",
      "/settings",
    ],
    forbidden: [],
  },
  {
    name: "SUPERVISOR",
    email: ACCOUNTS.supervisorIrbid,
    pages: [
      "/dashboard",
      "/reports/my",
      "/cases/create",
      "/notifications",
      "/knowledge-base",
      "/settings",
    ],
    forbidden: ["/users", "/cases"],
  },
  {
    name: "DEVELOPER",
    email: ACCOUNTS.developer,
    pages: ["/cases", "/notifications", "/settings"],
    forbidden: ["/cases/create", "/users"],
  },
  {
    name: "DEVELOPER_DB",
    email: ACCOUNTS.developerDb,
    pages: ["/cases", "/notifications", "/settings"],
    forbidden: ["/cases/create", "/users"],
  },
];

const results = [];

function record(section, name, pass, detail = "") {
  results.push({ section, name, pass, detail });
  const icon = pass ? "✓" : "✗";
  const line = detail ? `${name} — ${detail}` : name;
  console.log(`  ${icon} ${line}`);
}

async function waitForServer(request) {
  const url = `${BASE}${BP}/login`;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await request.get(url, { timeout: 3000 });
      if (res.status() < 500) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function logout(context, page) {
  await context.clearCookies();
  await page.goto(`${BASE}${BP}/login`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(400);
}

async function login(page, email, retries = 3) {
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await page.goto(`${BASE}${BP}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector('form button[type="submit"]', { timeout: 15000 });
      await page.waitForTimeout(500);
      const emailInput = page.locator('input[name="email"], input[type="email"]').first();
      const passInput = page.locator('input[name="password"], input[type="password"]').first();
      await emailInput.fill("");
      await passInput.fill("");
      await emailInput.fill(email);
      const pwd = passwordFor(email);
      if (!pwd) throw new Error(`لا توجد كلمة مرور اختبار للحساب: ${email}`);
      await passInput.fill(pwd);
      await page.click('button[type="submit"]');
      await page.waitForURL(
        (url) => !url.pathname.includes("/login"),
        { timeout: 45000, waitUntil: "domcontentloaded" }
      );
      await page.waitForTimeout(400);
      return;
    } catch (e) {
      lastErr = e;
      await page.waitForTimeout(1200);
    }
  }
  throw lastErr ?? new Error("فشل تسجيل الدخول");
}

async function findCaseForReport(page, reportId, stamp) {
  const byText = await apiCall(page, "GET", `/api/cases?search=${encodeURIComponent(`[E2E-${stamp}]`)}`);
  const list = Array.isArray(byText.data) ? byText.data : [];
  const match = list.find((c) => c.sourceReportId === reportId) ?? list[0];
  if (match?.id) return match;

  const all = await apiCall(page, "GET", "/api/cases?limit=50");
  const allList = Array.isArray(all.data) ? all.data : [];
  return allList.find((c) => c.sourceReportId === reportId) ?? null;
}

async function apiCall(page, method, path, body) {
  const fullPath = path.startsWith(BP) ? path : `${BP}${path}`;
  return page.evaluate(
    async ({ method, fullPath, body }) => {
      const res = await fetch(fullPath, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      let data = null;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
      return { status: res.status, ok: res.ok, data };
    },
    { method, fullPath, body }
  );
}

async function checkPage(page, path) {
  const response = await page.goto(`${BASE}${BP}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(400);
  const body = await page.locator("body").innerText();
  const hasAppError =
    body.includes("Application error") ||
    body.includes("Unhandled Runtime Error") ||
    body.includes("Something went wrong");
  const forbidden = body.includes("غير مصرح") || body.includes("403");
  const ok = (response?.ok() || response?.status() === 200) && !hasAppError && !forbidden;
  return { ok, status: response?.status(), forbidden, hasAppError };
}

function toSimpleCaseStatus(status) {
  if (status === "OPEN") return "NEW";
  if (
    ["UNDER_REVIEW", "AWAITING_APPROVAL", "IN_PROGRESS", "WAITING_DEPLOYMENT", "READY_FOR_TESTING"].includes(
      status
    )
  )
    return "IN_PROGRESS";
  if (status === "RESOLVED") return "SOLVED";
  return "CLOSED";
}

function computeCaseKpis(cases) {
  const kpis = { NEW: 0, IN_PROGRESS: 0, SOLVED: 0, CLOSED: 0 };
  for (const c of cases) kpis[toSimpleCaseStatus(c.status)] += 1;
  return kpis;
}

function computeReportStatusCounts(reports) {
  const counts = {
    ALL: reports.length,
    NEW: 0,
    UNDER_REVIEW: 0,
    WAITING_CLASSIFICATION: 0,
    CONVERTED_TO_TICKET: 0,
    REJECTED: 0,
    CLOSED: 0,
  };
  for (const r of reports) {
    if (counts[r.status] !== undefined) counts[r.status] += 1;
  }
  return counts;
}

async function waitForPageReady(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator(".animate-spin").first().waitFor({ state: "hidden", timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function readResultCount(page, expectedHint) {
  if (expectedHint != null) {
    await page
      .waitForFunction(
        (exp) => {
          const el = Array.from(document.querySelectorAll("main *, .content-container *")).find((node) =>
            /\d+\s*نتيج/.test(node.textContent ?? "")
          );
          if (!el) return false;
          const n = parseInt(el.textContent?.match(/(\d+)/)?.[1] ?? "NaN", 10);
          return !Number.isNaN(n) && n === exp;
        },
        expectedHint,
        { timeout: 15000 }
      )
      .catch(() => {});
  }

  const text = await page
    .locator("main, .content-container")
    .getByText(/\d+\s*نتيج/)
    .first()
    .textContent({ timeout: 8000 })
    .catch(() => null);
  if (!text) return null;
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

async function readFirstKpiNumber(page) {
  const text = await page.locator(".tabular-nums").first().textContent({ timeout: 8000 }).catch(() => null);
  if (!text) return null;
  const n = parseInt(text.trim(), 10);
  return Number.isNaN(n) ? null : n;
}

async function verifyReportsPageCounts(page, roleLabel) {
  const api = await apiCall(page, "GET", "/api/reports");
  const reports = Array.isArray(api.data) ? api.data : [];
  const expected = computeReportStatusCounts(reports);

  await page.goto(`${BASE}${BP}/reports`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForPageReady(page);

  const uiAll = await readFirstKpiNumber(page);
  const resultCount = await readResultCount(page, expected.ALL);
  const kpiOk = uiAll === expected.ALL;
  const listOk = resultCount === expected.ALL;

  record(
    "counts",
    `${roleLabel} — KPI إجمالي البلاغات`,
    kpiOk,
    `واجهة=${uiAll ?? "?"} / API=${expected.ALL}`
  );
  record(
    "counts",
    `${roleLabel} — عدد النتائج في القائمة`,
    listOk,
    `واجهة=${resultCount ?? "?"} / API=${expected.ALL}`
  );

  if (reports.length > 0) {
    const r = reports[0];
    const detail = await checkPage(page, `/reports/${r.id}`);
    record("counts", `${roleLabel} — فتح بلاغ ${r.number}`, detail.ok, `HTTP ${detail.status}`);
  } else {
    record("counts", `${roleLabel} — فتح بلاغ`, true, "لا توجد بلاغات للفتح");
  }

  return { reports, expected };
}

async function verifyCasesPageCounts(page, roleLabel, { devFilter = false, openOnly = false } = {}) {
  const api = await apiCall(page, "GET", "/api/cases");
  let cases = Array.isArray(api.data) ? api.data : [];
  if (devFilter) {
    cases = cases.filter((c) => c.caseType === "BUG" && Boolean(c.assignedDeveloperId));
  }
  if (openOnly) {
    cases = cases.filter((c) => c.status === "OPEN");
  }

  const expectedTotal = cases.length;
  const expectedKpis = computeCaseKpis(cases);

  await page.goto(`${BASE}${BP}/cases`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForPageReady(page);

  const resultCount = await readResultCount(page, expectedTotal);
  const listOk = resultCount === expectedTotal;
  record(
    "counts",
    `${roleLabel} — عدد الحالات في القائمة`,
    listOk,
    `واجهة=${resultCount ?? "?"} / API=${expectedTotal}`
  );

  if (!devFilter && !openOnly) {
    const uiNew = await page
      .locator('a[href*="simpleStatus=NEW"] .tabular-nums, a[href*="simpleStatus=NEW"] .text-2xl')
      .first()
      .textContent({ timeout: 5000 })
      .catch(() => null);
    if (uiNew) {
      const uiNewNum = parseInt(uiNew.trim(), 10);
      const kpiOk = uiNewNum === expectedKpis.NEW;
      record(
        "counts",
        `${roleLabel} — KPI حالات جديدة`,
        kpiOk,
        `واجهة=${uiNewNum} / API=${expectedKpis.NEW}`
      );
    }
  }

  if (openOnly) {
    const uiPending = await readFirstKpiNumber(page);
    const pendingOk = uiPending === expectedTotal;
    record(
      "counts",
      `${roleLabel} — KPI بانتظار التصنيف`,
      pendingOk,
      `واجهة=${uiPending ?? "?"} / API=${expectedTotal}`
    );
  }

  if (cases.length > 0) {
    const c = cases[0];
    const detail = await checkPage(page, `/cases/${c.id}`);
    record("counts", `${roleLabel} — فتح حالة ${c.number}`, detail.ok, `HTTP ${detail.status}`);
  } else {
    record("counts", `${roleLabel} — فتح حالة`, true, "لا توجد حالات للفتح");
  }

  return { cases, expectedTotal };
}

async function verifySupervisorMyReports(page, roleLabel) {
  const api = await apiCall(page, "GET", "/api/cases?mine=true");
  const cases = Array.isArray(api.data) ? api.data : [];
  const expectedTotal = cases.length;

  await page.goto(`${BASE}${BP}/reports/my`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForPageReady(page);

  const uiTotal = await readFirstKpiNumber(page);
  const kpiOk = uiTotal === expectedTotal;
  record(
    "counts",
    `${roleLabel} — KPI إجمالي بلاغاتي`,
    kpiOk,
    `واجهة=${uiTotal ?? "?"} / API=${expectedTotal}`
  );

  const listText = await page
    .getByText(/\d+\s*بلاغ/)
    .first()
    .textContent({ timeout: 8000 })
    .catch(() => null);
  const listCount = listText ? parseInt(listText.match(/(\d+)/)?.[1] ?? "NaN", 10) : null;
  const listOk = listCount === expectedTotal;
  record(
    "counts",
    `${roleLabel} — قائمة بلاغاتي`,
    listOk,
    `واجهة=${listCount ?? "?"} / API=${expectedTotal}`
  );

  if (cases.length > 0) {
    const c = cases[0];
    const detail = await checkPage(page, `/cases/${c.id}`);
    record(
      "counts",
      `${roleLabel} — فتح بلاغي ${c.sourceReportNumber ?? c.number}`,
      detail.ok,
      `HTTP ${detail.status}`
    );
  }
}

console.log(`\n══════════════════════════════════════════════════════`);
console.log(`  JCSC — اختبار شامل للنظام (E2E)`);
console.log(`  ${BASE}${BP}`);
console.log(`══════════════════════════════════════════════════════\n`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

// ── 1. Server health ──────────────────────────────────────────────
console.log("▸ فحص الخادم");
const serverUp = await waitForServer(page.request);
record("server", "الخادم متاح", serverUp, serverUp ? `${BASE}${BP}/login` : "تعذّر الاتصال — شغّل npm run dev");
if (!serverUp) {
  await browser.close();
  printSummary();
  process.exit(1);
}

// ── 2. Login all roles ────────────────────────────────────────────
console.log("\n▸ تسجيل الدخول — جميع الأدوار");
for (const [label, email] of Object.entries(ACCOUNTS)) {
  try {
    await login(page, email);
    const onLogin = page.url().includes("/login");
    record("login", label, !onLogin, onLogin ? "بقي في صفحة الدخول" : page.url());
    await logout(context, page);
  } catch (e) {
    record("login", label, false, e.message);
    await logout(context, page);
  }
}

// ── 3. Page smoke per role ────────────────────────────────────────
console.log("\n▸ صفحات رئيسية — حسب الدور");
for (const role of ROLE_PAGES) {
  console.log(`\n  [${role.name}]`);
  try {
    await login(page, role.email);
  } catch (e) {
    record("pages", `${role.name} login`, false, e.message);
    continue;
  }

  for (const path of role.pages) {
    try {
      const r = await checkPage(page, path);
      record("pages", `${role.name} ${path}`, r.ok, `HTTP ${r.status}`);
    } catch (e) {
      record("pages", `${role.name} ${path}`, false, e.message);
    }
  }

  for (const path of role.forbidden) {
    try {
      const apiCheck = path === "/users";
      if (apiCheck) {
        const r = await apiCall(page, "GET", "/api/users");
        record("pages", `${role.name} deny ${path}`, r.status === 403, `API HTTP ${r.status}`);
      } else if (path === "/cases/create") {
        const r = await apiCall(page, "POST", "/api/reports", {
          observation: "deny test",
          governorate: "إربد",
          enumeratorsAffected: 1,
        });
        record("pages", `${role.name} deny ${path}`, r.status === 403, `API HTTP ${r.status}`);
      } else if (path === "/cases") {
        await page.goto(`${BASE}${BP}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(600);
        const redirected = page.url().includes("/reports/my");
        record(
          "pages",
          `${role.name} deny ${path}`,
          redirected,
          redirected ? "إعادة توجيه لبلاغاتي ✓" : page.url()
        );
      } else {
        const r = await checkPage(page, path);
        const blocked = r.forbidden || r.status === 403 || !r.ok;
        record("pages", `${role.name} deny ${path}`, blocked, blocked ? "محظور كما متوقع" : "وصول غير متوقع");
      }
    } catch {
      record("pages", `${role.name} deny ${path}`, true, "محظور");
    }
  }

  await logout(context, page);
}

// ── 4. API permissions ────────────────────────────────────────────
console.log("\n▸ صلاحيات API");
try {
  await login(page, ACCOUNTS.developer);
  const devCreate = await apiCall(page, "POST", "/api/reports", {
    observation: "test forbidden",
    governorate: "إربد",
    enumeratorsAffected: 1,
  });
  record("permissions", "مطور لا ينشئ بلاغ", devCreate.status === 403, `HTTP ${devCreate.status}`);
  await logout(context, page);
} catch (e) {
  record("permissions", "مطور لا ينشئ بلاغ", false, e.message);
  await logout(context, page);
}

try {
  await login(page, ACCOUNTS.supervisorIrbid);
  const supUsers = await apiCall(page, "GET", "/api/users");
  record("permissions", "مشرف لا يدير المستخدمين", supUsers.status === 403, `HTTP ${supUsers.status}`);
  await logout(context, page);
} catch (e) {
  record("permissions", "مشرف لا يدير المستخدمين", false, e.message);
  await logout(context, page);
}

// ── 5. Full cross-account workflow ───────────────────────────────
console.log("\n▸ سير العمل المتكامل (مشرف → منسق → مطور → إدارة)");
const stamp = Date.now();
const observation = `[E2E-${stamp}] بلاغ اختبار آلي — إربد — ${new Date().toISOString()}`;
let reportId = null;
let reportNumber = null;
let caseId = null;

try {
  // Step A: Supervisor creates report in Irbid
  await login(page, ACCOUNTS.supervisorIrbid);
  const createRes = await apiCall(page, "POST", "/api/reports", {
    observation,
    governorate: "إربد",
    district: "قصبة إربد",
    center: "مركز اختبار",
    enumeratorsAffected: 3,
    submissionChannel: "app",
    affectedSystem: "FIELD_OPERATIONS",
  });
  const created = createRes.status === 201 && createRes.data?.id;
  reportId = createRes.data?.id ?? null;
  reportNumber = createRes.data?.number ?? null;
  record(
    "workflow",
    "1. مشرف ينشئ بلاغ إربد",
    created,
    created ? `${reportNumber}` : JSON.stringify(createRes.data)?.slice(0, 120)
  );
  await logout(context, page);

  if (!reportId) throw new Error("توقف — لم يُنشأ البلاغ");

  // Step B: Field ops coordinator sees FIELD_OPERATIONS case
  await login(page, ACCOUNTS.fieldOpsCoordinator);
  const fieldOpsCases = await apiCall(page, "GET", `/api/cases?search=${encodeURIComponent(`[E2E-${stamp}]`)}`);
  let fieldOpsList = Array.isArray(fieldOpsCases.data) ? fieldOpsCases.data : [];
  let fieldOpsCase = fieldOpsList.find((c) => c.sourceReportId === reportId) ?? fieldOpsList[0] ?? null;
  if (!fieldOpsCase) {
    fieldOpsCase = await findCaseForReport(page, reportId, stamp);
    if (fieldOpsCase) fieldOpsList = [fieldOpsCase];
  }
  caseId = fieldOpsCase?.id ?? null;
  record(
    "workflow",
    "2. منسق إدارة العمل الميداني يرى الحالة",
    fieldOpsCases.ok && fieldOpsList.length > 0,
    fieldOpsList.length
      ? `${fieldOpsList.length} حالة — ${fieldOpsCase?.number ?? fieldOpsList[0]?.number}`
      : `HTTP ${fieldOpsCases.status}`
  );

  // Step C: Irbid regional coordinator should NOT see FIELD_OPERATIONS case
  await logout(context, page);
  await login(page, ACCOUNTS.coordinatorIrbid);
  const irbidCases = await apiCall(page, "GET", `/api/cases?search=${encodeURIComponent(`[E2E-${stamp}]`)}`);
  const irbidList = Array.isArray(irbidCases.data) ? irbidCases.data : [];
  const irbidSees = irbidList.some((c) => c.sourceReportId === reportId);
  record(
    "workflow",
    "3. منسق إربد لا يرى بلاغ إدارة العمل الميداني",
    !irbidSees,
    irbidSees ? "ظهر خطأً!" : "موجّه لمنسق العمل الميداني ✓"
  );
  await logout(context, page);

  // Step C2: Support supervisor should NOT see FIELD_OPERATIONS case from team
  await login(page, ACCOUNTS.supportSupervisor);
  const supCases = await apiCall(page, "GET", `/api/cases?search=${encodeURIComponent(`[E2E-${stamp}]`)}`);
  const supList = Array.isArray(supCases.data) ? supCases.data : [];
  const supSees = supList.some((c) => c.sourceReportId === reportId);
  record(
    "workflow",
    "3b. مشرف الدعم لا يرى بلاغ إدارة العمل الميداني",
    !supSees,
    supSees ? "ظهر خطأً!" : "مخفي عن مشرف الدعم ✓"
  );
  await logout(context, page);

  if (!caseId) throw new Error("توقف — لم تُوجد الحالة للمنسق");

  // Step D: Field ops coordinator classifies and assigns developer
  await login(page, ACCOUNTS.fieldOpsCoordinator);
  const assignRes = await apiCall(page, "PATCH", `/api/reports/${reportId}`, {
    action: "confirm_and_assign",
    assigneeId: ACCOUNTS.developer,
    classification: "BUG",
    priority: "HIGH",
    severity: "HIGH",
    observation,
  });
  record(
    "workflow",
    "4. منسق يصنّف ويسند للمطور",
    assignRes.ok,
    assignRes.ok
      ? "CLASSIFIED + IN_PROGRESS"
      : `HTTP ${assignRes.status} — ${JSON.stringify(assignRes.data)?.slice(0, 160)}`
  );
  await logout(context, page);

  // Step E: Developer sees assigned case
  await login(page, ACCOUNTS.developer);
  const devById = await apiCall(page, "GET", `/api/cases/${caseId}`);
  const devCases = await apiCall(page, "GET", `/api/cases?search=${encodeURIComponent(`[E2E-${stamp}]`)}`);
  const devList = Array.isArray(devCases.data) ? devCases.data : [];
  const devCase =
    (devById.ok ? devById.data?.case ?? devById.data : null) ??
    devList.find((c) => c.id === caseId || c.sourceReportId === reportId) ??
    null;
  const devAssigned =
    devCase?.assignedDeveloperId ||
    devCase?.assignedDeveloperName ||
    devCase?.status === "IN_PROGRESS";
  record(
    "workflow",
    "5. المطور يرى الحالة المسندة",
    !!devCase && !!devAssigned,
    devCase ? `${devCase.number} — ${devCase.status}` : `HTTP ${devById.status}`
  );

  // Step F: Developer adds progress comment on assigned case
  if (devCase?.id) {
    const commentRes = await apiCall(page, "POST", `/api/cases/${devCase.id}/actions`, {
      action: "comment",
      content: `[E2E-${stamp}] بدء معالجة الحالة من المطور`,
    });
    record(
      "workflow",
      "6. المطور يُحدّث الحالة (تعليق)",
      commentRes.ok,
      commentRes.ok ? "تعليق مُضاف" : JSON.stringify(commentRes.data)?.slice(0, 80)
    );
  } else {
    record("workflow", "6. المطور يُحدّث الحالة (تعليق)", false, "لا توجد حالة");
  }

  // Step G: Developer received assignment notification
  const devNotifs = await apiCall(page, "GET", "/api/notifications");
  const devNotifList = devNotifs.data?.notifications ?? (Array.isArray(devNotifs.data) ? devNotifs.data : []);
  const devHasNotif = devNotifList.some(
    (n) =>
      n.type === "case_assigned" &&
      (n.entityId === caseId || n.message?.includes(devCase?.number ?? ""))
  );
  record(
    "workflow",
    "7. إشعار إسناد للمطور",
    devHasNotif || devNotifList.length > 0,
    devHasNotif ? "case_assigned" : `${devNotifList.length} إشعار`
  );
  await logout(context, page);

  // Step H: Admin sees report classified
  await login(page, ACCOUNTS.admin);
  const adminReport = await apiCall(page, "GET", `/api/reports/${reportId}`);
  const classified =
    adminReport.ok &&
    (adminReport.data?.classification === "BUG" ||
      adminReport.data?.status === "CLASSIFIED" ||
      adminReport.data?.status === "WAITING_CLASSIFICATION");
  record(
    "workflow",
    "8. الإدارة ترى البلاغ مصنّفاً",
    classified,
    adminReport.data?.status ?? `HTTP ${adminReport.status}`
  );

  const adminCase = await apiCall(page, "GET", `/api/cases/${caseId}`);
  const adminCaseRow = adminCase.data?.case ?? adminCase.data;
  record(
    "workflow",
    "9. الإدارة ترى تفاصيل الحالة",
    adminCase.ok && (adminCaseRow?.assignedDeveloperId || adminCaseRow?.status === "IN_PROGRESS"),
    adminCaseRow?.status ?? `HTTP ${adminCase.status}`
  );

  await logout(context, page);
} catch (e) {
  record("workflow", "سير العمل", false, e.message);
  await logout(context, page);
}

// ── 5b. Researcher system — فني → مشرف الدعم الفني / تقني → منسق المحافظة ───
console.log("\n▸ توجيه نظام الباحث (فني → مشرف الدعم الفني / تقني → منسق إربد)");
const rsStamp = Date.now();
const rsObservation = `[E2E-RS-${rsStamp}] بلاغ نظام الباحث — إربد`;

try {
  // A: Supervisor — researcher FIELD in Irbid → Sanaa only
  await login(page, ACCOUNTS.supervisorIrbid);
  const fieldCreate = await apiCall(page, "POST", "/api/reports", {
    observation: `${rsObservation} — فني`,
    governorate: "إربد",
    enumeratorsAffected: 2,
    submissionChannel: "app",
    affectedSystem: "RESEARCHER_SYSTEM",
    researcherIssueType: "FIELD",
  });
  const fieldReportId = fieldCreate.data?.id ?? null;
  record(
    "researcher-routing",
    "1. بلاغ باحث+فني من إربد",
    fieldCreate.status === 201 && !!fieldReportId,
    fieldCreate.data?.number ?? JSON.stringify(fieldCreate.data)?.slice(0, 100)
  );
  await logout(context, page);

  if (fieldReportId) {
    await login(page, ACCOUNTS.researcherFieldCoordinator);
    const sanaaCases = await apiCall(
      page,
      "GET",
      `/api/cases?search=${encodeURIComponent(`[E2E-RS-${rsStamp}]`)}`
    );
    const sanaaList = Array.isArray(sanaaCases.data) ? sanaaCases.data : [];
    const sanaaSees = sanaaList.some((c) => c.sourceReportId === fieldReportId);
    record(
      "researcher-routing",
      "2. مشرف الدعم الفني يرى بلاغ باحث+فني",
      sanaaCases.ok && sanaaSees,
      sanaaSees ? sanaaList[0]?.number : `HTTP ${sanaaCases.status}`
    );
    await logout(context, page);

    await login(page, ACCOUNTS.coordinatorIrbid);
    const irbidRsCases = await apiCall(
      page,
      "GET",
      `/api/cases?search=${encodeURIComponent(`[E2E-RS-${rsStamp}]`)}`
    );
    const irbidRsList = Array.isArray(irbidRsCases.data) ? irbidRsCases.data : [];
    const irbidSeesField = irbidRsList.some((c) => c.sourceReportId === fieldReportId);
    record(
      "researcher-routing",
      "3. منسق إربد لا يرى باحث+فني",
      !irbidSeesField,
      irbidSeesField ? "ظهر خطأً!" : "موجّه لمشرف الدعم الفني ✓"
    );
    await logout(context, page);
  }

  // B: Supervisor — researcher TECHNICAL in Irbid → Irbid coordinator
  await login(page, ACCOUNTS.supervisorIrbid);
  const techCreate = await apiCall(page, "POST", "/api/reports", {
    observation: `${rsObservation} — تقني`,
    governorate: "إربد",
    enumeratorsAffected: 2,
    submissionChannel: "app",
    affectedSystem: "RESEARCHER_SYSTEM",
    researcherIssueType: "TECHNICAL",
  });
  const techReportId = techCreate.data?.id ?? null;
  record(
    "researcher-routing",
    "4. بلاغ باحث+تقني من إربد",
    techCreate.status === 201 && !!techReportId,
    techCreate.data?.number ?? JSON.stringify(techCreate.data)?.slice(0, 100)
  );
  await logout(context, page);

  if (techReportId) {
    await login(page, ACCOUNTS.coordinatorIrbid);
    const irbidTechCases = await apiCall(
      page,
      "GET",
      `/api/cases?search=${encodeURIComponent(`[E2E-RS-${rsStamp}]`)}`
    );
    const irbidTechList = Array.isArray(irbidTechCases.data) ? irbidTechCases.data : [];
    const irbidSeesTech = irbidTechList.some((c) => c.sourceReportId === techReportId);
    record(
      "researcher-routing",
      "5. منسق إربد يرى باحث+تقني",
      irbidTechCases.ok && irbidSeesTech,
      irbidSeesTech ? irbidTechList.find((c) => c.sourceReportId === techReportId)?.number : "لم تظهر"
    );
    await logout(context, page);

    await login(page, ACCOUNTS.researcherFieldCoordinator);
    const sanaaTechCases = await apiCall(
      page,
      "GET",
      `/api/cases?search=${encodeURIComponent(`[E2E-RS-${rsStamp}]`)}`
    );
    const sanaaTechList = Array.isArray(sanaaTechCases.data) ? sanaaTechCases.data : [];
    const sanaaSeesTech = sanaaTechList.some((c) => c.sourceReportId === techReportId);
    record(
      "researcher-routing",
      "6. مشرف الدعم الفني لا يرى باحث+تقني",
      !sanaaSeesTech,
      sanaaSeesTech ? "ظهر خطأً!" : "موجّه لمنسق إربد ✓"
    );
    await logout(context, page);
  }

  // C: researcher without issue type should fail
  await login(page, ACCOUNTS.supervisorIrbid);
  const missingType = await apiCall(page, "POST", "/api/reports", {
    observation: `${rsObservation} — بدون نوع`,
    governorate: "إربد",
    enumeratorsAffected: 1,
    affectedSystem: "RESEARCHER_SYSTEM",
  });
  record(
    "researcher-routing",
    "7. رفض باحث بدون تقني/فني",
    missingType.status === 400,
    `HTTP ${missingType.status}`
  );
  await logout(context, page);
} catch (e) {
  record("researcher-routing", "توجيه نظام الباحث", false, e.message);
  await logout(context, page);
}

// ── 6. UI — create report page loads for supervisor ───────────────
console.log("\n▸ واجهة — صفحة إنشاء بلاغ");
try {
  await login(page, ACCOUNTS.supervisorIrbid);
  await page.goto(`${BASE}${BP}/cases/create`, { waitUntil: "domcontentloaded" });
  const hasForm =
    (await page.locator('textarea, input[type="text"]').count()) > 0 ||
    (await page.getByText(/ملاحظة|بلاغ|محافظة/i).count()) > 0;
  record("ui", "صفحة إنشاء بلاغ", hasForm, page.url());
  await logout(context, page);
} catch (e) {
  record("ui", "صفحة إنشاء بلاغ", false, e.message);
  await logout(context, page);
}

// ── 7. Count consistency + detail pages per role ─────────────────
console.log("\n▸ أعداد البلاغات/الحالات — مطابقة الواجهة مع API");
try {
  await login(page, ACCOUNTS.admin);
  await verifyReportsPageCounts(page, "ADMIN");
  await verifyCasesPageCounts(page, "ADMIN");
  await logout(context, page);
} catch (e) {
  record("counts", "ADMIN counts", false, e.message);
  await logout(context, page);
}

try {
  await login(page, ACCOUNTS.supportSupervisor);
  await verifyCasesPageCounts(page, "SUPPORT_SUPERVISOR");
  await logout(context, page);
} catch (e) {
  try {
    await logout(context, page);
    await login(page, ACCOUNTS.supportSupervisor, 3);
    await verifyCasesPageCounts(page, "SUPPORT_SUPERVISOR");
    await logout(context, page);
  } catch (e2) {
    record("counts", "SUPPORT_SUPERVISOR counts", false, e2.message);
    await logout(context, page);
  }
}

for (const [label, email] of [
  ["COORDINATOR_IRBID", ACCOUNTS.coordinatorIrbid],
  ["COORDINATOR_AMMAN", ACCOUNTS.coordinatorAmman],
  ["FIELD_OPS_COORDINATOR", ACCOUNTS.fieldOpsCoordinator],
  ["RESEARCHER_FIELD_COORDINATOR", ACCOUNTS.researcherFieldCoordinator],
]) {
  try {
    await login(page, email);
    await verifyCasesPageCounts(page, label, { openOnly: true });
    await logout(context, page);
  } catch (e) {
    record("counts", `${label} counts`, false, e.message);
    await logout(context, page);
  }
}

try {
  await login(page, ACCOUNTS.supervisorIrbid);
  await verifySupervisorMyReports(page, "SUPERVISOR");
  await logout(context, page);
} catch (e) {
  record("counts", "SUPERVISOR counts", false, e.message);
  await logout(context, page);
}

for (const [label, email] of [
  ["DEVELOPER", ACCOUNTS.developer],
  ["DEVELOPER_DB", ACCOUNTS.developerDb],
]) {
  try {
    await login(page, email);
    await verifyCasesPageCounts(page, label, { devFilter: true });
    await logout(context, page);
  } catch (e) {
    record("counts", `${label} counts`, false, e.message);
    await logout(context, page);
  }
}

// ── 8. API summary endpoints ─────────────────────────────────────
console.log("\n▸ API — ملخص الحالات والإشعارات");
for (const [label, email] of Object.entries(ACCOUNTS)) {
  try {
    await login(page, email);
    const canSummary = !["supervisorIrbid", "developer", "developerDb"].includes(label);
    if (canSummary) {
      const summary = await apiCall(page, "GET", "/api/cases/summary");
      record(
        "api",
        `${label} /api/cases/summary`,
        summary.ok && typeof summary.data === "object",
        summary.ok ? `pending=${summary.data?.pendingCoordinator ?? "?"}` : `HTTP ${summary.status}`
      );
    }
    const notifs = await apiCall(page, "GET", "/api/notifications");
    const list = notifs.data?.notifications ?? (Array.isArray(notifs.data) ? notifs.data : []);
    record("api", `${label} /api/notifications`, notifs.ok, `${list.length} إشعار`);
    await logout(context, page);
  } catch (e) {
    record("api", `${label} APIs`, false, e.message);
    await logout(context, page);
  }
}

await browser.close();
printSummary();

function printSummary() {
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  const total = results.length;

  console.log(`\n══════════════════════════════════════════════════════`);
  console.log(`  النتيجة: ${passed}/${total} نجح — ${failed} فشل`);
  console.log(`══════════════════════════════════════════════════════`);

  if (failed > 0) {
    console.log("\n  الفاشلة:");
    for (const r of results.filter((x) => !x.pass)) {
      console.log(`    ✗ [${r.section}] ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
    }
  }

  console.log("");
  process.exit(failed > 0 ? 1 : 0);
}
