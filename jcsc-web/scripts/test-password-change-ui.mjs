/**
 * واجهة الإعدادات — تغيير كلمة المرور (Playwright)
 * Run: HEADLESS=1 node scripts/test-password-change-ui.mjs
 */
import { chromium } from "playwright";
import { passwordFor } from "./test-credentials.mjs";
import { playwrightLogin } from "./playwright-login.mjs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const BP = "/Support_Center";
const APP = `${BASE}${BP}`;
const EMAIL = "hazem@jcsc.gov.jo";
const ORIGINAL = passwordFor(EMAIL);
const TEMP = `Jcsc@Ui${String(Date.now()).slice(-5)}9`;

let failed = 0;
function ok(n, c) {
  console.log(c ? `✓ ${n}` : `✗ ${n}`);
  if (!c) failed++;
}

async function main() {
  execSync("npx tsx scripts/restore-dev-password.ts", { cwd: ROOT, stdio: "pipe" });

  const browser = await chromium.launch({ headless: process.env.HEADLESS !== "0" });
  const page = await browser.newPage({ locale: "ar-JO" });
  try {
    await playwrightLogin(page, APP, EMAIL, ORIGINAL);

    await page.goto(`${APP}/settings`, { waitUntil: "domcontentloaded" });
    const form = page.getByTestId("change-password-form");
    await form.waitFor({ timeout: 30000 });

    async function fillPasswordField(name, value) {
      const input = form.locator(`input[name="${name}"]`);
      await input.click();
      await input.fill("");
      await input.pressSequentially(value, { delay: 15 });
    }

    await fillPasswordField("currentPassword", "WrongCurrent9");
    await fillPasswordField("newPassword", TEMP);
    await fillPasswordField("confirmPassword", TEMP);
    const badReq = page.waitForResponse(
      (r) => r.url().includes("/api/account/change-password") && r.request().method() === "POST",
      { timeout: 45000 }
    );
    await form.getByRole("button", { name: /حفظ كلمة المرور/ }).click();
    const resp = await badReq;
    ok("API كلمة حالية خاطئة", resp.status() === 401);
    await form.locator('[role="alert"]').filter({ hasText: /الحالية/ }).waitFor({ timeout: 15000 });
    ok("رسالة كلمة حالية خاطئة", true);

    await fillPasswordField("currentPassword", ORIGINAL);
    await fillPasswordField("newPassword", TEMP);
    await fillPasswordField("confirmPassword", TEMP);
    const goodReq = page.waitForResponse(
      (r) => r.url().includes("/api/account/change-password") && r.request().method() === "POST",
      { timeout: 45000 }
    );
    await form.getByRole("button", { name: /حفظ كلمة المرور/ }).click();
    ok("API تغيير ناجح", (await goodReq).ok());
    await form.locator('[role="status"]').filter({ hasText: /تم تحديث/ }).waitFor({ timeout: 20000 });
    ok("تغيير ناجح من الإعدادات", true);

    await page.context().clearCookies();
    await playwrightLogin(page, APP, EMAIL, TEMP);
    ok("دخول بالكلمة الجديدة", true);

    await page.goto(`${APP}/settings`, { waitUntil: "domcontentloaded" });
    const form2 = page.getByTestId("change-password-form");
    await form2.waitFor({ timeout: 30000 });
    async function fill2(name, value) {
      const input = form2.locator(`input[name="${name}"]`);
      await input.click();
      await input.fill("");
      await input.pressSequentially(value, { delay: 15 });
    }
    await fill2("currentPassword", TEMP);
    await fill2("newPassword", ORIGINAL);
    await fill2("confirmPassword", ORIGINAL);
    await form2.getByRole("button", { name: /حفظ كلمة المرور/ }).click();
    await form2.locator('[role="status"]').filter({ hasText: /تم تحديث/ }).waitFor({ timeout: 20000 });
    ok("إرجاع كلمة المرور الأصلية", true);
  } finally {
    await browser.close();
    execSync("npx tsx scripts/restore-dev-password.ts", { cwd: ROOT, stdio: "inherit" });
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
