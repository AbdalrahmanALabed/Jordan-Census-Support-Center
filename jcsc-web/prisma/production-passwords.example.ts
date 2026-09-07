/**
 * انسخ هذا الملف إلى production-passwords.ts وعبّئ كلمات المرور.
 * cp prisma/production-passwords.example.ts prisma/production-passwords.ts
 */
export const PRODUCTION_PASSWORDS: Record<string, string> = {
  "admin@jcsc.gov.jo": "CHANGE_ME_UniquePassword1",
  "support-supervisor@jcsc.gov.jo": "CHANGE_ME_UniquePassword2",
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
