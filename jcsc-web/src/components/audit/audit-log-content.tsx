"use client";

import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAuditLog, getDecisionLog } from "@/lib/services/cases";
import { formatDate } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AuditLogContent() {
  const { data: audit } = useQuery({ queryKey: ["audit-log"], queryFn: () => getAuditLog(100) });
  const { data: decisions } = useQuery({ queryKey: ["decision-log"], queryFn: getDecisionLog });

  return (
    <Tabs defaultValue="audit">
      <TabsList>
        <TabsTrigger value="audit">سجل التدقيق</TabsTrigger>
        <TabsTrigger value="decisions">سجل القرارات</TabsTrigger>
      </TabsList>
      <TabsContent value="audit" className="mt-4 space-y-2">
        {audit?.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">{a.action}</Badge>
                <span>{a.entityType} {a.details && `— ${a.details}`}</span>
              </div>
              <span className="text-xs text-muted-foreground">{a.userName} · {formatDate(a.createdAt)}</span>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
      <TabsContent value="decisions" className="mt-4 space-y-2">
        {decisions?.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-3 text-sm">
              <div className="flex justify-between">
                <Badge>{d.decision}</Badge>
              </div>
              {d.reason && <p className="mt-1 text-muted-foreground">{d.reason}</p>}
              <p className="text-xs text-muted-foreground mt-1">{d.decidedBy} · {formatDate(d.decidedAt)}</p>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  );
}
