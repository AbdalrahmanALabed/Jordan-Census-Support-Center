import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireSession } from "@/lib/api-auth";
import { withBasePath } from "@/lib/base-path";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/3gpp",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
  "audio/x-m4a",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function isAllowedUpload(mime: string, fileName: string): boolean {
  if (ALLOWED.includes(mime)) return true;
  if (fileName.endsWith(".log")) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif|pdf|mp4|mov|webm|3gp|mkv|mp3|wav|m4a|ogg|txt|doc|docx)$/i.test(
    fileName
  );
}

function attachmentType(mime: string, fileName: string): "IMAGE" | "PDF" | "VIDEO" | "VOICE" | "LOG" {
  if (mime.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(fileName)) return "IMAGE";
  if (mime === "application/pdf" || /\.pdf$/i.test(fileName)) return "PDF";
  if (mime.startsWith("video/") || /\.(mp4|mov|webm|3gp|mkv)$/i.test(fileName)) return "VIDEO";
  if (mime.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|webm)$/i.test(fileName)) return "VOICE";
  if (fileName.endsWith(".log")) return "LOG";
  return "LOG";
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "لم يُرفَع ملف" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "الملف أكبر من 10 ميجابايت" }, { status: 400 });
    }

    if (!isAllowedUpload(file.type, file.name)) {
      return NextResponse.json({ error: "نوع الملف غير مدعوم" }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.name) || "";
    const safeBase = file.name
      .replace(ext, "")
      .replace(/[^a-zA-Z0-9\u0600-\u06FF._-]/g, "_")
      .slice(0, 60);
    const filename = `${Date.now()}-${safeBase}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadsDir, filename), buffer);

    return NextResponse.json({
      url: withBasePath(`/uploads/${filename}`),
      name: file.name,
      size: file.size,
      mime: file.type,
      attachmentType: attachmentType(file.type, file.name),
      uploadedBy: session!.user.name,
    });
  } catch (err) {
    console.error("upload error:", err);
    return NextResponse.json({ error: "فشل رفع الملف" }, { status: 500 });
  }
}
