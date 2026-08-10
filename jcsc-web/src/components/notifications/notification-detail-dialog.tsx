"use client";

import { useRouter } from "next/navigation";
import {
  Bell,
  AlertTriangle,
  Info,
  ExternalLink,
  CheckCheck,
  Clock,
  FolderOpen,
  FileText,
  Wrench,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate, formatRelativeDate } from "@/lib/utils";

export type NotificationViewItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  level?: "info" | "warning" | "critical";
  actionRequired?: boolean;
  type?: string;
  entityType?: string;
  entityId?: string;
  referenceNumber?: string;
};

const LEVEL_STYLES = {
  critical: {
    strip: "border-s-red-500",
    icon: "bg-red-500/15 text-red-600 dark:text-red-400",
    border: "border-red-200/70 dark:border-red-900/50",
    bg: "bg-red-50/40 dark:bg-red-950/20",
  },
  warning: {
    strip: "border-s-amber-500",
    icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    border: "border-amber-200/70 dark:border-amber-900/50",
    bg: "bg-amber-50/40 dark:bg-amber-950/20",
  },
  info: {
    strip: "border-s-sky-500",
    icon: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    border: "border-border/60",
    bg: "bg-card",
  },
};

const TYPE_LABELS: Record<string, string> = {
  case_assigned: "إسناد حالة",
  case_solved: "حل حالة",
  case_closed: "إغلاق حالة",
  case_returned: "إرجاع حالة",
  escalation_unacknowledged: "تصعيد — لم يُقرأ",
  escalation_sla: "تصعيد — تجاوز SLA",
};

function notificationHref(entityType?: string, entityId?: string): string | null {
  if (!entityId) return null;
  if (entityType === "Case") return `/cases/${entityId}`;
  if (entityType === "Report") return `/reports/${entityId}`;
  if (entityType === "Issue") return `/issues/${entityId}`;
  return null;
}

function entityLabel(entityType?: string): string {
  if (entityType === "Case") return "حالة";
  if (entityType === "Report") return "بلاغ";
  if (entityType === "Issue") return "مسألة";
  return "مرتبط";
}

function LevelIcon({ level }: { level: "info" | "warning" | "critical" }) {
  if (level === "critical") return <AlertTriangle className="h-5 w-5" />;
  if (level === "warning") return <Bell className="h-5 w-5" />;
  return <Info className="h-5 w-5" />;
}

function EntityIcon({ entityType }: { entityType?: string }) {
  if (entityType === "Case") return <Wrench className="h-4 w-4" />;
  if (entityType === "Report") return <FileText className="h-4 w-4" />;
  return <FolderOpen className="h-4 w-4" />;
}

