const PLACEHOLDER_PATTERNS = [
  "/uploads/placeholder",
  "/placeholder",
  "placeholder.png",
  "placeholder-screenshot",
];

export function isRealAttachmentUrl(url?: string | null): boolean {
  if (!url?.trim()) return false;
  const lower = url.toLowerCase();
  return !PLACEHOLDER_PATTERNS.some((p) => lower === p || lower.includes(p));
}

export function isImageAttachment(url?: string, kind?: string): boolean {
  if (kind === "image" || kind === "IMAGE") return true;
  return Boolean(url?.match(/\.(jpg|jpeg|png|webp|gif|bmp)(\?|$)/i));
}

export function isPdfAttachment(url?: string, kind?: string): boolean {
  if (kind === "pdf" || kind === "PDF") return true;
  return Boolean(url?.match(/\.pdf(\?|$)/i));
}

/** Same-origin download URL with optional forced download */
export function getAttachmentDownloadUrl(storedUrl: string, download = true): string {
  if (!isRealAttachmentUrl(storedUrl)) return storedUrl;
  const params = new URLSearchParams({ path: storedUrl });
  if (download) params.set("download", "1");
  return `/api/attachments/download?${params.toString()}`;
}

export function getAttachmentPreviewUrl(storedUrl: string): string {
  if (!isRealAttachmentUrl(storedUrl)) return storedUrl;
  return `/api/attachments/download?${new URLSearchParams({ path: storedUrl }).toString()}`;
}
