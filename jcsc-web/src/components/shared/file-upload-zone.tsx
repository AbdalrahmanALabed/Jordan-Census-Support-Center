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
  compact?: boolean;
}

export function FileUploadZone({
  files,
  onChange,
  accept = "image/*,.pdf,.mp4,.mp3,.wav,.log,.txt",
  label = "ارفع صور أو ملفات",
  maxFiles = 6,
  compact = false,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  async function handleFiles(list: FileList | File[] | null) {
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
      setDragActive(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(i: number) {
    onChange(files.filter((_, idx) => idx !== i));
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading && files.length < maxFiles) setDragActive(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (uploading || files.length >= maxFiles) return;
    handleFiles(e.dataTransfer.files);
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

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && files.length < maxFiles && inputRef.current?.click()}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-all cursor-pointer",
          compact ? "p-5" : "p-8",
          dragActive
            ? "border-primary bg-primary/10 scale-[1.01]"
            : "hover:border-primary hover:bg-primary/5",
          (uploading || files.length >= maxFiles) && "opacity-60 pointer-events-none"
        )}
      >
        {uploading ? (
          <Loader2 className={cn("animate-spin text-primary", compact ? "h-8 w-8" : "h-10 w-10")} />
        ) : (
          <Upload className={cn("text-primary", compact ? "h-8 w-8" : "h-10 w-10")} />
        )}
        <div className="text-center pointer-events-none">
          <p className={cn("font-bold", compact ? "text-sm" : "text-base")}>
            {dragActive ? "أفلت الملف هنا" : label}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            اسحب وأفلت · أو انقر للاختيار — صور · PDF · فيديو · حتى 10 MB
          </p>
        </div>
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      {files.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {files.map((f, i) => (
            <div key={`${f.url}-${i}`} className="flex items-center gap-3 rounded-xl border-2 bg-muted/30 p-3">
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
