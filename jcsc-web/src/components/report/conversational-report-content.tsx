"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { MessageCircle, Send, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { triageDescription } from "@/lib/report-triage";
import { createTicketFromTriage } from "@/lib/services";
import { SLA_LABELS } from "@/lib/operations";
import { PRIORITY_LABELS } from "@/lib/types";
import type { TriageResult } from "@/lib/operations";

interface ChatStep {
  role: "assistant" | "user";
  content: string;
}

export function ConversationalReportContent() {
  const router = useRouter();
  const [steps, setSteps] = useState<ChatStep[]>([
    {
      role: "assistant",
      content: "مرحباً! صف المشكلة التي تواجهها بكلماتك البسيطة، وسنُرسلها للفريق المناسب.",
    },
  ]);
  const [input, setInput] = useState("");
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [governorate, setGovernorate] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const createMutation = useMutation({
    mutationFn: createTicketFromTriage,
    onSuccess: (ticket) => {
      setConfirmed(true);
      setSteps((s) => [
        ...s,
        {
          role: "assistant",
          content: `تم إنشاء بلاغك بنجاح! رقم البلاغ: ${ticket.number}. سيتواصل معك فريق الدعم قريباً.`,
        },
      ]);
      setTimeout(() => router.push(`/tickets/${ticket.id}`), 2000);
    },
  });

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setSteps((s) => [...s, { role: "user", content: userText }]);
    setInput("");
    setLoading(true);

    const result = await triageDescription(userText, governorate);
    setTriage(result);

    if (result.clarifyingQuestion && !governorate) {
      setSteps((s) => [
        ...s,
        { role: "assistant", content: result.clarifyingQuestion! },
      ]);
      const detected = result.governorate;
      if (detected) setGovernorate(detected);
    } else {
      setSteps((s) => [
        ...s,
        {
          role: "assistant",
          content: `فهمت مشكلتك:\n\n• النوع: ${result.category}\n• الأولوية: ${PRIORITY_LABELS[result.priority]}\n• وقت الاستجابة: ${SLA_LABELS[result.priority]}\n\nالحل المقترح:\n${result.suggestedSolution}\n\nهل تريد إرسال البلاغ الآن؟`,
        },
      ]);
    }
    setLoading(false);
  };

  const handleConfirm = () => {
    if (!triage) return;
    createMutation.mutate({
      title: triage.title,
      description: steps.filter((s) => s.role === "user").map((s) => s.content).join("\n"),
      issueType: triage.issueType,
      priority: triage.priority,
      team: triage.team,
      governorate: governorate ?? triage.governorate,
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5 text-primary" />
            الإبلاغ عن مشكلة
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            لا حاجة لاختيار فريق أو نوع تقني — فقط صف المشكلة
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4 min-h-[280px]">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`flex ${step.role === "user" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2 text-sm whitespace-pre-line ${
                    step.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border"
                  }`}
                >
                  {step.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <Badge variant="secondary" className="animate-pulse">
                  <Loader2 className="h-3 w-3 me-1 animate-spin" />
                  جاري المعالجة...
                </Badge>
              </div>
            )}
          </div>

          {!confirmed && (
            <div className="flex gap-2">
              <Textarea
                placeholder="مثال: المستخدم في إربد لا يستطيع تسجيل الدخول منذ الصباح..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={2}
              />
              <Button onClick={handleSend} disabled={loading || !input.trim()} className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}

          {triage && !triage.clarifyingQuestion && !confirmed && (
            <div className="flex gap-2">
              <Button onClick={handleConfirm} disabled={createMutation.isPending} className="flex-1">
                <CheckCircle2 className="h-4 w-4" />
                إرسال البلاغ
              </Button>
              <Button variant="outline" onClick={() => { setTriage(null); setSteps([steps[0]]); }}>
                إعادة البدء
              </Button>
            </div>
          )}

          {confirmed && (
            <div className="flex items-center justify-center gap-2 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
              <span>تم إرسال البلاغ بنجاح</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
