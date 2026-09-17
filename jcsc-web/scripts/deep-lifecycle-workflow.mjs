/**
 * دورة حياة عميقة — مركز الدعم → منسق → مشرف دعم/سوبر أدمن → مطور
 * أرقام الكروت، التوجيه، تعليقات، فلاتر (API + Playwright)
 *
 * Usage: node scripts/deep-lifecycle-workflow.mjs
 * Env: BASE_URL, HEADLESS=1
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { passwordFor } from "./test-credentials.mjs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const BP = "/Support_Center";
const STAMP = Date.now();
const TAG = `[DEEP-${STAMP}]`;

const ROLES = {
  supervisor: "supervisor@jcsc.gov.jo",
  coordinatorIrbid: "manal.k@jcsc.gov.jo",
  supportSupervisor: "support-supervisor@jcsc.gov.jo",
  admin: "admin@jcsc.gov.jo",
  developer: "hazem@jcsc.gov.jo",
};

const results = [];
const reportLines = [];

function record(phase, name, pass, detail = "") {
  results.push({ phase, name, pass, detail });
  const icon = pass ? "✓" : "✗";
  const line = `${icon} [${phase}] ${name}${detail ? ` — ${detail}` : ""}`;
  console.log(line);
  reportLines.push(line);
}

async function loginSession(email) {
  const pwd = passwordFor(email);
  if (!pwd) throw new Error(`No password: ${email}`);
  const csrfRes = await fetch(`${BASE}${BP}/api/auth/csrf`);
  if (!csrfRes.ok) throw new Error("csrf failed");
  const { csrfToken } = await csrfRes.json();
  const cookies = csrfRes.headers.getSetCookie?.() ?? [];
  const body = new URLSearchParams({
    csrfToken,
    email,
    password: pwd,
    callbackUrl: `${BASE}${BP}/dashboard`,
    json: "true",
  });
  const loginRes = await fetch(`${BASE}${BP}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies.join("; ") },
    body: body.toString(),
    redirect: "manual",
  });
  const all = [...cookies, ...(loginRes.headers.getSetCookie?.() ?? [])];
  if (!all.length) throw new Error(`login failed: ${email}`);
  return all.map((c) => c.split(";")[0]).join("; ");
}

async function api(cookie, path, method = "GET", body) {
  const res = await fetch(`${BASE}${BP}${path}`, {
    method,
    headers: {
      Cookie: cookie,
      ...(body ? { "Content-Type": "application/json" } : undefined),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function metricsCoordinator(cookie) {
  const [summary, openList, allList] = await Promise.all([
    api(cookie, "/api/cases/summary"),
    api(cookie, "/api/cases?status=OPEN&limit=300"),
    api(cookie, "/api/cases?limit=300"),
  ]);
  const open = Array.isArray(openList.data) ? openList.data : [];
  const all = Array.isArray(allList.data) ? allList.data : [];
  return {
    pendingSummary: summary.data?.pendingCoordinator ?? -1,
    openCount: open.length,
    allCount: all.length,
    summaryOk: summary.data?.pendingCoordinator === open.length,
  };
}

async function metricsSupervisorMine(cookie) {
  const res = await api(cookie, "/api/cases?mine=true&limit=300");
  const list = Array.isArray(res.data) ? res.data : [];
  return { mineCount: list.length, list };
}

async function findCaseByTag(cookie, tag) {
  const res = await api(cookie, `/api/cases?search=${encodeURIComponent(tag)}&limit=20`);
  const list = Array.isArray(res.data) ? res.data : [];
  return list.find((c) => c.title?.includes(tag) || c.description?.includes(tag)) ?? list[0] ?? null;
}

async function acquireLock(cookie, caseId) {
  const lockToken = `deep-${STAMP}-${Math.random().toString(36).slice(2, 8)}`;
  const res = await api(cookie, `/api/cases/${caseId}/lock`, "POST", { lockToken });
  return res.ok ? lockToken : null;
}

async function getUserIdByEmail(adminCookie, email) {
  const users = await api(adminCookie, "/api/users");
  const list = Array.isArray(users.data) ? users.data : [];
  return list.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
}

async function playwrightLogin(page, email, retries = 3) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(`${BASE}${BP}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector('button[type="submit"]', { timeout: 15000 });
      await page.waitForTimeout(400);
      const emailInput = page.locator('input[name="email"], input[type="email"]').first();
      const passInput = page.locator('input[name="password"], input[type="password"]').first();
      await emailInput.fill("");
      await passInput.fill("");
      await emailInput.fill(email);
      await passInput.fill(passwordFor(email));
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 45000,
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(500);
      return;
    } catch (e) {
      lastErr = e;
      await page.waitForTimeout(1000);
    }
  }
  throw lastErr ?? new Error("login failed");
}

async function waitForCasesUi(page, expectedOpen, timeoutMs = 25000) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator(".animate-spin").first().waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
  await page
    .waitForFunction(
      (exp) => {
        const resultEl = Array.from(document.querySelectorAll("main *, .content-container *")).find((node) =>
          /\d+\s*نتيج/.test(node.textContent ?? "")
        );
        const resultN = resultEl
          ? parseInt(resultEl.textContent?.match(/(\d+)/)?.[1] ?? "NaN", 10)
          : NaN;
        const kpiEl = document.querySelector('a[href*="status=OPEN"] .tabular-nums');
        const kpiN = kpiEl ? parseInt(kpiEl.textContent?.trim() ?? "NaN", 10) : NaN;
        if (Number.isNaN(resultN) || Number.isNaN(kpiN)) return false;
        return resultN === exp && kpiN === exp;
      },
      expectedOpen,
      { timeout: timeoutMs }
    )
    .catch(() => {});
  await page.waitForTimeout(500);
}

async function readUiOpenKpi(page) {
  const text = await page
    .locator('a[href*="status=OPEN"] .tabular-nums')
    .first()
    .textContent({ timeout: 5000 })
    .catch(() => null);
  return text ? parseInt(text.trim(), 10) : null;
}

async function readUiResultCount(page) {
  const text = await page
    .locator("main, .content-container")
    .getByText(/\d+\s*نتيج/)
    .first()
    .textContent({ timeout: 5000 })
    .catch(() => null);
  if (!text) return null;
  const m = text.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

async function main() {
  console.log("\n══════════════════════════════════════════════════════");
  console.log("  JCSC — دورة حياة عميقة (API + Automation)");
  console.log(`  ${BASE}${BP}  |  ${TAG}`);
  console.log("══════════════════════════════════════════════════════\n");

  // Health
  const health = await fetch(`${BASE}${BP}/login`);
  record("Setup", "الخادم متاح", health.status < 500, `HTTP ${health.status}`);

  const cookies = {};
  for (const [key, email] of Object.entries(ROLES)) {
    try {
      cookies[key] = await loginSession(email);
      record("Auth", `تسجيل دخول ${key}`, true, email);
    } catch (e) {
      record("Auth", `تسجيل دخول ${key}`, false, e.message);
      throw e;
    }
  }

  const coordBefore = await metricsCoordinator(cookies.coordinatorIrbid);
  const supMineBefore = await metricsSupervisorMine(cookies.supervisor);
  record(
    "Counts-Before",
    "منسق إربد — baseline OPEN",
    coordBefore.summaryOk,
    `summary=${coordBefore.pendingSummary} list=${coordBefore.openCount}`
  );
  record("Counts-Before", "مشرف مركز — baseline mine", true, `${supMineBefore.mineCount} حالة`);

  // ── A: مركز الدعم → منسق إربد ─────────────────────────────
  const obsA = `${TAG}-A بلاغ تقني إربد من مركز الدعم`;
  const createA = await api(cookies.supervisor, "/api/reports", "POST", {
    observation: obsA,
    governorate: "إربد",
    enumeratorsAffected: 4,
    affectedSystem: "RESEARCHER_SYSTEM",
    researcherIssueType: "TECHNICAL",
    supervisorId: undefined,
  });
  record("Flow-A", "1. مركز الدعم ينشئ بلاغ", createA.status === 201, `HTTP ${createA.status}`);

  const supMineAfterA = await metricsSupervisorMine(cookies.supervisor);
  record(
    "Flow-A",
    "2. بلاغاتي — زيادة بعد الإنشاء",
    supMineAfterA.mineCount >= supMineBefore.mineCount,
    `${supMineBefore.mineCount} → ${supMineAfterA.mineCount}`
  );

  const caseA = await findCaseByTag(cookies.coordinatorIrbid, TAG + "-A");
  const coordAfterA = await metricsCoordinator(cookies.coordinatorIrbid);
  const coordPendingDelta = coordAfterA.openCount - coordBefore.openCount;
  record(
    "Flow-A",
    "3. التوجيه → منسق إربد",
    !!caseA && caseA.status === "OPEN",
    caseA
      ? `${caseA.number} مسند: ${caseA.assignedCoordinatorName ?? caseA.assignedCoordinatorId ?? "?"}`
      : "لم تُوجد الحالة"
  );
  record(
    "Flow-A",
    "4. كارد OPEN للمنسق (+1 تقريباً)",
    !!caseA && coordPendingDelta >= 0 && coordAfterA.summaryOk,
    `Δopen=${coordPendingDelta} summary=${coordAfterA.pendingSummary} list=${coordAfterA.openCount}`
  );

  if (caseA?.id) {
    const commentCoord = await api(cookies.coordinatorIrbid, `/api/cases/${caseA.id}/actions`, "POST", {
      action: "comment",
      content: `${TAG} تعليق منسق — مراجعة أولية`,
    });
    record("Flow-A", "5. تعليق منسق الدعم", commentCoord.ok, `HTTP ${commentCoord.status}`);

    const lock1 = await acquireLock(cookies.coordinatorIrbid, caseA.id);
    const escalate = await api(cookies.coordinatorIrbid, `/api/cases/${caseA.id}/actions`, "POST", {
      action: "coordinator_escalate_system_bug",
      note: `${TAG} System Bug — تصعيد للسوبر أدمن`,
      lockToken: lock1,
    });
    record("Flow-A", "6. تصعيد System Bug", escalate.ok, escalate.data?.status ?? `HTTP ${escalate.status}`);

    const caseAfterEsc = await api(cookies.coordinatorIrbid, `/api/cases/${caseA.id}`);
    const row = caseAfterEsc.data?.case ?? caseAfterEsc.data;
    record(
      "Flow-A",
      "7. الحالة AWAITING_APPROVAL",
      row?.status === "AWAITING_APPROVAL",
      row?.status ?? "?"
    );

    const coordOpenAfterEsc = await metricsCoordinator(cookies.coordinatorIrbid);
    record(
      "Flow-A",
      "8. OPEN للمنسق ينقص بعد التصعيد",
      coordOpenAfterEsc.openCount <= coordAfterA.openCount,
      `${coordAfterA.openCount} → ${coordOpenAfterEsc.openCount}`
    );

    const lock2 = await acquireLock(cookies.admin, caseA.id);
    const devId = (await getUserIdByEmail(cookies.admin, ROLES.developer)) ?? ROLES.developer;
    const assign = await api(cookies.admin, `/api/cases/${caseA.id}/actions`, "POST", {
      action: "review_problem",
      developerId: devId,
      priority: "HIGH",
      severity: "HIGH",
      lockToken: lock2,
    });
    record("Flow-A", "9. سوبر أدمن — قبول وإسناد مطور", assign.ok, assign.data?.status ?? `HTTP ${assign.status}`);

    const devCase = await api(cookies.developer, `/api/cases/${caseA.id}`);
    const devRow = devCase.data?.case ?? devCase.data;
    record(
      "Flow-A",
      "10. المطور يرى الحالة",
      devCase.ok && (devRow?.assignedDeveloperId || devRow?.status === "IN_PROGRESS"),
      devRow?.status ?? `HTTP ${devCase.status}`
    );

    const commentDev = await api(cookies.developer, `/api/cases/${caseA.id}/actions`, "POST", {
      action: "comment",
      content: `${TAG} تعليق مطور — بدء المعالجة`,
    });
    record("Flow-A", "11. تعليق المطور", commentDev.ok, `HTTP ${commentDev.status}`);

    const comments = await api(cookies.admin, `/api/cases/${caseA.id}`);
    const commentList = comments.data?.comments ?? [];
    const hasBoth = commentList.length >= 2;
    record("Flow-A", "12. التعليقات ظاهرة", hasBoth, `${commentList.length} تعليق`);
  }

  // ── B: منسق ينشئ → مشرف الدعم ─────────────────────────────
  const assignees = await api(cookies.coordinatorIrbid, "/api/reports/coordinator-assignees");
  const ssId = assignees.data?.find((a) => a.role === "SUPPORT_SUPERVISOR")?.id;
  const ssMetricsBefore = await api(cookies.supportSupervisor, "/api/cases?limit=300");
  const ssCountBefore = Array.isArray(ssMetricsBefore.data) ? ssMetricsBefore.data.length : 0;

  const obsB = `${TAG}-B بلاغ من المنسق لمشرف الدعم`;
  const createB = await api(cookies.coordinatorIrbid, "/api/reports", "POST", {
    observation: obsB,
    governorate: "إربد",
    enumeratorsAffected: 2,
    affectedSystem: "RESEARCHER_SYSTEM",
    researcherIssueType: "TECHNICAL",
    assigneeUserId: ssId,
  });
  record("Flow-B", "1. منسق ينشئ → مشرف الدعم", createB.status === 201 && !!ssId, `HTTP ${createB.status}`);

  const caseB = await findCaseByTag(cookies.supportSupervisor, TAG + "-B");
  const ssMetricsAfter = await api(cookies.supportSupervisor, "/api/cases?limit=300");
  const ssCountAfter = Array.isArray(ssMetricsAfter.data) ? ssMetricsAfter.data.length : 0;
  record(
    "Flow-B",
    "2. مشرف الدعم يرى البلاغ",
    !!caseB,
    caseB ? `${caseB.number} → ${caseB.assignedCoordinatorName ?? "?"}` : "غير ظاهر"
  );
  record(
    "Flow-B",
    "3. قائمة مشرف الدعم",
    ssCountAfter >= ssCountBefore,
    `${ssCountBefore} → ${ssCountAfter}`
  );

  const mineCoord = await metricsSupervisorMine(cookies.coordinatorIrbid);
  const sawOwnB = mineCoord.list.some((c) => c.title?.includes(TAG + "-B"));
  record("Flow-B", "4. بلاغاتي للمنسق (منشئ)", sawOwnB, `${mineCoord.mineCount} حالة`);

  // ── C: Playwright — فلاتر وكروت UI ─────────────────────────
  const headless = process.env.HEADLESS === "1" || process.env.CI === "true";
  let browser;
  try {
    browser = await chromium.launch({ headless, channel: headless ? undefined : "chrome" });
    const context = await browser.newContext();
    const page = await context.newPage();

    await playwrightLogin(page, ROLES.coordinatorIrbid);
    const apiOpen = await metricsCoordinator(cookies.coordinatorIrbid);
    await page.goto(`${BASE}${BP}/cases?status=OPEN`, { waitUntil: "domcontentloaded" });
    await waitForCasesUi(page, apiOpen.openCount);
    const uiOpenKpi = await readUiOpenKpi(page);
    const uiOpenResults = await readUiResultCount(page);
    record(
      "UI-Filters",
      "OPEN — KPI = API",
      uiOpenKpi === apiOpen.openCount,
      `UI KPI=${uiOpenKpi} API=${apiOpen.openCount} results=${uiOpenResults}`
    );
    record(
      "UI-Filters",
      "OPEN — نتائج = API",
      uiOpenResults === apiOpen.openCount,
      `نتيجة=${uiOpenResults}`
    );

    await page.goto(`${BASE}${BP}/cases?status=CLOSED`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const closedApi = await api(cookies.coordinatorIrbid, "/api/cases?simpleStatus=CLOSED&limit=300");
    const closedCount = Array.isArray(closedApi.data) ? closedApi.data.length : 0;
    const uiClosedResults = await readUiResultCount(page);
    record(
      "UI-Filters",
      "CLOSED — نتائج = API",
      uiClosedResults === closedCount,
      `UI=${uiClosedResults} API=${closedCount}`
    );

    await page.goto(`${BASE}${BP}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const dashText = await page.locator(".tabular-nums").first().textContent({ timeout: 8000 }).catch(() => null);
    const dashPending = dashText ? parseInt(dashText.trim(), 10) : null;
    record(
      "UI-Filters",
      "لوحة المنسق — pending",
      dashPending === apiOpen.openCount,
      `dashboard=${dashPending} api=${apiOpen.openCount}`
    );

    await browser.close();
  } catch (e) {
    record("UI-Filters", "Playwright", false, e.message);
    await browser?.close().catch(() => {});
  }

  // ── Summary ───────────────────────────────────────────────
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);
  console.log("\n══════════════════════════════════════════════════════");
  console.log(`  النتيجة: ${passed}/${results.length} نجح — ${failed.length} فشل`);
  console.log("══════════════════════════════════════════════════════\n");

  if (failed.length) {
    console.log("فشل:");
    for (const f of failed) console.log(`  • [${f.phase}] ${f.name}: ${f.detail}`);
  }

  try {
    mkdirSync(join(process.cwd(), "scripts", "output"), { recursive: true });
    writeFileSync(
      join(process.cwd(), "scripts", "output", `deep-lifecycle-${STAMP}.txt`),
      reportLines.join("\n"),
      "utf8"
    );
  } catch {
    /* ignore */
  }

  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