export function NotificationDetailDialog({
  notification,
  open,
  onOpenChange,
  onMarkRead,
}: {
  notification: NotificationViewItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkRead?: (id: string) => void;
}) {
  const router = useRouter();
  if (!notification) return null;

  const level = notification.level ?? "info";
  const styles = LEVEL_STYLES[level];
  const href = notificationHref(notification.entityType, notification.entityId);
  const typeLabel = notification.type ? TYPE_LABELS[notification.type] ?? notification.type : null;

  const goToEntity = () => {
    if (!notification.isRead) onMarkRead?.(notification.id);
    if (href) {
      onOpenChange(false);
      router.push(href);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg p-0 gap-0 overflow-hidden text-start">
        <div className={cn("h-1.5 w-full", level === "critical" ? "bg-red-500" : level === "warning" ? "bg-amber-500" : "bg-sky-500")} />

        <div className="p-6 space-y-5 text-start">
          <DialogHeader className="space-y-3 text-start sm:text-start">
            <div className="flex items-start gap-3 flex-row">
              <div className={cn("rounded-xl p-3 shrink-0", styles.icon)}>
                <LevelIcon level={level} />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {!notification.isRead && (
                    <Badge className="bg-primary text-primary-foreground font-bold">جديد</Badge>
                  )}
                  {notification.actionRequired && (
                    <Badge variant="destructive" className="font-bold">
                      يتطلب إجراء
                    </Badge>
                  )}
                  {typeLabel && (
                    <Badge variant="outline" className="font-bold">
                      {typeLabel}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl font-black leading-snug">
                  {notification.title}
                </DialogTitle>
                <DialogDescription asChild>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 text-start">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span title={formatDate(notification.createdAt)}>
                      {formatRelativeDate(notification.createdAt)}
                    </span>
                    <span className="text-muted-foreground/50">·</span>
                    <span>{formatDate(notification.createdAt)}</span>
                  </p>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className={cn("rounded-2xl border-2 p-5 text-start", styles.border, styles.bg)}>
            <p className="text-base leading-relaxed whitespace-pre-wrap text-start">{notification.message}</p>
          </div>

          {(notification.referenceNumber || notification.entityType) && (
            <div className="flex flex-wrap gap-2 justify-start">
              {notification.referenceNumber && (
                <span
                  dir="ltr"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-black font-mono"
                >
                  {notification.referenceNumber}
                </span>
              )}
              {notification.entityType && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/30 px-3 py-1.5 text-xs font-bold text-muted-foreground">
                  <EntityIcon entityType={notification.entityType} />
                  {entityLabel(notification.entityType)}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-1 sm:justify-start">
            {href && (
              <Button className="flex-1 sm:flex-none h-11 font-black gap-2" onClick={goToEntity}>
                <ExternalLink className="h-4 w-4" />
                عرض {entityLabel(notification.entityType)}
              </Button>
            )}
            {!notification.isRead && (
              <Button
                variant="outline"
                className="h-11 font-bold gap-2"
                onClick={() => {
                  onMarkRead?.(notification.id);
                  onOpenChange(false);
                }}
              >
                <CheckCheck className="h-4 w-4" />
                تحديد كمقروء
              </Button>
            )}
            <Button
              variant="ghost"
              className="h-11 font-bold sm:me-auto"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 ms-1" />
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function NotificationListItem({
  notification,
  onClick,
}: {
  notification: NotificationViewItem;
  onClick: () => void;
}) {
  const level = notification.level ?? "info";
  const styles = LEVEL_STYLES[level];
  const href = notificationHref(notification.entityType, notification.entityId);

  return (
    <button
      type="button"
      dir="rtl"
      onClick={onClick}
      className={cn(
        "group w-full text-start rounded-2xl border-2 overflow-hidden transition-all duration-200",
        "hover:shadow-md hover:border-primary/25 hover:-translate-y-0.5",
        !notification.isRead
          ? cn(styles.border, styles.bg, "ring-1 ring-primary/10")
          : "border-border/60 bg-card opacity-90 hover:opacity-100"
      )}
    >
      <div
        className={cn(
          "flex flex-row items-stretch",
          !notification.isRead ? cn("border-s-[3px]", styles.strip) : "border-s border-border/40"
        )}
      >
        <div className="flex flex-1 items-start gap-3 p-4 min-w-0 text-start">
          <div className={cn("rounded-xl p-2.5 shrink-0 mt-0.5", styles.icon)}>
            <LevelIcon level={level} />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5 text-start">
            <div className="flex flex-wrap items-center gap-1.5 justify-start">
              <p className="font-black text-sm leading-snug group-hover:text-primary transition-colors text-start">
                {notification.title}
              </p>
              {!notification.isRead && (
                <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse-soft" />
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed text-start">
              {notification.message}
            </p>
            <div className="flex items-center justify-between gap-2 pt-1 w-full">
              <div className="flex flex-wrap items-center gap-2">
                {notification.referenceNumber && (
                  <span
                    dir="ltr"
                    className="text-[10px] font-bold font-mono text-primary"
                  >
                    {notification.referenceNumber}
                  </span>
                )}
                {notification.actionRequired && (
                  <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-5">
                    إجراء
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-muted-foreground">
                  {formatRelativeDate(notification.createdAt)}
                </span>
                {href && (
                  <ExternalLink className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

export { notificationHref, entityLabel, TYPE_LABELS };
