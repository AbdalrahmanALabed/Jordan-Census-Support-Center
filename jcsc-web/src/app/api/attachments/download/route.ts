import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { requireSession } from "@/lib/api-auth";
import { isRealAttachmentUrl } from "@/lib/attachments";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".log": "text/plain",
  ".txt": "text/plain",
};

export async function GET(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const storedPath = req.nextUrl.searchParams.get("path");
  const forceDownload = req.nextUrl.searchParams.get("download") === "1";

  if (!storedPath || !storedPath.startsWith("/uploads/") || !isRealAttachmentUrl(storedPath)) {
    return NextResponse.json({ error: "مسار الملف غير صالح" }, { status: 400 });
  }

  const filename = path.basename(storedPath);
  if (!filename || filename.includes("..")) {
    return NextResponse.json({ error: "اسم الملف غير صالح" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "public", "uploads", filename);

  try {
    await stat(filePath);
    const buffer = await readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const mime = MIME[ext] ?? "application/octet-stream";
    const originalName = filename.replace(/^\d+-/, "") || filename;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": forceDownload
          ? `attachment; filename="${encodeURIComponent(originalName)}"`
          : `inline; filename="${encodeURIComponent(originalName)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "الملف غير موجود على الخادم" }, { status: 404 });
  }
}
