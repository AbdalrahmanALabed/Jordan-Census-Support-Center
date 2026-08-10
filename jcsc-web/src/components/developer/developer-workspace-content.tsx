"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Code2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IssueStatusBadge, PriorityBadge } from "@/components/shared/status-badges";
import { getIssues } from "@/lib/services/issues";
import { useUserStore } from "@/stores/user-store";
import { formatRelativeDate } from "@/lib/utils";

export function DeveloperWorkspaceContent() {
  const { currentUser } = useUserStore();
  const { data: issues, isLoading } = useQuery({
    queryKey: ["dev-workspace", currentUser?.team],
    queryFn: () => getIssues({ team: currentUser?.team ?? "ALL" }),
  });

  const myIssues = issues?.filter(
    (i) =>
      i.assigneeId === currentUser?.id ||
      i.assigneeName === currentUser?.name
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        مساحة المطور — يمكنك نقل المسائل إلى <strong>جاهز للاختبار</strong> أو <strong>بانتظار النشر</strong> فقط. الإغلاق لمدير العمليات.
      </p>
      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {myIssues?.map((issue) => (
            <Link key={issue.id} href={`/issues/${issue.id}`}>
              <Card className="hover:bg-accent/50 h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Code2 className="h-4 w-4" /> {issue.number}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium line-clamp-2">{issue.title}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <IssueStatusBadge status={issue.status} />
                    <PriorityBadge priority={issue.priority} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{formatRelativeDate(issue.updatedAt)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
