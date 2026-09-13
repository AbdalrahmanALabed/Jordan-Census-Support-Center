/**
 * اختبار مرئي — نافذة Chrome منفصلة، سير عمل كامل بين الحسابات.
 * Usage: node scripts/ui-visible-workflow.mjs
 */
import { chromium } from "playwright";
import { passwordFor } from "./test-credentials.mjs";

const BASE = "http://localhost:3000/Support_Center";
const STAMP = Date.now();
const REPORT_DESC = `[عرض-${STAMP}] بلاغ اختبار مرئي — فشل مزامنة البيانات في إربد`;

const ACCOUNTS = {
  supervisor: "supervisor@jcsc.gov.jo",
  coordinator: "manal.k@jcsc.gov.jo",
  admin: "admin@jcsc.gov.jo",
  developer: "hazem@jcsc.gov.jo",
};

function log(step, msg) {
  console.log(`\n━━ ${step} ━━ ${msg}`);
}

async function pause(page, ms = 1500) {
  await page.waitForTimeout(ms);
}

async function signOut(page) {
  await page.goto(`${BASE}/api/auth/signout`, { waitUntil: "domcontentloaded" });
  await pause(page, 1200);
}

async function loginWithEmail(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('form button[type="submit"]', { timeout: 20000 });
  await pause(page, 800);
  await page.locator('input[name="email"]').fill(email);
  const pwd = passwordFor(email);
  if (!pwd) throw new Error(`No test password for ${email}`);
  await page.locator('input[name="password"]').fill(pwd);
  await page.getByRole("button", { name: "دخول إلى المنصة" }).click();
  await page.waitForURL("**/dashboard**", { timeout: 35000 });
  await pause(page, 1000);
}

const HEADLESS = process.env.HEADLESS === "1" || process.env.CI === "true";

async function openCaseBySearch(page, text) {
  const found = await page.evaluate(async (stamp) => {
    const res = await fetch(`/Support_Center/api/cases?search=${encodeURIComponent(stamp)}&limit=5`);
    if (!res.ok) return null;
    const data = await res.json();
    const list = Array.isArray(data) ? data : data?.cases ?? [];
    return list[0]?.id ?? null;
  }, text);
  if (found) {
    await page.goto(`${BASE}/cases/${found}`, { waitUntil: "domcontentloaded" });
    await pause(page, 1500);
    return;
  }
  await page.goto(`${BASE}/cases`, { waitUntil: "domcontentloaded" });
  await pause(page, 1500);
  await page.getByText(text, { exact: false }).first().click();
  await page.waitForURL("**/cases/**", { timeout: 20000 });
  await pause(page, 1500);
}

async function pickAssignee(page, namePattern) {
  const trigger = page.locator('[role="combobox"]').last();
  await trigger.click();
  await pause(page, 800);
  await page.getByRole("option", { name: namePattern }).click();
  await pause(page, 600);
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  JCSC — اختبار مرئي (Chrome منفصل)                   ║");
  console.log(`║  ${BASE}                          ║`);
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`\nوصف البلاغ: ${REPORT_DESC}\n`);

  const browser = await chromium.launch({
    headless: HEADLESS,
    channel: HEADLESS ? undefined : "chrome",
    slowMo: HEADLESS ? 0 : 500,
    args: HEADLESS ? [] : ["--start-maximized"],
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  try {
    log("1/4", "مشرف الدعم الفني — إنشاء بلاغ");
    await loginWithEmail(page, ACCOUNTS.supervisor);

    await page.goto(`${BASE}/cases/create`, { waitUntil: "domcontentloaded" });
    await pause(page, 1500);

    log("", "تعبئة وصف المشكلة...");
    await page.locator("textarea").first().fill(REPORT_DESC);
    await pause(page, 800);

    log("", "اختيار النظام: نظام الباحث");
    await page.getByRole("button", { name: /نظام الباحث/i }).click();
    await pause(page, 800);

    log("", "نوع المشكلة: تقني");
    await page.getByRole("button", { name: /تقني/i }).first().click();
    await pause(page, 800);

    log("", "اختيار المحافظة: إربد");
    await page.locator('button:has-text("إربد")').first().click();
    await pause(page, 800);

    log("", "حفظ البلاغ...");
    await page.getByRole("button", { name: "حفظ البلاغ" }).click();
    await page.waitForURL(/\/(reports\/my|cases\/)/, { timeout: 35000 });
    await pause(page, 2000);

    if (!page.url().includes("/reports/my")) {
      await page.goto(`${BASE}/reports/my`, { waitUntil: "domcontentloaded" });
      await pause(page, 1500);
    }
    await page.getByText(`[عرض-${STAMP}]`, { exact: false }).first().waitFor({ timeout: 15000 });
    log("", "✓ البلاغ ظهر في «بلاغاتي»");

    log("2/4", "منسق إربد — مراجعة وتصعيد");
    await signOut(page);
    await loginWithEmail(page, ACCOUNTS.coordinator);

    await openCaseBySearch(page, `[عرض-${STAMP}]`);

    log("", "تصنيف: System Bug — عطل في النظام");
    await page.getByText(/System Bug — عطل في النظام/i).click();
    await pause(page, 1000);

    log("", "انتظار قفل المعالجة...");
    await page.getByRole("button", { name: /تصعيد System Bug/i }).waitFor({ state: "visible", timeout: 20000 });
    await page.getByRole("button", { name: /تصعيد System Bug/i }).waitFor({ state: "attached" });
    for (let i = 0; i < 30; i++) {
      const enabled = await page.getByRole("button", { name: /تصعيد System Bug/i }).isEnabled();
      if (enabled) break;
      await pause(page, 500);
    }
    log("", "تصعيد للسوبر أدمن...");
    await page.getByRole("button", { name: /تصعيد System Bug/i }).click();
    await pause(page, 3000);
    log("", "✓ تم التصعيد");

    log("3/4", "السوبر أدمن — قبول وإسناد للمطور");
    await signOut(page);
    await loginWithEmail(page, ACCOUNTS.admin);

    await openCaseBySearch(page, `[عرض-${STAMP}]`);

    log("", "قبول كمشكلة في التطبيق...");
    await page.getByText(/قبول — مشكلة في التطبيق/i).click();
    await pause(page, 1000);

    log("", "إسناد إلى: محمد حازم");
    await pickAssignee(page, /محمد حازم/i);

    await page.getByRole("button", { name: /تأكيد القبول والإسناد/i }).click();
    await pause(page, 3500);
    log("", "✓ تم الإسناد");

    log("4/4", "المطور — عرض الحالة المسندة");
    await signOut(page);
    await loginWithEmail(page, ACCOUNTS.developer);

    await openCaseBySearch(page, `[عرض-${STAMP}]`);
    await pause(page, 1000);

    log("", "✓ المطور يرى الحالة المسندة");

    console.log("\n══════════════════════════════════════════════════════");
    console.log("  ✓ اكتمل الاختبار المرئي بنجاح");
    if (!HEADLESS) {
      console.log("  النافذة ستبقى مفتوحة 90 ثانية للمعاينة...");
      await pause(page, 90000);
    }
    console.log("══════════════════════════════════════════════════════\n");
  } catch (err) {
    console.error("\n✗ فشل الاختبار:", err.message);
    await page.screenshot({ path: "scripts/ui-visible-workflow-error.png", fullPage: true });
    console.log("Screenshot: scripts/ui-visible-workflow-error.png");
    if (!HEADLESS) await pause(page, 30000);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
