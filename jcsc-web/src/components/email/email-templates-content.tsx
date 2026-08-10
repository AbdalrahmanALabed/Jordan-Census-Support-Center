"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Mail,
  FileText,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  ArrowLeftRight,
  Inbox,
  ChevronDown,
  ChevronUp,
  Braces,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHero, EmptyState } from "@/components/shared/ops-ui";
import { getEmailTemplates } from "@/lib/email/engine";
import { cn } from "@/lib/utils";

type EmailTemplate = {
  id: string;
  key: string;
  name: string;
  subject: string;
  body: string;
};

const TEMPLATE_META: Record<
  string,
  { icon: React.ElementType; accent: string; description: string }
> = {
  report_received: {
    icon: Inbox,
    accent: "border-s-sky-500 bg-sky-50/40 dark:bg-sky-950/20",
    description: "يُرسل للسوبر أدمن عند وصول بلاغ ميداني جديد",
  },
  case_assigned: {
    icon: UserPlus,
    accent: "border-s-primary bg-primary/5",
    description: "يُرسل للمطور عند إسناد حالة إليه",
  },
  sla_breach: {
    icon: AlertTriangle,
    accent: "border-s-red-500 bg-red-50/40 dark:bg-red-950/20",
    description: "تنبيه عند تجاوز وقت الاستجابة المحدد",
  },
  case_closed: {
    icon: CheckCircle2,
    accent: "border-s-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20",
    description: "يُرسل عند إغلاق الحالة",
  },
  shift_handover: {
    icon: ArrowLeftRight,
    accent: "border-s-violet-500 bg-violet-50/40 dark:bg-violet-950/20",
    description: "يُرسل عند تسليم الوردية بين الفريق",
  },
};

function extractVariables(...texts: string[]): string[] {
  const vars = new Set<string>();
  for (const text of texts) {
    const matches = text.match(/\{\{(\w+)\}\}/g) ?? [];
    for (const m of matches) {
      vars.add(m.slice(2, -2));
    }
  }
  return [...vars];
}

function TemplatesSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border-2 p-6 space-y-4">
          <div className="h-5 w-1/2 bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
          <div className="h-24 bg-muted rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function TemplateCard({ template }: { template: EmailTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TEMPLATE_META[template.key] ?? {
    icon: Mail,
    accent: "border-s-muted bg-muted/20",
    description: "قالب بريد إلكتروني",
  };
  const Icon = meta.icon;
  const variables = useMemo(
    () => extractVariables(template.subject, template.body),
    [template.subject, template.body]
  );

  return (
    <article
      className={cn(
        "rounded-2xl border-2 overflow-hidden transition-shadow hover:shadow-md border-s-[3px]",
        meta.accent
      )}
    >
      <div className="p-5 md:p-6 space-y-4 text-start">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-xl bg-background/80 p-2.5 shrink-0 shadow-sm ring-1 ring-border/50">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="text-base font-black leading-snug">{template.name}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{meta.description}</p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] shrink-0">
            {template.key}
          </Badge>
        </div>

        <div className="rounded-xl border bg-background/70 p-4 space-y-1">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">
            الموضوع
          </p>
          <p className="text-sm font-bold leading-relaxed" dir="auto">
            {template.subject}
          </p>
        </div>

        <div className="rounded-xl border bg-background/70 overflow-hidden">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-bold hover:bg-muted/40 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              محتوى الرسالة
            </span>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {expanded ? (
            <pre
              className="whitespace-pre-wrap border-t bg-muted/30 p-4 text-xs leading-relaxed font-sans text-start max-h-64 overflow-y-auto"
              dir="auto"
            >
              {template.body}
            </pre>
          ) : (
            <p className="border-t px-4 py-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed text-start">
              {template.body}
            </p>
          )}
        </div>

        {variables.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black text-muted-foreground flex items-center gap-1.5">
              <Braces className="h-3.5 w-3.5" />
              متغيرات القالب
            </p>
            <div className="flex flex-wrap gap-1.5">
              {variables.map((v) => (
                <span
                  key={v}
                  dir="ltr"
                  className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold font-mono text-primary"
                >
                  {`{{${v}}}`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export function EmailTemplatesContent() {
  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: getEmailTemplates,
  });

  return (
    <div dir="rtl" className="content-container pb-10 space-y-6 text-start">
      <Button asChild variant="ghost" className="gap-2 text-base font-bold -ms-2">
        <Link href="/notifications">
          <ArrowRight className="h-5 w-5" />
          العودة للإشعارات
        </Link>
      </Button>

      <PageHero
        title="قوالب البريد الإلكتروني"
        subtitle="قوالب جاهزة تُستخدم تلقائياً عند التعيين، التصعيد، تسليم الوردية، وإغلاق الحالات"
        variant="calm"
      >
        <div className="flex items-center gap-2 rounded-xl bg-background/60 border px-4 py-2.5">
          <Mail className="h-5 w-5 text-primary" />
          <span className="text-sm font-black tabular-nums">
            {templates?.length ?? 0} قالب
          </span>
        </div>
      </PageHero>

      <div className="rounded-xl border-2 border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
        هذه القوالب للمعاينة حالياً. عند إرسال بريد، تُستبدل المتغيرات مثل{" "}
        <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-primary">
          {"{{caseNumber}}"}
        </code>{" "}
        بالقيم الفعلية.
      </div>

      {isLoading ? (
        <TemplatesSkeleton />
      ) : !templates?.length ? (
        <EmptyState
          icon={Mail}
          title="لا توجد قوالب"
          description="لم يتم تعريف قوالب بريد بعد"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      )}
    </div>
  );
}
