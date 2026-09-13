/**
 * نسخة احتياطية — الملف الفعلي production-passwords.ts مرفوع على GitHub للإطلاق.
 * للبيئات الجديدة: cp prisma/production-passwords.example.ts prisma/production-passwords.ts
 */
export { PRODUCTION_PASSWORDS, getProductionPassword, formatCredentialsMarkdown } from "./production-passwords";
export type { CredentialRow } from "./production-passwords";
