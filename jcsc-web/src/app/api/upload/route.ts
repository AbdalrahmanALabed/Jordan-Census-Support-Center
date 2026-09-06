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
  "application/pdf",
  "video/mp4",
  "audio/mpeg",
  "audio/wav",
  "text/plain",
];

function attachmentType(mime: string, fileName: string): "IMAGE" | "PDF" | "VIDEO" | "VOICE" | "LOG" {
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("video/")) return "VIDEO";
  if (mime.startsWith("audio/")) return "VOICE";
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

    if (!ALLOWED.includes(file.type) && !file.name.endsWith(".log")) {
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
