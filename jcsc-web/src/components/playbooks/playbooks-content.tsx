"use client";

import { useQuery } from "@tanstack/react-query";
import { BookMarked, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlaybooks } from "@/lib/services";

export function PlaybooksContent() {
  const { data: playbooks, isLoading } = useQuery({
    queryKey: ["playbooks"],
    queryFn: () => getPlaybooks(),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        دلائل خطوة بخطوة للمشاكل الشائعة — تقلل وقت الحل وتجنب الأخطاء
      </p>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {playbooks?.map((pb) => (
            <Card key={pb.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookMarked className="h-4 w-4 text-primary" />
                  {pb.title}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">{pb.issueType}</Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {pb.estimatedMinutes} دقيقة
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {pb.steps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
