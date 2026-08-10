"use client";

import { useRef, useState } from "react";
import { Upload, X, ImageIcon, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface UploadedFile {
  url: string;
  name: string;
  size: number;
  attachmentType: "IMAGE" | "PDF" | "VIDEO" | "VOICE" | "LOG";
  preview?: string;
}

export async function uploadFile(file: File): Promise<UploadedFile> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "فشل الرفع");
  }
  const data = (await res.json()) as UploadedFile;
  return {
    url: data.url,
    name: data.name,
    size: data.size,
    attachmentType: data.attachmentType,
    preview: file.type.startsWith("image/") ? data.url : undefined,
  };
}

interface FileUploadZoneProps {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  accept?: string;
  label?: string;
  maxFiles?: number;
}

export function FileUploadZone({
  files,
  onChange,
  accept = "image/*,.pdf,.mp4,.mp3,.wav,.log,.txt",
  label = "ارفع صور أو ملفات",
  maxFiles = 6,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    setError("");
    setUploading(true);
    const next = [...files];
    try {
      for (const file of Array.from(list)) {
        if (next.length >= maxFiles) break;
        const uploaded = await uploadFile(file);
        next.push(uploaded);
      }
      onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(i: number) {
    onChange(files.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple
        onChange={(e) => handleFiles(e.target.files)}
      />

      <button
        type="button"
        disabled={uploading || files.length >= maxFiles}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-all",
          "hover:border-primary hover:bg-primary/5",
          uploading && "opacity-60 pointer-events-none"
        )}
      >
        {uploading ? (
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        ) : (
          <Upload className="h-10 w-10 text-primary" />
        )}
        <div className="text-center">
          <p className="font-bold text-base">{label}</p>
          <p className="text-sm text-muted-foreground mt-1">صور · PDF · فيديو · صوت · سجل — حتى 10 MB</p>
        </div>
      </button>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      {files.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {files.map((f, i) => (
            <div key={f.url} className="flex items-center gap-3 rounded-xl border-2 bg-muted/30 p-3">
              {f.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.preview} alt={f.name} className="h-14 w-14 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted shrink-0">
                  {f.attachmentType === "PDF" ? (
                    <FileText className="h-6 w-6 text-primary" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-primary" />
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeAt(i)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
