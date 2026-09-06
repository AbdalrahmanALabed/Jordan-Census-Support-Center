export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/Support_Center";

export function withBasePath(path: string): string {
  let raw = path;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const u = new URL(path);
      raw = `${u.pathname}${u.search}${u.hash}`;
    } catch {
      return path;
    }
  }
  if (!raw.startsWith("/") || raw.startsWith("//")) return raw;
  if (!BASE_PATH) return raw;
  if (raw === BASE_PATH || raw.startsWith(`${BASE_PATH}/`)) return raw;
  return `${BASE_PATH}${raw}`;
}
