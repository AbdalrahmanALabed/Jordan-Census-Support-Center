/**
 * كلمات مرور الإطلاق الرسمي — مرفوعة للإطلاق على GitHub.
 * Run: npx tsx scripts/apply-production-passwords.ts
 */

export const PRODUCTION_PASSWORDS: Record<string, string> = {
  "admin@jcsc.gov.jo": "Jcsc@Adm2026xK7m",
  "support-supervisor@jcsc.gov.jo": "Jcsc@Sup2026pQ3n",
  "infra.supervisor@jcsc.gov.jo": "Jcsc@Inf2026vS4k",
  "razan.m@jcsc.gov.jo": "Jcsc@Rzn2026mW8k",
  "shatha.a@jcsc.gov.jo": "Jcsc@Sha2026bN4r",
  "zina.t@jcsc.gov.jo": "Jcsc@Zin2026tY6j",
  "manal.k@jcsc.gov.jo": "Jcsc@Mnl2026kH2v",
  "saida@jcsc.gov.jo": "Jcsc@Sai2026dF5w",
  "aman.h@jcsc.gov.jo": "Jcsc@Amn2026hL9c",
  "sawsan@jcsc.gov.jo": "Jcsc@Sws2026nP7x",
  "fieldops.coord@jcsc.gov.jo": "Jcsc@Fld2026oR3m",
  "sanaa@jcsc.gov.jo": "Jcsc@Sna2026aF6t",
  "supervisor@jcsc.gov.jo": "Jcsc@Spr2026rB8k",
  "supervisor.aqaba@jcsc.gov.jo": "Jcsc@Spa2026qJ2n",
  "hazem@jcsc.gov.jo": "Jcsc@Dev2026hZ3k",
  "boran@jcsc.gov.jo": "Jcsc@Brn2026nT2w",
  "hamza@jcsc.gov.jo": "Jcsc@Hmz2026aY5k",
  "abdullah.m@jcsc.gov.jo": "Jcsc@Abd2026lM7x",
  "ahmad.m@jcsc.gov.jo": "Jcsc@Ahm2026dW3n",
  "mohammad.h@jcsc.gov.jo": "Jcsc@Moh2026hK9r",
  "mustafa@jcsc.gov.jo": "Jcsc@Mst2026fL4p",
  "mohammad.ab@jcsc.gov.jo": "Jcsc@Mab2026bJ6v",
  "mais@jcsc.gov.jo": "Jcsc@Mis2026sH8k",
  "mahmoud@jcsc.gov.jo": "Jcsc@Mhm2026dQ2n",
  "abdelrahman@jcsc.gov.jo": "Jcsc@Abd2026rX5m",
  "ahmad.ay@jcsc.gov.jo": "Jcsc@Aay2026yT7w",
};

export function getProductionPassword(email: string): string | undefined {
  return PRODUCTION_PASSWORDS[email.trim().toLowerCase()];
}

export type CredentialRow = {
  name: string;
  roleLabel: string;
  email: string;
  password: string;
};

export function formatCredentialsMarkdown(rows: CredentialRow[]): string {
  const lines = [
    "# JCSC — بيانات الدخول",
    "",
    "| # | الاسم | الدور | البريد | كلمة المرور |",
    "|---|-------|-------|--------|-------------|",
  ];
  rows.forEach((u, i) => {
    lines.push(`| ${i + 1} | ${u.name} | ${u.roleLabel} | \`${u.email}\` | \`${u.password}\` |`);
  });
  return lines.join("\n");
}
