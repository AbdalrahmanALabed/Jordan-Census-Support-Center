"use client";

import { useState } from "react";
import { Download, ExternalLink, Eye, FileText, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAttachmentDownloadUrl,
  getAttachmentPreviewUrl,
  isImageAttachment,
  isPdfAttachment,
  isRealAttachmentUrl,
} from "@/lib/attachments";
import { cn } from "@/lib/utils";

export interface AttachmentViewItem {
  id: string;
  name: string;
  url?: string;
  kind?: string;
  typeLabel?: string;
  size?: string | number;
}

export function AttachmentCard({
  item,
  compact,
}: {
  item: AttachmentViewItem;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasFile = isRealAttachmentUrl(item.url);
  const isImage = hasFile && isImageAttachment(item.url, item.kind);
  const isPdf = hasFile && isPdfAttachment(item.url, item.kind);
  const previewUrl = hasFile ? getAttachmentPreviewUrl(item.url!) : "";
  const downloadUrl = hasFile ? getAttachmentDownloadUrl(item.url!, true) : "";

  return (
    <>
      <div
        className={cn(
          "group rounded-2xl border-2 bg-card overflow-hidden transition-all hover:shadow-md hover:border-primary/30",
          !hasFile && "opacity-75"
        )}
      >
        <button
          type="button"
          disabled={!hasFile}
          onClick={() => hasFile && setOpen(true)}
          className={cn(
            "w-full text-start",
            hasFile && "cursor-pointer",
            !hasFile && "cursor-default"
          )}
        >
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={item.name}
              className={cn("w-full object-cover bg-muted", compact ? "h-32" : "h-44")}
            />
          ) : (
            <div
              className={cn(
                "flex items-center justify-center bg-muted/40",
                compact ? "h-24" : "h-28"
              )}
            >
              <FileText className="h-10 w-10 text-muted-foreground/50" />
            </div>
          )}
        </button>

        <div className="flex items-center gap-3 p-4">
          <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
            <Paperclip className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.typeLabel ?? item.kind ?? "مرفق"}
              {item.size ? ` · ${item.size}` : ""}
            </p>
            {!hasFile && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-1">
                الملف غير متوفر — أعد الرفع
              </p>
            )}
          </div>
          {hasFile && (
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                title="معاينة"
                onClick={() => setOpen(true)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" title="تنزيل" asChild>
                <a href={downloadUrl} download={item.name}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-start truncate pe-8">{item.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={item.name}
                className="max-h-[70vh] w-full rounded-xl object-contain bg-muted"
              />
            )}
            {isPdf && (
              <iframe
                src={previewUrl}
                title={item.name}
                className="h-[70vh] w-full rounded-xl border bg-muted"
              />
            )}
            {!isImage && !isPdf && hasFile && (
              <div className="rounded-xl border-2 border-dashed p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  لا تتوفر معاينة مباشرة لهذا النوع — يمكنك فتحه أو تنزيله
                </p>
              </div>
            )}
            {hasFile && (
              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" className="font-bold gap-2" asChild>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    فتح في تبويب جديد
                  </a>
                </Button>
                <Button className="font-bold gap-2" asChild>
                  <a href={downloadUrl} download={item.name}>
                    <Download className="h-4 w-4" />
                    تنزيل الملف
                  </a>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AttachmentsGrid({
  attachments,
  emptyLabel = "لا مرفقات",
}: {
  attachments: AttachmentViewItem[];
  emptyLabel?: string;
}) {
  if (!attachments.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/20 py-14 text-center col-span-2">
        <Paperclip className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="font-bold text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <>
      {attachments.map((a) => (
        <AttachmentCard key={a.id} item={a} />
      ))}
    </>
  );
}
