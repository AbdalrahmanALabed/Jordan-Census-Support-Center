const STORAGE_PREFIX = "jcsc-case-lock:";

export function getOrCreateCaseLockToken(caseId: string): string {
  if (typeof window === "undefined") return "";
  const key = `${STORAGE_PREFIX}${caseId}`;
  let token = sessionStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(key, token);
  }
  return token;
}

export function withCaseLockToken<T extends Record<string, unknown>>(
  caseId: string,
  body: T
): T & { lockToken: string } {
  return { ...body, lockToken: getOrCreateCaseLockToken(caseId) };
}
