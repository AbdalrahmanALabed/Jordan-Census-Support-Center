"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  Upload,
  X,
  ImageIcon,
  FileText,
  Loader2,
  Camera,
  Video,
  Mic,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { withBasePath } from "@/lib/base-path";
import { CameraCaptureDialog } from "@/components/shared/camera-capture-dialog";
import { VoiceNoteDialog } from "@/components/shared/voice-note-dialog";

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
  const res = await fetch(withBasePath("/api/upload"), { method: "POST", body: form });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "فشل الرفع");
  }
  const data = (await res.json()) as UploadedFile;
  const preview =
    file.type.startsWith("image/") || file.type.startsWith("audio/")
      ? data.url
      : undefined;
  return {
    url: data.url,
    name: data.name,
    size: data.size,
    attachmentType: data.attachmentType,
    preview,
  };
}

type PickerKind = "image" | "video" | "file";

const PICKER_ACCEPT: Record<PickerKind, string> = {
  image: "image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif",
  video: "video/*,.mp4,.mov,.webm,.3gp,.mkv",
  file: "application/pdf,.pdf,.log,.txt,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx",
};

interface FileUploadZoneProps {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  accept?: string;
  label?: string;
  maxFiles?: number;
  compact?: boolean;
}

function attachmentIcon(type: UploadedFile["attachmentType"]) {
  switch (type) {
    case "PDF":
    case "LOG":
      return FileText;
    case "VIDEO":
      return Video;
    case "VOICE":
      return Mic;
    default:
      return ImageIcon;
  }
}

export function FileUploadZone({
  files,
  onChange,
  accept,
  label = "مرفقات البلاغ",
  maxFiles = 6,
  compact = false,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<"photo" | "video">("photo");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [pickerKind, setPickerKind] = useState<PickerKind>("file");
  const dragDepthRef = useRef(0);

  const atLimit = files.length >= maxFiles;
  const disabled = uploading || atLimit;

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
      dragDepthRef.current = 0;
      setDragActive(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function openPicker(kind: PickerKind) {
    if (disabled) return;
    setPickerKind(kind);
    if (inputRef.current) {
      inputRef.current.accept = accept ?? PICKER_ACCEPT[kind];
      inputRef.current.click();
    }
  }

  function removeAt(i: number) {
    onChange(files.filter((_, idx) => idx !== i));
  }

  function onDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragDepthRef.current += 1;
    setDragActive(true);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    e.dataTransfer.dropEffect = "copy";
    setDragActive(true);
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragActive(false);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setDragActive(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }

  const actionBtnClass = cn(
    "h-auto min-h-11 flex-col gap-1.5 py-2.5 px-2 font-bold text-xs sm:text-sm sm:flex-row sm:gap-2",
    compact && "min-h-10 py-2 text-xs"
  );

  return (
    <div
      className={cn(
        "relative space-y-3 rounded-2xl transition-all",
        dragActive && "ring-2 ring-primary ring-offset-2 bg-primary/5 p-2 -m-2"
      )}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary/10">
          <p className="text-base font-black text-primary">أفلت الملف هنا للرفع</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept ?? PICKER_ACCEPT[pickerKind]}
        multiple
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openPicker("file");
        }}
        onClick={() => openPicker("file")}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-all cursor-pointer",
          compact ? "p-5" : "p-6",
          dragActive
            ? "border-primary bg-primary/10 scale-[1.01]"
            : "hover:border-primary hover:bg-primary/5",
          disabled && "opacity-60 pointer-events-none"
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
            اسحب الملف وأفلته هنا · أو اختر من الأزرار — حتى {maxFiles} مرفقات · 10 MB
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Button
          type="button"
          variant="outline"
          className={actionBtnClass}
          disabled={disabled}
          onClick={() => openPicker("image")}
        >
          <ImageIcon className="h-4 w-4 shrink-0" />
          صورة من الجهاز
        </Button>
        <Button
          type="button"
          variant="outline"
          className={actionBtnClass}
          disabled={disabled}
          onClick={() => openPicker("video")}
        >
          <Video className="h-4 w-4 shrink-0" />
          فيديو من الجهاز
        </Button>
        <Button
          type="button"
          variant="outline"
          className={actionBtnClass}
          disabled={disabled}
          onClick={() => openPicker("file")}
        >
          <FolderOpen className="h-4 w-4 shrink-0" />
          ملف / PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          className={actionBtnClass}
          disabled={disabled}
          onClick={() => {
            setCameraMode("photo");
            setCameraOpen(true);
          }}
        >
          <Camera className="h-4 w-4 shrink-0" />
          التقاط صورة
        </Button>
        <Button
          type="button"
          variant="outline"
          className={actionBtnClass}
          disabled={disabled}
          onClick={() => {
            setCameraMode("video");
            setCameraOpen(true);
          }}
        >
          <Video className="h-4 w-4 shrink-0" />
          تسجيل فيديو
        </Button>
        <Button
          type="button"
          variant="outline"
          className={actionBtnClass}
          disabled={disabled}
          onClick={() => setVoiceOpen(true)}
        >
          <Mic className="h-4 w-4 shrink-0" />
          فويس نوت
        </Button>
      </div>

      <CameraCaptureDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        mode={cameraMode}
        onCaptured={(file) => {
          setCameraOpen(false);
          void handleFiles([file]);
        }}
      />

      <VoiceNoteDialog
        open={voiceOpen}
        onOpenChange={setVoiceOpen}
        onCaptured={(file) => {
          setVoiceOpen(false);
          void handleFiles([file]);
        }}
      />

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      {files.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {files.map((f, i) => {
            const Icon = attachmentIcon(f.attachmentType);
            return (
              <div
                key={`${f.url}-${i}`}
                className="flex items-start gap-3 rounded-xl border-2 bg-muted/30 p-3"
              >
                {f.preview && f.attachmentType === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.preview} alt={f.name} className="h-14 w-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-bold text-sm truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.attachmentType === "IMAGE"
                      ? "صورة"
                      : f.attachmentType === "VIDEO"
                        ? "فيديو"
                        : f.attachmentType === "VOICE"
                          ? "فويس نوت"
                          : f.attachmentType === "PDF"
                            ? "PDF"
                            : "ملف"}{" "}
                    · {(f.size / 1024).toFixed(0)} KB
                  </p>
                  {f.preview && f.attachmentType === "VOICE" && (
                    <audio src={f.preview} controls className="h-8 w-full max-w-full" />
                  )}
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeAt(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
