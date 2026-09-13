"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Circle, Loader2, Mic, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const MAX_VOICE_NOTE_SECONDS = 60;

interface VoiceNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCaptured: (file: File) => void;
}

function pickAudioMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function VoiceNoteDialog({ open, onOpenChange, onCaptured }: VoiceNoteDialogProps) {
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

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
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

  const startMic = useCallback(async () => {
    setError("");
    setLoading(true);
    resetPreview();
    stopStream();
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("الميكروفون غير مدعوم");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch {
      setError("تعذّر فتح الميكروفون — تحقق من الصلاحيات");
    } finally {
      setLoading(false);
    }
  }, [resetPreview, stopStream]);

  useEffect(() => {
    if (open) {
      void startMic();
    } else {
      resetPreview();
      stopStream();
      setError("");
    }
    return () => {
      clearTimers();
      stopStream();
    };
  }, [open, startMic, resetPreview, stopStream, clearTimers]);

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
    const mime = pickAudioMime();
    if (!mime) {
      setError("تسجيل الصوت غير مدعوم على هذا المتصفح");
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
      const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
      const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mime });
      stopStream();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewFile(file);
      setRecording(false);
      clearTimers();
    };
    recorder.start(250);
    setRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    stopTimeoutRef.current = setTimeout(stopRecording, MAX_VOICE_NOTE_SECONDS * 1000);
  }

  function confirmCapture() {
    if (!previewFile) return;
    onCaptured(previewFile);
    closeDialog();
  }

  function retryCapture() {
    resetPreview();
    void startMic();
  }

  const remaining = Math.max(0, MAX_VOICE_NOTE_SECONDS - elapsed);

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : closeDialog())}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader className="text-start">
          <DialogTitle className="flex items-center gap-2 font-black">
            <Mic className="h-5 w-5 text-primary" />
            تسجيل فويس نوت
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-medium">
            الحد الأقصى {MAX_VOICE_NOTE_SECONDS} ثانية
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <p className="text-sm font-bold text-destructive rounded-lg bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}

          <div
            className={cn(
              "flex flex-col items-center justify-center gap-4 rounded-2xl border-2 bg-muted/30 p-8",
              recording && "border-red-500/50 bg-red-500/5"
            )}
          >
            {loading ? (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            ) : (
              <div
                className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-full border-4",
                  recording
                    ? "border-red-500 bg-red-500/10 animate-pulse"
                    : "border-primary/30 bg-primary/10"
                )}
              >
                <Mic className={cn("h-10 w-10", recording ? "text-red-600" : "text-primary")} />
              </div>
            )}

            {recording && (
              <p className="text-sm font-black text-red-600">
                جاري التسجيل · {elapsed}s / {MAX_VOICE_NOTE_SECONDS}s
              </p>
            )}

            {previewUrl && (
              <audio src={previewUrl} controls className="w-full max-w-xs" />
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
                إرفاق
              </Button>
            </div>
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
                  <Mic className="h-5 w-5" />
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
