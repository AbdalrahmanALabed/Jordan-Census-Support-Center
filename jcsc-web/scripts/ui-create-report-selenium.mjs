/**
 * UI-only end-to-end via Selenium WebDriver + Chrome.
 */
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import { writeFileSync } from "fs";

const BASE = "http://localhost:3000";
const REPORT_DESC = "بلاغ Selenium UI — فشل مزامنة البيانات في إربد";
const PAUSE_MS = 400;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function clickByText(driver, tag, text) {
  const el = await driver.findElement(
    By.xpath(`//${tag}[contains(normalize-space(.), "${text}")]`)
  );
  await driver.executeScript("arguments[0].scrollIntoView({block:'center'});", el);
  await sleep(300);
  try {
    await el.click();
  } catch {
    await driver.executeScript("arguments[0].click();", el);
  }
  await sleep(PAUSE_MS);
}

const CHROMEDRIVER =
  process.env.CHROMEDRIVER_PATH ??
  "C:\\Users\\abdelrahman.alabed\\Downloads\\chromedriver-win64\\chromedriver.exe";
const CHROME_BINARY =
  process.env.CHROME_BINARY_PATH ??
  "C:\\Users\\abdelrahman.alabed\\AppData\\Local\\Temp\\chrome136\\chrome-win64\\chrome.exe";

async function main() {
  const options = new chrome.Options();
  options.addArguments("--start-maximized");
  options.setChromeBinaryPath(CHROME_BINARY);

  const service = new chrome.ServiceBuilder(CHROMEDRIVER);

  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .setChromeService(service)
    .build();

  try {
    console.log("1/7 — فتح صفحة تسجيل الدخول...");
    await driver.get(`${BASE}/login`);
    await driver.wait(until.elementLocated(By.css('input[type="password"]')), 15000);

    console.log("2/7 — اختيار حساب الدعم الفني المراكز...");
    await clickByText(driver, "button", "الدعم الفني المراكز");
    const password = await driver.findElement(By.css('input[type="password"]'));
    await password.clear();
    await password.sendKeys("jcsc2026");
    await sleep(PAUSE_MS);

    console.log("3/7 — تسجيل الدخول...");
    await clickByText(driver, "button", "دخول إلى المنصة");
    await driver.wait(until.urlContains("/dashboard"), 30000);

    console.log("4/7 — فتح نموذج إنشاء بلاغ...");
    await driver.get(`${BASE}/cases/create`);
    await driver.wait(until.elementLocated(By.css("textarea")), 15000);

    console.log("5/7 — تعبئة الحقول...");
    const textarea = await driver.findElement(By.css("textarea"));
    await textarea.clear();
    await textarea.sendKeys(REPORT_DESC);
    await sleep(PAUSE_MS);
    await clickByText(driver, "button", "نظام الباحث");
    await clickByText(driver, "button", "إربد");

    console.log("6/7 — حفظ البلاغ...");
    await sleep(500);
    const saveBtn = await driver.wait(
      until.elementLocated(By.xpath('//button[contains(.,"حفظ البلاغ")]')),
      15000
    );
    await driver.executeScript("arguments[0].scrollIntoView({block:'center'});", saveBtn);
    await sleep(300);
    try {
      await saveBtn.click();
    } catch {
      await driver.executeScript("arguments[0].click();", saveBtn);
    }
    await driver.wait(until.urlContains("/reports/my"), 30000);

    console.log("7/7 — التحقق من ظهور البلاغ في القائمة...");
    await driver.wait(
      until.elementLocated(By.xpath(`//*[contains(text(),"${REPORT_DESC}")]`)),
      15000
    );

    const png = await driver.takeScreenshot();
    writeFileSync("scripts/ui-create-report-selenium-result.png", png, "base64");

    console.log("SUCCESS — البلاغ ظهر في بلاغاتي:", REPORT_DESC);
    console.log("Screenshot: scripts/ui-create-report-selenium-result.png");

    await sleep(8000);
  } catch (err) {
    try {
      const png = await driver.takeScreenshot();
      writeFileSync("scripts/ui-create-report-selenium-error.png", png, "base64");
    } catch {
      /* ignore */
    }
    console.error("FAILED:", err.message);
    process.exitCode = 1;
    await sleep(5000);
  } finally {
    await driver.quit();
  }
}

main();
