"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Inbox, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge, IssueStatusBadge } from "@/components/shared/status-badges";
import { getQueueByTeam } from "@/lib/services/reports";
import { CONVERSION_TEAMS } from "@/lib/reports";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { isManagerRole } from "@/lib/reports";
import { formatRelativeDate } from "@/lib/utils";

function QueueCard({ teamLabel, teamInternal }: { teamLabel: string; teamInternal: string }) {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["team-queue", teamInternal],
    queryFn: () => getQueueByTeam(teamInternal),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            {teamLabel}
          </span>
          <Badge variant="secondary">{tickets?.length ?? 0}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-64 overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        ) : tickets?.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد مسائل</p>
        ) : (
          tickets?.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/issues/${ticket.id}`}
              className="flex items-start justify-between rounded-md border p-3 hover:bg-accent transition-colors"
            >
              <div>
                {ticket.priority === "CRITICAL" && (
                  <AlertTriangle className="h-3 w-3 text-red-500 mb-1" />
                )}
                <p className="text-xs text-muted-foreground">{ticket.number}</p>
                <p className="text-sm font-medium line-clamp-1">{ticket.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatRelativeDate(ticket.updatedAt)}
                </p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <PriorityBadge priority={ticket.priority} />
                <IssueStatusBadge status={ticket.status} />
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function TeamQueueContent() {
  const user = useEffectiveUser();
  const role = user?.role;
  const isManager = role ? isManagerRole(role) : false;

  const userTeam = user?.team;
  const myTeam =
    CONVERSION_TEAMS.find(
      (q) => userTeam && q.internal.toLowerCase().includes(userTeam.toLowerCase())
    ) ?? CONVERSION_TEAMS[0];

  const visibleTeams = isManager ? CONVERSION_TEAMS : [myTeam];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {isManager ? "طوابير عمل جميع الفرق" : `طابور: ${myTeam.label}`}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {visibleTeams.map((team) => (
          <QueueCard key={team.id} teamLabel={team.label} teamInternal={team.internal} />
        ))}
      </div>
    </div>
  );
}
