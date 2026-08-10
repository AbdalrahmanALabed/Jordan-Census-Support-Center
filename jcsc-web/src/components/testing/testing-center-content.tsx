"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IssueStatusBadge, PriorityBadge } from "@/components/shared/status-badges";
import { getIssues } from "@/lib/services/issues";
import { getCasesByStatus } from "@/lib/services/cases";

export function TestingCenterContent() {
  const { data: issues } = useQuery({
    queryKey: ["testing-queue"],
    queryFn: () => getIssues({ status: "READY_FOR_TESTING" }),
  });
  const { data: cases } = useQuery({
    queryKey: ["testing-cases"],
    queryFn: () => getCasesByStatus("READY_FOR_TESTING"),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        مركز الاختبار — مدير العمليات يُغلق بعد التحقق. المطورون يرسلون هنا فقط.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FlaskConical className="h-4 w-4" /> جاهزة للاختبار ({issues?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {issues?.map((i) => (
              <Link key={i.id} href={`/issues/${i.id}`} className="block rounded-md border p-3 hover:bg-accent text-sm">
                <span className="font-medium">{i.number}</span> — {i.title}
                <div className="flex gap-2 mt-1"><IssueStatusBadge status={i.status} /><PriorityBadge priority={i.priority} /></div>
              </Link>
            )) ?? <p className="text-sm text-muted-foreground">لا مسائل</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">حالات ({cases?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {cases?.map((c) => (
              <Link key={c.id} href={`/cases/${c.id}`} className="block rounded-md border p-3 hover:bg-accent text-sm">
                {c.number} — {c.title}
              </Link>
            )) ?? <p className="text-sm text-muted-foreground">لا حالات</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
