"use client";

import { useQuery } from "@tanstack/react-query";
import { Route } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRoutingRules } from "@/lib/services/reports";
import { CLASSIFICATION_LABELS } from "@/lib/reports";
import { PRIORITY_LABELS } from "@/lib/types";

export function RoutingRulesContent() {
  const { data: rules, isLoading } = useQuery({
    queryKey: ["routing-rules"],
    queryFn: getRoutingRules,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-primary/20 bg-primary/5 p-4 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <Route className="h-4 w-4 text-primary" />
          قواعد التوجيه التلقائي
        </div>
        <p className="text-muted-foreground mt-1">
          النظام يقترح الفريق والتصنيف بناءً على الكلمات — القرار النهائي دائماً لمدير عمليات الدعm
        </p>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
      ) : (
        <div className="space-y-3">
          {rules?.map((rule) => (
            <Card key={rule.id} className={!rule.enabled ? "opacity-50" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Route className="h-4 w-4" />
                    {rule.recommendedTeam}
                  </span>
                  <Badge variant={rule.enabled ? "success" : "secondary"}>
                    {rule.enabled ? "مفعّل" : "معطّل"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-1">
                  {rule.keywords.map((k) => (
                    <Badge key={k} variant="outline" className="text-xs">{k}</Badge>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="info">{CLASSIFICATION_LABELS[rule.recommendedClassification]}</Badge>
                  <Badge variant="secondary">{PRIORITY_LABELS[rule.priority]}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
