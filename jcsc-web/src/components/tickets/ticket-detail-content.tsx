"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowRight,
  Paperclip,
  MessageSquare,
  Clock,
  StickyNote,
  Image as ImageIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IssueActionsPanel } from "@/components/tickets/issue-actions-panel";
import { PriorityBadge, IssueStatusBadge } from "@/components/shared/status-badges";
import { TicketIntelligencePanel } from "@/components/tickets/ticket-intelligence-panel";
import {
  getTicketById,
  getTicketComments,
  getTicketAttachments,
  getTicketTimeline,
  getTicketInternalNotes,
  getTicketChecklist,
  getSimilarTickets,
  getSuggestedKnowledge,
} from "@/lib/services";
import { addIssueComment } from "@/lib/services/issues";
import { Textarea } from "@/components/ui/textarea";
import type { Issue } from "@/lib/types";
import { useUserStore } from "@/stores/user-store";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { isTechnicalRole, getFriendlyTeamName } from "@/lib/operations";
import { isManagerRole, hasPermission } from "@/lib/reports";
import { formatDate, formatRelativeDate } from "@/lib/utils";

interface TicketDetailContentProps {
  ticketId: string;
}

export function TicketDetailContent({ ticketId }: TicketDetailContentProps) {
  const queryClient = useQueryClient();
  const user = useEffectiveUser();
  const role = user?.role;
  const isTech = role ? isTechnicalRole(role) : false;
  const canComment = role ? hasPermission(role, "manage_issues") : false;
  const [commentText, setCommentText] = useState("");

  const commentMutation = useMutation({
    mutationFn: (content: string) => addIssueComment(ticketId, content, isTech),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-comments", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-timeline", ticketId] });
      setCommentText("");
    },
  });

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => getTicketById(ticketId),
  });
  const { data: comments } = useQuery({
    queryKey: ["ticket-comments", ticketId],
    queryFn: () => getTicketComments(ticketId),
  });
  const { data: attachments } = useQuery({
    queryKey: ["ticket-attachments", ticketId],
    queryFn: () => getTicketAttachments(ticketId),
  });
  const { data: timeline } = useQuery({
    queryKey: ["ticket-timeline", ticketId],
    queryFn: () => getTicketTimeline(ticketId),
  });
  const { data: internalNotes } = useQuery({
    queryKey: ["ticket-notes", ticketId],
    queryFn: () => getTicketInternalNotes(ticketId),
  });
  const { data: checklist } = useQuery({
    queryKey: ["ticket-checklist", ticketId],
    queryFn: () => getTicketChecklist(ticketId),
  });
  const { data: similar } = useQuery({
    queryKey: ["ticket-similar", ticketId],
    queryFn: () => getSimilarTickets(ticketId),
  });
  const { data: kbArticles } = useQuery({
    queryKey: ["ticket-kb", ticket?.issueType],
    queryFn: () => getSuggestedKnowledge(ticket!.issueType),
    enabled: !!ticket,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        جاري التحميل...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">البلاغ غير موجود</p>
        <Button asChild variant="outline">
          <Link href="/issues">العودة للمسائل</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/issues">
          <ArrowRight className="h-4 w-4" />
          العودة
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{ticket.number}</p>
                  <CardTitle className="mt-1">{ticket.title}</CardTitle>
                </div>
                <div className="flex gap-2">
                  <PriorityBadge priority={ticket.priority} />
                  <IssueStatusBadge status={ticket.status} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {ticket.description && (
                <p className="text-sm text-muted-foreground">{ticket.description}</p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">المحافظة</p>
                  <p className="font-medium">{ticket.governorate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">نوع المشكلة</p>
                  <p className="font-medium">{ticket.issueType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">صاحب البلاغ</p>
                  <p className="font-medium">{ticket.reporterName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">المستخدمون المتأثرون</p>
                  <p className="font-medium">{(ticket as Issue & { enumeratorsAffected?: number }).enumeratorsAffected ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">تاريخ الإنشاء</p>
                  <p className="font-medium">{formatDate(ticket.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="timeline">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="timeline" className="gap-1">
                <Clock className="h-3 w-3" /> السجل
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-1">
                <MessageSquare className="h-3 w-3" /> التعليقات
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-1">
                <Paperclip className="h-3 w-3" /> المرفقات
              </TabsTrigger>
              <TabsTrigger value="screenshot" className="gap-1">
                <ImageIcon className="h-3 w-3" /> لقطة الشاشة
              </TabsTrigger>
              {isTech && (
                <TabsTrigger value="notes" className="gap-1">
                  <StickyNote className="h-3 w-3" /> ملاحظات داخلية
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="timeline">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {timeline?.length ? timeline.map((event) => (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          <div className="w-px flex-1 bg-border" />
                        </div>
                        <div className="pb-4">
                          <p className="font-medium">{event.action}</p>
                          {event.details && (
                            <p className="text-sm text-muted-foreground">{event.details}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeDate(event.createdAt)}
                          </p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-muted-foreground text-sm">لا توجد أحداث</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comments">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {canComment && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="أضف تعليقاً..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={2}
                      />
                      <Button
                        size="sm"
                        disabled={!commentText.trim() || commentMutation.isPending}
                        onClick={() => commentMutation.mutate(commentText)}
                      >
                        إرسال التعليق
                      </Button>
                    </div>
                  )}
                  {comments?.length ? comments.map((c) => (
                    <div key={c.id} className="rounded-md border p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{c.authorName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeDate(c.createdAt)}
                        </p>
                      </div>
                      <p className="mt-2 text-sm">{c.content}</p>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-sm">لا توجد تعليقات</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attachments">
              <Card>
                <CardContent className="pt-6">
                  {attachments?.length ? (
                    <div className="space-y-2">
                      {attachments.map((a) => (
                        <div key={a.id} className="flex items-center gap-3 rounded-md border p-3">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{a.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatRelativeDate(a.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">لا توجد مرفقات</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="screenshot">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30">
                    <div className="text-center">
                      <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        لقطة الشاشة — سيتم دعم التحليل التلقائي لاحقاً
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {isTech && (
              <TabsContent value="notes">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {internalNotes?.length ? internalNotes.map((n) => (
                      <div key={n.id} className="rounded-md border border-amber-500/20 bg-amber-500/5 p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{n.authorName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeDate(n.createdAt)}
                          </p>
                        </div>
                        <p className="mt-2 text-sm">{n.content}</p>
                      </div>
                    )) : (
                      <p className="text-muted-foreground text-sm">لا توجد ملاحظات داخلية</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="space-y-4">
          <TicketIntelligencePanel
            ticket={ticket}
            similar={similar ?? []}
            checklist={checklist ?? []}
            kbArticles={kbArticles ?? []}
          />

          <IssueActionsPanel issue={ticket} />

          {!isTech && !isManagerRole(role) && (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">
                <p>فريق {getFriendlyTeamName(ticket.team, role ?? "DEVELOPER")} يتابع هذه المسألة.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
