export const PASSWORD_MIN_LENGTH = 8;
const MAX_LEN = 128;

/** تلميحات للمستخدم — يجب أن تطابق validatePasswordStrength */
export const PASSWORD_HINT_LINES: readonly string[] = [
  `${PASSWORD_MIN_LENGTH} أحرف على الأقل (حد أقصى ${MAX_LEN})`,
  "حرف واحد على الأقل (عربي أو إنجليزي)",
  "رقم واحد على الأقل (0–9)",
  "حرف إنجليزي كبير واحد على الأقل (A–Z)",
  "رمز خاص واحد على الأقل (مثل @ # $ ! &)",
];

export const PASSWORD_HINT_SUMMARY =
  "8+ أحرف، حروف، رقم، حرف كبير A–Z، ورمز خاص (@ # $ …)";

/** رسالة خطأ بالعربية أو null إذا صالحة */
export function validatePasswordStrength(password: string): string | null {
  const p = password.trim();
  if (p.length < PASSWORD_MIN_LENGTH) {
    return `كلمة المرور يجب أن تكون ${PASSWORD_MIN_LENGTH} أحرف على الأقل`;
  }
  if (p.length > MAX_LEN) {
    return "كلمة المرور طويلة جداً";
  }
  if (!/[a-zA-Z\u0600-\u06FF]/.test(p)) {
    return "يجب أن تحتوي على حروف";
  }
  if (!/[0-9]/.test(p)) {
    return "يجب أن تحتوي على رقم واحد على الأقل";
  }
  if (!/[A-Z]/.test(p)) {
    return "يجب أن تحتوي على حرف إنجليزي كبير واحد على الأقل (A–Z)";
  }
  if (!/[^a-zA-Z0-9\u0600-\u06FF]/.test(p)) {
    return "يجب أن تحتوي على رمز خاص (مثل @ # $ !)";
  }
  return null;
}

export function passwordsMatch(newPassword: string, confirmPassword: string): boolean {
  return newPassword.trim() === confirmPassword.trim();
}
