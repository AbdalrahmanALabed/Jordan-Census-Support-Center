"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Circle, Loader2, RotateCcw, Video, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const MAX_CAMERA_VIDEO_SECONDS = 20;

type CaptureMode = "photo" | "video";

interface CameraCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: CaptureMode;
  onCaptured: (file: File) => void;
}

function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function CameraCaptureDialog({
  open,
  onOpenChange,
  mode,
  onCaptured,
}: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewKind, setPreviewKind] = useState<CaptureMode | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    timerRef.current = null;
    stopTimeoutRef.current = null;
  }, []);

  const resetPreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
    setPreviewKind(null);
    setElapsed(0);
    setRecording(false);
    chunksRef.current = [];
    recorderRef.current = null;
    clearTimers();
  }, [previewUrl, clearTimers]);

  const closeDialog = useCallback(() => {
    resetPreview();
    stopStream();
    setError("");
    onOpenChange(false);
  }, [onOpenChange, resetPreview, stopStream]);

  const startCamera = useCallback(async () => {
    setError("");
    setLoading(true);
    resetPreview();
    stopStream();
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("الكاميرا غير مدعومة على هذا الجهاز");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: mode === "video",
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError("تعذّر فتح الكاميرا — تحقق من الصلاحيات");
    } finally {
      setLoading(false);
    }
  }, [mode, resetPreview, stopStream]);

  useEffect(() => {
    if (open) {
      void startCamera();
    } else {
      resetPreview();
      stopStream();
      setError("");
    }
    return () => {
      clearTimers();
      stopStream();
    };
  }, [open, mode, startCamera, resetPreview, stopStream, clearTimers]);

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );
    if (!blob) {
      setError("فشل التقاط الصورة");
      return;
    }
    stopStream();
    const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setPreviewFile(file);
    setPreviewKind("photo");
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    clearTimers();
    setRecording(false);
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    const mime = pickRecorderMime();
    if (!mime) {
      setError("تسجيل الفيديو غير مدعوم على هذا المتصفح");
      return;
    }
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      const ext = mime.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `video-${Date.now()}.${ext}`, { type: mime });
      stopStream();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewFile(file);
      setPreviewKind("video");
      setRecording(false);
      clearTimers();
    };
    recorder.start(250);
    setRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    stopTimeoutRef.current = setTimeout(() => {
      stopRecording();
    }, MAX_CAMERA_VIDEO_SECONDS * 1000);
  }

  function confirmCapture() {
    if (!previewFile) return;
    onCaptured(previewFile);
    closeDialog();
  }

  function retryCapture() {
    resetPreview();
    void startCamera();
  }

  const title = mode === "photo" ? "التقاط صورة" : "تسجيل فيديو";
  const remaining = Math.max(0, MAX_CAMERA_VIDEO_SECONDS - elapsed);

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : closeDialog())}>
      <DialogContent className="max-w-lg p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-5 pt-5 pb-2 text-start">
          <DialogTitle className="flex items-center gap-2 font-black">
            {mode === "photo" ? (
              <Camera className="h-5 w-5 text-primary" />
            ) : (
              <Video className="h-5 w-5 text-primary" />
            )}
            {title}
          </DialogTitle>
          {mode === "video" && !previewUrl && (
            <p className="text-xs text-muted-foreground font-medium">
              الحد الأقصى {MAX_CAMERA_VIDEO_SECONDS} ثانية — يتوقف التسجيل تلقائياً
            </p>
          )}
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          {error && (
            <p className="text-sm font-bold text-destructive rounded-lg bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black ring-2 ring-border">
            {previewUrl ? (
              previewKind === "photo" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="معاينة" className="h-full w-full object-contain" />
              ) : (
                <video src={previewUrl} controls className="h-full w-full object-contain" />
              )
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={cn("h-full w-full object-cover", loading && "opacity-40")}
                />
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-white" />
                  </div>
                )}
                {recording && (
                  <div className="absolute top-3 start-3 flex items-center gap-2 rounded-full bg-red-600/90 px-3 py-1 text-xs font-black text-white">
                    <Circle className="h-2.5 w-2.5 fill-white animate-pulse" />
                    {elapsed}s / {MAX_CAMERA_VIDEO_SECONDS}s · متبقي {remaining}s
                  </div>
                )}
              </>
            )}
          </div>

          {previewUrl ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1 gap-2 font-bold" onClick={retryCapture}>
                <RotateCcw className="h-4 w-4" />
                إعادة
              </Button>
              <Button type="button" className="flex-1 gap-2 font-bold" onClick={confirmCapture}>
                <Check className="h-4 w-4" />
                استخدام
              </Button>
            </div>
          ) : mode === "photo" ? (
            <Button
              type="button"
              className="w-full h-12 gap-2 font-black"
              disabled={loading || !!error}
              onClick={() => void capturePhoto()}
            >
              <Camera className="h-5 w-5" />
              التقاط الصورة
            </Button>
          ) : (
            <Button
              type="button"
              className={cn(
                "w-full h-12 gap-2 font-black",
                recording && "bg-red-600 hover:bg-red-700"
              )}
              disabled={loading || !!error}
              onClick={() => (recording ? stopRecording() : startRecording())}
            >
              {recording ? (
                <>
                  <Circle className="h-5 w-5 fill-current" />
                  إيقاف ({remaining}s)
                </>
              ) : (
                <>
                  <Video className="h-5 w-5" />
                  بدء التسجيل
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
