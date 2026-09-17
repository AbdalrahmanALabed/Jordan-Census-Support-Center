/** تسجيل دخول Playwright — يتوافق مع نموذج React (credentials) */
export async function playwrightLogin(page, basePath, email, password) {
  const pwd = password;
  if (!pwd) throw new Error(`No password for ${email}`);

  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(`${basePath}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector('form button[type="submit"]', { timeout: 20000 });
    await page.locator('input[name="email"]').click();
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(pwd);
    await page.getByRole("button", { name: /دخول إلى المنصة/ }).click();
    try {
      await page.waitForURL((u) => !u.pathname.includes("/login"), {
        timeout: 45000,
        waitUntil: "domcontentloaded",
      });
      return;
    } catch (e) {
      const url = page.url();
      if (url.includes("email=") && url.includes("password=")) {
        await page.goto(`${basePath}/login`, { waitUntil: "domcontentloaded" });
      }
      if (attempt === 2) throw e;
      await page.waitForTimeout(1200);
    }
  }
}
