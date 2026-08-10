"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Copy,
  BookOpen,
  ArrowUpRight,
  CheckSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Ticket } from "@/lib/types";
import type {
  SimilarTicket,
  TicketChecklistItem,
} from "@/lib/operations";
import type { KnowledgeArticle } from "@/lib/types";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { hasPermission } from "@/lib/reports";
import { isDeveloperRole } from "@/lib/permissions";
import { toggleChecklistItem } from "@/lib/services/issues";

interface Props {
  ticket: Ticket;
  similar: SimilarTicket[];
  checklist: TicketChecklistItem[];
  kbArticles: KnowledgeArticle[];
}

export function TicketIntelligencePanel({
  ticket,
  similar,
  checklist,
  kbArticles,
}: Props) {
  const queryClient = useQueryClient();
  const user = useEffectiveUser();
  const role = user?.role;
  const canManage = role ? hasPermission(role, "manage_issues") : false;
  const isDev = role ? isDeveloperRole(role) : false;

  const checklistMutation = useMutation({
    mutationFn: ({ itemId, completed }: { itemId: string; completed: boolean }) =>
      toggleChecklistItem(ticket.id, itemId, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-checklist", ticket.id] });
    },
  });

  return (
    <div className="space-y-4">
      {checklist.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="h-4 w-4" />
              قائمة التحقق
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {checklist.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  disabled={!canManage || checklistMutation.isPending}
                  onChange={(e) =>
                    checklistMutation.mutate({ itemId: item.id, completed: e.target.checked })
                  }
                  className="rounded border-input"
                />
                <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                  {item.label}
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      {similar.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Copy className="h-4 w-4" />
              بلاغات مشابهة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {similar.map((s) => (
              <Link
                key={s.id}
                href={`/issues/${s.id}`}
                className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-accent transition-colors"
              >
                <div>
                  <p className="font-medium">{s.number}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{s.title}</p>
                </div>
                <Badge variant="secondary">
                  {Math.round(s.similarity * 100)}%
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {kbArticles.length > 0 && !isDev && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" />
              مقالات مقترحة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {kbArticles.map((a) => (
              <div key={a.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
              </div>
            ))}
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/knowledge-base">عرض قاعدة المعرفة</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
