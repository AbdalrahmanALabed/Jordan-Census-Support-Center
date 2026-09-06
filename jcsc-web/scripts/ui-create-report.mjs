/**
 * UI-only end-to-end: login as supervisor, create report, verify in list.
 * Runs in a visible Chrome window (not Cursor embedded browser).
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const REPORT_DESC = "بلاغ Chrome UI — فشل مزامنة البيانات في إربد";

async function main() {
  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
    slowMo: 400,
  });

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    console.log("1/7 — فتح صفحة تسجيل الدخول...");
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });

    console.log("2/7 — اختيار حساب الدعم الفني المراكز...");
    await page.getByRole("button", { name: /الدعم الفني المراكز/i }).click();
    await page.locator('input[type="password"]').fill("jcsc2026");

    console.log("3/7 — تسجيل الدخول...");
    await page.getByRole("button", { name: "دخول إلى المنصة" }).click();
    await page.waitForURL("**/dashboard", { timeout: 30000 });

    console.log("4/7 — فتح نموذج إنشاء بلاغ...");
    await page.goto(`${BASE}/cases/create`, { waitUntil: "networkidle" });

    console.log("5/7 — تعبئة الحقول...");
    await page.locator("textarea").fill(REPORT_DESC);
    await page.getByRole("button", { name: /نظام الباحث/i }).click();
    await page.getByRole("button", { name: "إربد", exact: true }).click();

    console.log("6/7 — حفظ البلاغ...");
    const saveBtn = page.getByRole("button", { name: "حفظ البلاغ" });
    await saveBtn.waitFor({ state: "visible" });
    await saveBtn.click();
    await page.waitForURL("**/reports/my", { timeout: 30000 });

    console.log("7/7 — التحقق من ظهور البلاغ في القائمة...");
    const reportRow = page.getByText(REPORT_DESC, { exact: false }).first();
    await reportRow.waitFor({ state: "visible", timeout: 15000 });

    await page.screenshot({
      path: "scripts/ui-create-report-result.png",
      fullPage: true,
    });

    console.log("SUCCESS — البلاغ ظهر في بلاغاتي:", REPORT_DESC);
    console.log("Screenshot: scripts/ui-create-report-result.png");

    // Keep window open so user can see the result
    await page.waitForTimeout(8000);
  } catch (err) {
    await page.screenshot({ path: "scripts/ui-create-report-error.png", fullPage: true });
    console.error("FAILED:", err.message);
    process.exitCode = 1;
    await page.waitForTimeout(5000);
  } finally {
    await browser.close();
  }
}

main();
