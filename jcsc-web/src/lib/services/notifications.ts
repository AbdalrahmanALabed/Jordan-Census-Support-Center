import type { Notification } from "@/lib/types";
import type { EscalationNotification } from "@/lib/operations";
import { apiFetchResult, shouldUseMockFallback } from "@/lib/api-client";
import { withBasePath } from "@/lib/base-path";

export interface NotificationListResponse {
  notifications: Array<
    Notification & {
      type: string;
      level: "info" | "warning" | "critical";
      actionRequired?: boolean;
      issueNumber?: string;
      entityType?: string;
      entityId?: string;
    }
  >;
  unreadCount: number;
}

export async function fetchNotifications(
  kind?: "general" | "escalation" | "all"
): Promise<NotificationListResponse | null> {
  const params = kind && kind !== "all" ? `?kind=${kind}` : "";
  const result = await apiFetchResult<NotificationListResponse>(`/api/notifications${params}`);
  if (result.ok) return result.data;
  if (!shouldUseMockFallback(result.status)) return { notifications: [], unreadCount: 0 };
  return null;
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const res = await fetch(withBasePath(`/api/notifications/${id}`), { method: "PATCH" });
  return res.ok;
}

export async function markAllNotificationsRead(): Promise<boolean> {
  const res = await fetch(withBasePath("/api/notifications"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "mark_all_read" }),
  });
  return res.ok;
}

export function toEscalationNotification(
  n: NotificationListResponse["notifications"][number]
): EscalationNotification {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    userId: n.userId,
    createdAt: n.createdAt,
    level: n.level ?? "info",
    ticketNumber: n.issueNumber,
    actionRequired: n.actionRequired,
    entityType: n.entityType,
    entityId: n.entityId,
  };
}
