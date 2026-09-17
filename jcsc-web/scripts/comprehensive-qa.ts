/**
 * اختبار شامل: تسجيل الدخول + API + صفحات لكل الأدوار
 * Run: npx tsx scripts/comprehensive-qa.ts
 */
import { PRODUCTION_PASSWORDS } from "../prisma/production-passwords";
import { authenticateUser } from "../src/lib/authenticate-user";
import { prisma } from "../src/lib/db";
import {
  listCoordinatorTransferPeers,
  listRegionalCoordinatorTransferTargets,
} from "../src/lib/coordinator-transfer";
import { assignedCoordinatorScopeWhere } from "../src/lib/coordinator-case-scope";
import { getCaseSummaryStats } from "../src/lib/cases/server";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000/Support_Center";

type Result = { ok: boolean; detail: string };

const results: { category: string; name: string; ok: boolean; detail: string }[] = [];

function record(category: string, name: string, r: Result) {
  results.push({ category, name, ...r });
  const icon = r.ok ? "✓" : "✗";
  console.log(`${icon} [${category}] ${name}: ${r.detail}`);
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
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies.join("; "),
    },
    body: body.toString(),
    redirect: "manual",
  });

  const loginCookies = loginRes.headers.getSetCookie?.() ?? [];
  const all = [...cookies, ...loginCookies];
  if (!all.length) return null;
  return all.map((c) => c.split(";")[0]).join("; ");
}

