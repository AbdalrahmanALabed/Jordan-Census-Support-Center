"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IssueStatusBadge, PriorityBadge } from "@/components/shared/status-badges";
import { getIssues } from "@/lib/services/issues";
import { getCasesByStatus } from "@/lib/services/cases";
import { formatRelativeDate } from "@/lib/utils";

export function DeploymentQueueContent() {
  const { data: issues } = useQuery({
    queryKey: ["deployment-queue"],
    queryFn: () => getIssues({ status: "WAITING_DEPLOYMENT" }),
  });
  const { data: cases } = useQuery({
    queryKey: ["deployment-cases"],
    queryFn: () => getCasesByStatus("WAITING_DEPLOYMENT"),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">طابور النشر — مسائل وحالات بانتظار نشر الإصلاح</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> مسائل ({issues?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {issues?.map((i) => (
              <Link key={i.id} href={`/issues/${i.id}`} className="block rounded-md border p-3 hover:bg-accent text-sm">
                <span className="font-medium">{i.number}</span> — {i.title}
                <div className="flex gap-2 mt-1"><IssueStatusBadge status={i.status} /><PriorityBadge priority={i.priority} /></div>
              </Link>
            )) ?? <p className="text-sm text-muted-foreground">فارغ</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">حالات ({cases?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {cases?.map((c) => (
              <Link key={c.id} href={`/cases/${c.id}`} className="block rounded-md border p-3 hover:bg-accent text-sm">
                <span className="font-medium">{c.number}</span> — {c.title}
                <p className="text-xs text-muted-foreground mt-1">{formatRelativeDate(c.updatedAt)}</p>
              </Link>
            )) ?? <p className="text-sm text-muted-foreground">فارغ</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
