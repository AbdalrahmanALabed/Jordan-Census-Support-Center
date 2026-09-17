/**
 * اختبار تغيير / إعادة ضبط كلمة المرور
 * Run: npx tsx scripts/test-password-change.ts
 */
import { hash } from "bcryptjs";
import { prisma } from "../src/lib/db";
import { authenticateUser } from "../src/lib/authenticate-user";
import { normalizeEmail } from "../src/lib/email";
import { PRODUCTION_PASSWORDS } from "../prisma/production-passwords";
import { passwordsMatch, validatePasswordStrength } from "../src/lib/auth/password-policy";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000/Support_Center";
const SUBJECT_EMAIL = "hazem@jcsc.gov.jo";
const ADMIN_EMAIL = "admin@jcsc.gov.jo";

const ORIGINAL = PRODUCTION_PASSWORDS[SUBJECT_EMAIL];
if (!ORIGINAL) {
  console.error("لا توجد كلمة مرور في production-passwords لـ", SUBJECT_EMAIL);
  process.exit(1);
}

const stamp = Date.now();
const TEMP_A = `Jcsc@PwA${String(stamp).slice(-5)}9`;
const TEMP_B = `Jcsc@PwB${String(stamp).slice(-5)}7`;

let failed = 0;
let subjectUserId: string | null = null;

