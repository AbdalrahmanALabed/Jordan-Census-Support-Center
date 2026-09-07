import { randomBytes } from "crypto";

const PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$!";

/** كلمة مرور عشوائية للحسابات الجديدة */
export function generateSecurePassword(length = 14): string {
  const bytes = randomBytes(length);
  let suffix = "";
  for (let i = 0; i < length - 5; i++) {
    suffix += PASSWORD_CHARS[bytes[i] % PASSWORD_CHARS.length];
  }
  return `Jcsc@${suffix}`;
}