async function fetchAuthed(path: string, cookie: string, method = "GET", body?: object) {
  return fetch(`${BASE}${path}`, {
    method,
    headers: {
      Cookie: cookie,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

const ROLE_ACCOUNTS: { email: string; role: string; label: string }[] = [
  { email: "admin@jcsc.gov.jo", role: "ADMIN", label: "سوبر أدمن" },
  { email: "support-supervisor@jcsc.gov.jo", role: "SUPPORT_SUPERVISOR", label: "مشرف الدعم" },
  { email: "razan.m@jcsc.gov.jo", role: "SUPPORT_COORDINATOR", label: "منسق عمان" },
  { email: "fieldops.coord@jcsc.gov.jo", role: "FIELD_OPERATIONS_COORDINATOR", label: "منسق FOM" },
  { email: "sanaa@jcsc.gov.jo", role: "RESEARCHER_FIELD_COORDINATOR", label: "مشرف باحث فني" },
  { email: "infra.supervisor@jcsc.gov.jo", role: "INFRASTRUCTURE_SUPERVISOR", label: "مشرف بنية" },
  { email: "supervisor@jcsc.gov.jo", role: "SUPERVISOR", label: "دعم فني إربد" },
  { email: "hazem@jcsc.gov.jo", role: "DEVELOPER", label: "مطور" },
];

const PAGES_BY_ROLE: Record<string, string[]> = {
  ADMIN: ["/dashboard", "/cases", "/reports", "/users", "/settings", "/notifications", "/approval-center"],
  SUPPORT_COORDINATOR: ["/dashboard", "/cases", "/reports/my", "/settings", "/notifications"],
  FIELD_OPERATIONS_COORDINATOR: ["/dashboard", "/cases", "/settings"],
  RESEARCHER_FIELD_COORDINATOR: ["/dashboard", "/cases", "/settings"],
  INFRASTRUCTURE_SUPERVISOR: ["/dashboard", "/reports", "/settings"],
  SUPPORT_SUPERVISOR: ["/dashboard", "/cases", "/users", "/settings"],
  SUPERVISOR: ["/dashboard", "/reports/my", "/cases/create", "/knowledge-base", "/settings"],
  DEVELOPER: ["/cases", "/settings", "/notifications"],
};

async function main() {
  console.log("\n=== JCSC Comprehensive QA ===\n");
  console.log(`Base URL: ${BASE}\n`);

  // 1. Auth credentials (DB)
  for (const acc of ROLE_ACCOUNTS) {
    const pwd = PRODUCTION_PASSWORDS[acc.email];
    if (!pwd) {
      record("Auth", acc.label, { ok: false, detail: "لا توجد كلمة مرور في production-passwords" });
      continue;
    }
    const user = await authenticateUser(acc.email, pwd);
    record(
      "Auth",
      acc.label,
      user
        ? user.role === acc.role
          ? { ok: true, detail: `OK — ${user.name}` }
          : { ok: false, detail: `دور خاطئ: ${user.role} ≠ ${acc.role}` }
        : { ok: false, detail: "فشل تسجيل الدخول" }
    );
  }

  // 2. DB counts
  const activeUsers = await prisma.user.count({ where: { isActive: true } });
  record("DB", "مستخدمون نشطون", { ok: activeUsers > 0, detail: `${activeUsers} مستخدم` });

  const openCases = await prisma.case.count({ where: { status: "OPEN" } });
  record("DB", "حالات OPEN", { ok: true, detail: `${openCases} حالة` });

  const peers = await listCoordinatorTransferPeers();
  record("Transfer", "قائمة التحويل الكاملة", {
    ok: peers.length === 11,
    detail: `${peers.length} منسق/مشرف (متوقع 11)`,
  });

  const adminTargets = await listRegionalCoordinatorTransferTargets();
  record("Transfer", "تحويل منسق إقليمي → سوبر أدمن فقط", {
    ok: adminTargets.length >= 1 && adminTargets.every((u) => u.role === "ADMIN"),
    detail: `${adminTargets.length} سوبر أدمن`,
  });

  const irbidCoord = await prisma.user.findFirst({
    where: { email: "manal.k@jcsc.gov.jo", role: "SUPPORT_COORDINATOR" },
    select: { id: true },
  });
  if (irbidCoord) {
    const scope = assignedCoordinatorScopeWhere("SUPPORT_COORDINATOR", irbidCoord.id);
    const assignedOpen = await prisma.case.count({
      where: { status: "OPEN", ...scope },
    });
    const summary = await getCaseSummaryStats("SUPPORT_COORDINATOR", irbidCoord.id);
    record("Coordinator", "عد OPEN مسند لإربد = summary.pendingCoordinator", {
      ok: summary.pendingCoordinator === assignedOpen,
      detail: `DB=${assignedOpen} summary=${summary.pendingCoordinator}`,
    });
  }

  // 3. HTTP login + pages + APIs per role
  for (const acc of ROLE_ACCOUNTS) {
    const pwd = PRODUCTION_PASSWORDS[acc.email];
    if (!pwd) continue;

    const cookie = await loginSession(acc.email, pwd);
    if (!cookie) {
      record("HTTP Login", acc.label, { ok: false, detail: "فشل الحصول على session" });
      continue;
    }
    record("HTTP Login", acc.label, { ok: true, detail: "session OK" });

    const pages = PAGES_BY_ROLE[acc.role] ?? ["/dashboard"];
    for (const page of pages) {
      const res = await fetchAuthed(page, cookie);
      const ok = res.status === 200 || res.status === 307;
      record("Pages", `${acc.label} → ${page}`, {
        ok,
        detail: `HTTP ${res.status}`,
      });
    }

    // API smoke tests
    const apiTests: { path: string; expect: number[] }[] = [
      { path: "/api/cases?limit=5", expect: [200] },
      { path: "/api/notifications", expect: [200] },
      { path: "/api/dashboard", expect: [200, 403] },
    ];

    if (acc.role === "ADMIN" || acc.role.includes("COORDINATOR") || acc.role.includes("SUPERVISOR")) {
      apiTests.push({ path: "/api/reports?limit=5", expect: [200, 403] });
    }

    for (const t of apiTests) {
      const res = await fetchAuthed(t.path, cookie);
      record("API", `${acc.label} ${t.path}`, {
        ok: t.expect.includes(res.status),
        detail: `HTTP ${res.status}`,
      });
    }

    // Transfer peers API — use a case visible to this role's scope
    if (
      ["SUPPORT_COORDINATOR", "FIELD_OPERATIONS_COORDINATOR", "RESEARCHER_FIELD_COORDINATOR", "INFRASTRUCTURE_SUPERVISOR", "SUPPORT_SUPERVISOR"].includes(
        acc.role
      )
    ) {
      const casesRes = await fetchAuthed("/api/cases?status=OPEN&limit=10", cookie);
      const casesList = casesRes.ok ? ((await casesRes.json()) as { id: string; status?: string }[]) : [];
      const scopedCase = Array.isArray(casesList)
        ? (casesList.find((c) => c.status === "OPEN") ?? casesList[0])
        : null;
      if (scopedCase?.id) {
        const res = await fetchAuthed(`/api/cases/${scopedCase.id}/transfer-peers`, cookie);
        if (res.ok) {
          const data = (await res.json()) as {
            peers: { role?: string }[];
            total?: number;
          };
          const peerCount = data.peers?.length ?? 0;
          const allAdmin =
            acc.role === "SUPPORT_COORDINATOR"
              ? (data.peers ?? []).every((p) => p.role === "ADMIN")
              : true;
          record("API", `${acc.label} transfer-peers`, {
            ok:
              acc.role === "SUPPORT_COORDINATOR"
                ? peerCount >= 1 && allAdmin
                : peerCount >= 9,
            detail:
              acc.role === "SUPPORT_COORDINATOR"
                ? `${peerCount} admins only`
                : `${peerCount} peers`,
          });
        } else {
          record("API", `${acc.label} transfer-peers`, {
            ok: res.status === 403,
            detail: res.status === 403 ? "403 — خارج النطاق (مقبول)" : `HTTP ${res.status}`,
          });
        }
      }
    }

    if (acc.role === "SUPPORT_COORDINATOR") {
      const assigneesRes = await fetchAuthed("/api/reports/coordinator-assignees", cookie);
      if (assigneesRes.ok) {
        const assignees = (await assigneesRes.json()) as { role: string }[];
        const valid = assignees.every((a) =>
          ["ADMIN", "SUPPORT_SUPERVISOR"].includes(a.role)
        );
        record("API", `${acc.label} coordinator-assignees`, {
          ok: assignees.length >= 1 && valid,
          detail: `${assignees.length} مستلم`,
        });
      } else {
        record("API", `${acc.label} coordinator-assignees`, {
          ok: false,
          detail: `HTTP ${assigneesRes.status}`,
        });
      }

      const mineRes = await fetchAuthed("/api/cases?mine=true&limit=50", cookie);
      const mineCases = mineRes.ok ? ((await mineRes.json()) as { createdBy?: string }[]) : [];
      const user = await prisma.user.findUnique({
        where: { email: acc.email },
        select: { id: true },
      });
      const mineOk =
        Array.isArray(mineCases) &&
        mineCases.every((c) => !user?.id || c.createdBy === user.id);
      record("API", `${acc.label} cases mine=true`, {
        ok: mineRes.ok && mineOk,
        detail: `${Array.isArray(mineCases) ? mineCases.length : 0} حالة`,
      });

      const summaryRes = await fetchAuthed("/api/cases/summary", cookie);
      if (summaryRes.ok && user?.id) {
        const summary = (await summaryRes.json()) as { pendingCoordinator: number };
        const listRes = await fetchAuthed("/api/cases?status=OPEN&limit=200", cookie);
        const list = listRes.ok ? ((await listRes.json()) as unknown[]) : [];
        record("API", `${acc.label} summary vs OPEN list`, {
          ok:
            listRes.ok &&
            summary.pendingCoordinator === (Array.isArray(list) ? list.length : -1),
          detail: `summary=${summary.pendingCoordinator} list=${Array.isArray(list) ? list.length : "?"}`,
        });
      }
    }

    // Admin-only APIs
    if (acc.role === "ADMIN") {
      for (const path of ["/api/users?limit=5", "/api/roles", "/api/routing-rules", "/api/assignees"]) {
        const res = await fetchAuthed(path, cookie);
        record("API", `سوبر أدمن ${path}`, { ok: res.status === 200, detail: `HTTP ${res.status}` });
      }
    }
  }

  // Summary
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log("\n=== SUMMARY ===");
  console.log(`Passed: ${passed}/${results.length}`);
  if (failed.length) {
    console.log("\nFAILED:");
    for (const f of failed) console.log(`  - [${f.category}] ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