function ok(name: string, cond: boolean, detail = "") {
  console.log(cond ? `✓ ${name}${detail ? ` — ${detail}` : ""}` : `✗ ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failed++;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function authOk(email: string, password: string) {
  const user = await authenticateUser(email, password);
  return !!user;
}

async function loginSession(email: string, password: string): Promise<string | null> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  if (!csrfRes.ok) return null;
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const cookies = csrfRes.headers.getSetCookie?.() ?? [];
  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: `${BASE}/dashboard`,
    json: "true",
  });
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies.join("; ") },
    body: body.toString(),
    redirect: "manual",
  });
  const all = [...cookies, ...(loginRes.headers.getSetCookie?.() ?? [])];
  if (!all.length) return null;
  return all.map((c) => c.split(";")[0]).join("; ");
}

async function api(cookie: string, path: string, method = "GET", body?: object) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Cookie: cookie,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, ok: res.ok };
}

async function restoreOriginalPassword() {
  const passwordHash = await hash(ORIGINAL, 10);
  await prisma.user.update({
    where: { email: normalizeEmail(SUBJECT_EMAIL) },
    data: { password: passwordHash },
  });
  const restored = await authOk(SUBJECT_EMAIL, ORIGINAL);
  if (restored) console.log("↺ استعادة كلمة المرور الأصلية (DB)");
  else {
    console.error("⚠ فشل استعادة كلمة المرور — راجع hazem@jcsc.gov.jo");
    failed++;
  }
}

async function runPolicyTests() {
  console.log("\n=== Password — policy (DB) ===\n");
  ok("validate — كلمة قصيرة", validatePasswordStrength("abc1") !== null);
  ok("validate — بدون حرف كبير", validatePasswordStrength("jcsc@abc123") !== null);
  ok("validate — بدون رمز", validatePasswordStrength("JcscAbc123") !== null);
  ok("validate — كلمة قوية", validatePasswordStrength(TEMP_A) === null);
  ok("passwordsMatch", passwordsMatch("a", "a") && !passwordsMatch("a", "b"));
}

async function runApiTests() {
  console.log("\n=== Password change — API ===\n");

  const health = await fetch(`${BASE}/api/auth/csrf`);
  if (!health.ok) {
    console.log(`⚠ الخادم غير جاهز (HTTP ${health.status}) — تخطي اختبارات API`);
    console.log("  شغّل: npm run dev:local ثم npm run test:password");
    console.log("  (أو PASSWORD_REQUIRE_API=1 لإجبار فشل CI)\n");
    if (process.env.PASSWORD_REQUIRE_API === "1") {
      ok("اختبارات API (الخادم)", false, "غير متاح");
    }
    return;
  }
  ok("الخادم / CSRF", true, `HTTP ${health.status}`);

  ok("تسجيل DB أولي", await authOk(SUBJECT_EMAIL, ORIGINAL));

  const devCookie = await loginSession(SUBJECT_EMAIL, ORIGINAL);
  ok("جلسة المطور", !!devCookie);
  const adminCookie = await loginSession(ADMIN_EMAIL, PRODUCTION_PASSWORDS[ADMIN_EMAIL] ?? "");
  ok("جلسة السوبر أدمن", !!adminCookie);
  if (!devCookie || !adminCookie) return;

  const usersRes = await api(adminCookie, "/api/users?limit=300");
  const list = Array.isArray(usersRes.data) ? (usersRes.data as { id: string; email: string; role: string }[]) : [];
  const subject = list.find((u) => u.email?.toLowerCase() === SUBJECT_EMAIL);
  subjectUserId = subject?.id ?? null;
  ok("معرّف المستخدم", !!subjectUserId, subjectUserId ?? "");

  const badCurrent = await api(devCookie, "/api/account/change-password", "POST", {
    currentPassword: "WrongPass99",
    newPassword: TEMP_A,
    confirmPassword: TEMP_A,
  });
  ok("رفض كلمة حالية خاطئة", badCurrent.status === 401, `HTTP ${badCurrent.status}`);

  const mismatch = await api(devCookie, "/api/account/change-password", "POST", {
    currentPassword: ORIGINAL,
    newPassword: TEMP_A,
    confirmPassword: `${TEMP_A}x`,
  });
  ok("رفض عدم تطابق التأكيد", mismatch.status === 400, `HTTP ${mismatch.status}`);

  const weak = await api(devCookie, "/api/account/change-password", "POST", {
    currentPassword: ORIGINAL,
    newPassword: "1234567",
    confirmPassword: "1234567",
  });
  ok("رفض كلمة ضعيفة", weak.status === 400, `HTTP ${weak.status}`);

  const selfChange = await api(devCookie, "/api/account/change-password", "POST", {
    currentPassword: ORIGINAL,
    newPassword: TEMP_A,
    confirmPassword: TEMP_A,
  });
  ok("تغيير ذاتي API", selfChange.ok, `HTTP ${selfChange.status}`);
  await sleep(200);
  ok("تحقق DB — كلمة جديدة", await authOk(SUBJECT_EMAIL, TEMP_A));
  ok("تحقق DB — رفض القديمة", !(await authOk(SUBJECT_EMAIL, ORIGINAL)));

  const devCookieB = await loginSession(SUBJECT_EMAIL, TEMP_A);
  ok("جلسة بعد التغيير", !!devCookieB);
  if (devCookieB) {
    const selfBack = await api(devCookieB, "/api/account/change-password", "POST", {
      currentPassword: TEMP_A,
      newPassword: ORIGINAL,
      confirmPassword: ORIGINAL,
    });
    ok("إرجاع كلمة المرور (ذاتي)", selfBack.ok, `HTTP ${selfBack.status}`);
    ok("تحقق DB بعد الإرجاع", await authOk(SUBJECT_EMAIL, ORIGINAL));
  }

  if (subjectUserId) {
    const adminSet = await api(adminCookie, `/api/users/${subjectUserId}`, "PATCH", {
      action: "change_password",
      newPassword: TEMP_B,
      confirmPassword: TEMP_B,
    });
    ok("سوبر أدمن — تعيين كلمة", adminSet.ok, `HTTP ${adminSet.status}`);
    ok("تحقق DB بعد الأدمن", await authOk(SUBJECT_EMAIL, TEMP_B));

    const devCookieC = await loginSession(SUBJECT_EMAIL, TEMP_B);
    if (devCookieC) {
      const restoreSelf = await api(devCookieC, "/api/account/change-password", "POST", {
        currentPassword: TEMP_B,
        newPassword: ORIGINAL,
        confirmPassword: ORIGINAL,
      });
      ok("المستخدم يعيد كلمة الأدمن", restoreSelf.ok, `HTTP ${restoreSelf.status}`);
    }
  }

  const adminUser = list.find((u) => u.role === "ADMIN");
  if (adminUser && devCookie) {
    const forbidden = await api(devCookie, `/api/users/${adminUser.id}`, "PATCH", {
      action: "change_password",
      newPassword: TEMP_A,
      confirmPassword: TEMP_A,
    });
    ok("المطور لا يغيّر كلمة الأدمن", forbidden.status === 403, `HTTP ${forbidden.status}`);
  }

  if (subjectUserId) {
    const adminReset = await api(adminCookie, `/api/users/${subjectUserId}`, "PATCH", {
      action: "reset_password",
      password: TEMP_A,
    });
    const resetData = adminReset.data as { initialPassword?: string };
    ok(
      "reset_password بكلمة محددة",
      adminReset.ok && resetData?.initialPassword === TEMP_A
    );
    ok("تحقق DB بعد reset", await authOk(SUBJECT_EMAIL, TEMP_A));
  }
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  JCSC — اختبار تغيير / إعادة ضبط كلمة المرور         ║");
  console.log(`║  ${SUBJECT_EMAIL}`.padEnd(55) + "║");
  console.log("╚══════════════════════════════════════════════════════╝");

  try {
    await restoreOriginalPassword();
    await runPolicyTests();
    await runApiTests();
  } catch (e) {
    console.error(e);
    failed++;
  } finally {
    await restoreOriginalPassword();
  }

  console.log("\n══════════════════════════════════════════════════════");
  console.log(failed ? `  فشل: ${failed}` : "  ✓ جميع اختبارات كلمة المرور نجحت");
  console.log("══════════════════════════════════════════════════════\n");
  process.exit(failed ? 1 : 0);
}

main().finally(() => prisma.$disconnect());
