"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Mail,
  Inbox,
  BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHero, EmptyState } from "@/components/shared/ops-ui";
import { getEmailQueue } from "@/lib/email/engine";
import { getNotifications, getEscalationNotifications } from "@/lib/services";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/services/notifications";
import { formatRelativeDate } from "@/lib/utils";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { isSuperAdminRole } from "@/lib/permissions";
import {
  NotificationDetailDialog,
  NotificationListItem,
  type NotificationViewItem,
} from "@/components/notifications/notification-detail-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function toViewItem(
  n: NotificationViewItem & { issueNumber?: string; ticketNumber?: string }
): NotificationViewItem {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    createdAt: n.createdAt,
    level: n.level,
    actionRequired: n.actionRequired,
    type: n.type,
    entityType: n.entityType,
    entityId: n.entityId,
    referenceNumber: n.referenceNumber ?? n.issueNumber ?? n.ticketNumber,
  };
}

function ListSkeleton() {
  return (
    <div className="space-y-2.5 animate-pulse" dir="rtl">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex rounded-2xl border-2 overflow-hidden border-s-[3px] border-s-muted">
          <div className="flex-1 p-4 flex gap-3 flex-row">
            <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
            <div className="flex-1 space-y-2 text-start">
              <div className="h-4 w-2/3 bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationsContent() {
  const queryClient = useQueryClient();
  const user = useEffectiveUser();
  const isSuperAdmin = isSuperAdminRole(user?.role);
  const [selected, setSelected] = useState<NotificationViewItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: notifications, isLoading: loadingGeneral } = useQuery({
    queryKey: ["notifications", "general"],
    queryFn: getNotifications,
  });
  const { data: escalations, isLoading: loadingEscalations } = useQuery({
    queryKey: ["notifications", "escalations"],
    queryFn: getEscalationNotifications,
  });

  const { data: emailQueue, isLoading: loadingEmail } = useQuery({
    queryKey: ["email-queue"],
    queryFn: () => getEmailQueue(30),
    enabled: isSuperAdmin,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
  });

  const generalItems = useMemo(
    () => (notifications ?? []).map((n) => toViewItem(n as NotificationViewItem)),
    [notifications]
  );

  const escalationItems = useMemo(
    () =>
      (escalations ?? []).map((n) =>
        toViewItem({
          ...n,
          level: n.level,
          ticketNumber: n.ticketNumber,
        } as NotificationViewItem)
      ),
    [escalations]
  );

  const unreadGeneral = generalItems.filter((n) => !n.isRead).length;
  const unreadEscalations = escalationItems.filter((n) => !n.isRead).length;
  const totalUnread = unreadGeneral + unreadEscalations;

  const openNotification = (item: NotificationViewItem) => {
    setSelected(item);
    setDetailOpen(true);
    if (!item.isRead) markReadMutation.mutate(item.id);
  };

  return (
    <div dir="rtl" className="content-container pb-10 space-y-6 text-start">
      <PageHero
        title="الإشعارات"
        subtitle={
          totalUnread > 0
            ? `${totalUnread} إشعار غير مقروء — انقر على أي إشعار لعرض التفاصيل`
            : "لا توجد إشعارات جديدة — أنت على اطلاع بكل شيء"
        }
        variant={totalUnread > 0 ? "urgent" : "calm"}
      >
        <div className="flex flex-wrap gap-2 justify-start">
          {isSuperAdmin && (
            <Button asChild variant="outline" className="font-bold">
              <Link href="/email-templates">
                <Mail className="h-4 w-4" />
                قوالب البريد
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            className="font-bold gap-2"
            disabled={markAllMutation.isPending || totalUnread === 0}
            onClick={() => markAllMutation.mutate()}
          >
            <CheckCheck className="h-4 w-4" />
            تحديد الكل كمقروء
          </Button>
        </div>
      </PageHero>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3 max-w-xl w-full text-center">
        <div className="rounded-xl border-2 bg-red-50/50 dark:bg-red-950/20 border-red-200/60 p-4 text-center">
          <p className="text-2xl font-black tabular-nums text-red-600">{unreadEscalations}</p>
          <p className="text-xs font-bold text-muted-foreground mt-1">تصعيد</p>
        </div>
        <div className="rounded-xl border-2 bg-sky-50/50 dark:bg-sky-950/20 border-sky-200/60 p-4 text-center">
          <p className="text-2xl font-black tabular-nums text-sky-600">{unreadGeneral}</p>
          <p className="text-xs font-bold text-muted-foreground mt-1">عام</p>
        </div>
        <div className="rounded-xl border-2 bg-muted/30 p-4 text-center">
          <p className="text-2xl font-black tabular-nums">{totalUnread}</p>
          <p className="text-xs font-bold text-muted-foreground mt-1">غير مقروء</p>
        </div>
      </div>

      <Tabs defaultValue={unreadEscalations > 0 ? "escalations" : "general"} dir="rtl">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-2xl border-2 bg-muted/30 p-1.5 flex-wrap text-start">
          <TabsTrigger
            value="escalations"
            className="rounded-xl px-5 py-2.5 text-sm font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm flex-row"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>تصعيد</span>
            {unreadEscalations > 0 && (
              <span className="rounded-full bg-red-500 text-white px-2 py-0.5 text-[10px] font-black">
                {unreadEscalations}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="general"
            className="rounded-xl px-5 py-2.5 text-sm font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm flex-row"
          >
            <Bell className="h-4 w-4 shrink-0" />
            <span>عام</span>
            {unreadGeneral > 0 && (
              <span className="rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-black">
                {unreadGeneral}
              </span>
            )}
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger
              value="email"
              className="rounded-xl px-5 py-2.5 text-sm font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm flex-row"
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span>البريد</span>
              {(emailQueue?.length ?? 0) > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-black">
                  {emailQueue?.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="escalations" className="mt-5 space-y-2.5 focus-visible:outline-none">
          {loadingEscalations ? (
            <ListSkeleton />
          ) : escalationItems.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="لا توجد تصعيدات"
              description="ستظهر هنا إشعارات التصعيد والتنبيهات العاجلة"
            />
          ) : (
            escalationItems.map((n) => (
              <NotificationListItem
                key={n.id}
                notification={n}
                onClick={() => openNotification(n)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="general" className="mt-5 space-y-2.5 focus-visible:outline-none">
          {loadingGeneral ? (
            <ListSkeleton />
          ) : generalItems.length === 0 ? (
            <EmptyState
              icon={BellRing}
              title="لا توجد إشعارات"
              description="ستصلك هنا إشعارات الإسناد، الحل، والتحديثات"
            />
          ) : (
            generalItems.map((n) => (
              <NotificationListItem
                key={n.id}
                notification={n}
                onClick={() => openNotification(n)}
              />
            ))
          )}
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="email" className="mt-5 space-y-2.5 focus-visible:outline-none">
            {loadingEmail ? (
              <ListSkeleton />
            ) : emailQueue?.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="لا رسائل في الطابور"
                description="ستظهر رسائل البريد عند التعيين أو التصعيد"
              />
            ) : (
              emailQueue?.map((e) => (
                <Card key={e.id} className="border-2 overflow-hidden">
                  <div
                    className={
                      e.status === "SENT"
                        ? "h-1 bg-emerald-500"
                        : e.status === "FAILED"
                          ? "h-1 bg-red-500"
                          : "h-1 bg-amber-500"
                    }
                  />
                  <CardContent className="p-5 space-y-2 text-start">
                    <div className="flex items-start justify-between gap-3 flex-row">
                      <p className="font-black text-sm leading-snug text-start flex-1">{e.subject}</p>
                      <Badge
                        variant={
                          e.status === "SENT"
                            ? "success"
                            : e.status === "FAILED"
                              ? "critical"
                              : "secondary"
                        }
                      >
                        {e.status === "SENT"
                          ? "مُرسل"
                          : e.status === "FAILED"
                            ? "فشل"
                            : "في الطابور"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      إلى: {e.to} · {e.templateKey}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {e.body}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatRelativeDate(e.createdAt)}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}
      </Tabs>

      <NotificationDetailDialog
        notification={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onMarkRead={(id) => markReadMutation.mutate(id)}
      />
    </div>
  );
}
