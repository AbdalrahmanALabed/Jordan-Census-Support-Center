/**
 * دورة API — تعديلات منسق الدعم (إسناد، mine، summary، تحويل)
 * Run: node scripts/coordinator-regression-api.mjs
 */
import { passwordFor } from "./test-credentials.mjs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const BP = "/Support_Center";

async function loginSession(email) {
  const pwd = passwordFor(email);
  if (!pwd) throw new Error(`No password for ${email}`);
  const csrfRes = await fetch(`${BASE}${BP}/api/auth/csrf`);
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
  return all.map((c) => c.split(";")[0]).join("; ");
}

async function api(cookie, path, method = "GET", body) {
  const res = await fetch(`${BASE}${BP}${path}`, {
    method,
    headers: {
      Cookie: cookie,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, ok: res.ok };
}

const stamp = Date.now();
let failed = 0;

function ok(name, cond, detail = "") {
  console.log(cond ? `✓ ${name}${detail ? ` — ${detail}` : ""}` : `✗ ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failed++;
}

async function main() {
  console.log("\n=== Coordinator regression (API) ===\n");

  const coordCookie = await loginSession("manal.k@jcsc.gov.jo");
  const adminCookie = await loginSession("admin@jcsc.gov.jo");

  const assignees = await api(coordCookie, "/api/reports/coordinator-assignees");
  ok("coordinator-assignees", assignees.ok && assignees.data?.length >= 1);
  const adminId = assignees.data?.find((a) => a.role === "ADMIN")?.id;

  const create = await api(coordCookie, "/api/reports", "POST", {
    observation: `[QA-COORD-${stamp}] بلاغ منسق للسوبر أدمن`,
    governorate: "إربد",
    enumeratorsAffected: 2,
    affectedSystem: "RESEARCHER_SYSTEM",
    researcherIssueType: "TECHNICAL",
    assigneeUserId: adminId,
  });
  ok("coordinator create → admin", create.status === 201, `HTTP ${create.status}`);

  const mine = await api(coordCookie, "/api/cases?mine=true&limit=50");
  const mineList = Array.isArray(mine.data) ? mine.data : [];
  const sawOwn = mineList.some((c) => c.title?.includes(`QA-COORD-${stamp}`));
  ok("mine=true includes coordinator report", sawOwn, `${mineList.length} cases`);

  const summary = await api(coordCookie, "/api/cases/summary");
  const openList = await api(coordCookie, "/api/cases?status=OPEN&limit=200");
  const openArr = Array.isArray(openList.data) ? openList.data : [];
  ok(
    "summary.pending = OPEN list length",
    summary.data?.pendingCoordinator === openArr.length,
    `${summary.data?.pendingCoordinator} vs ${openArr.length}`
  );

  const openCase = openArr[0];
  if (openCase?.id) {
    const peers = await api(coordCookie, `/api/cases/${openCase.id}/transfer-peers`);
    const onlyAdmin = (peers.data?.peers ?? []).every((p) => p.role === "ADMIN");
    ok("transfer-peers regional = admins only", peers.ok && onlyAdmin, `${peers.data?.peers?.length ?? 0} peers`);
  }

  console.log(failed ? `\nFAILED: ${failed}` : "\nAll coordinator regression checks passed.");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
