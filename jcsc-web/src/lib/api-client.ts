/** Shared fetch helpers — never fall back to mock data on HTTP errors (403/500). */

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error?: string };

export async function apiFetchResult<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, status: res.status, error: body.error };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function apiFetchOrThrow<T>(path: string, init?: RequestInit): Promise<T> {
  const result = await apiFetchResult<T>(path, init);
  if (result.ok) return result.data;
  throw new Error(
    result.error ?? (result.status === 403 ? "غير مصرح" : `خطأ ${result.status || "شبكة"}`)
  );
}

/** Returns data, empty array/null on HTTP error, mock only when offline (status 0). */
export function shouldUseMockFallback(status: number): boolean {
  return status === 0;
}
