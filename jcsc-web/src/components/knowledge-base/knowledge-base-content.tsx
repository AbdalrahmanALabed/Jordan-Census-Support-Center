"use client";

import { useMemo, useState } from "react";
import { Search, CheckCircle2, BookOpen, Tag, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHero } from "@/components/shared/ops-ui";
import { useUserStore } from "@/stores/user-store";
import { isSupervisorRole, isSupportCoordinatorRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {
  SOLUTION_SYSTEMS,
  groupSolutionsBySystem,
  searchSolutions,
  type SolutionItem,
  type SolutionSystem,
  type SolutionSystemId,
} from "@/lib/knowledge-base/solutions";

type SystemFilter = SolutionSystemId | "ALL";

const SYSTEM_ACCENT: Record<
  SolutionSystem["accent"],
  { header: string; border: string; badge: string; number: string }
> = {
  emerald: {
    header: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
    border: "border-s-emerald-500",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200",
    number: "bg-emerald-600 text-white",
  },
  amber: {
    header: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
    border: "border-s-amber-500",
    badge: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200",
    number: "bg-amber-600 text-white",
  },
  violet: {
    header: "bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800",
    border: "border-s-violet-500",
    badge: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-200",
    number: "bg-violet-600 text-white",
  },
  sky: {
    header: "bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800",
    border: "border-s-sky-500",
    badge: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-200",
    number: "bg-sky-600 text-white",
  },
};

export function KnowledgeBaseContent() {
  const { currentUser } = useUserStore();
  const isSupervisor = isSupervisorRole(currentUser?.role);
  const isCoordinator = isSupportCoordinatorRole(currentUser?.role);
  const [search, setSearch] = useState("");
  const [systemFilter, setSystemFilter] = useState<SystemFilter>("ALL");

  const filtered = useMemo(
    () => searchSolutions(search, systemFilter),
    [search, systemFilter]
  );

  const grouped = useMemo(() => groupSolutionsBySystem(filtered), [filtered]);
  const totalCount = filtered.length;

  return (
    <div dir="rtl" className="space-y-6 max-w-4xl mx-auto text-start">
      <PageHero
        title="الحلول"
        subtitle={
          isSupervisor
            ? "حلول جاهزة للمشاكل الشائعة في الميدان — جرّبها قبل إرسال بلاغ"
            : isCoordinator
              ? "مرجع سريع عند تصنيف البلاغات أو مساعدة المشرفين"
              : "قاعدة الحلول المعتمدة لأنظمة التعداد"
        }
        variant="calm"
      />

      {/* بحث + فلاتر */}
      <Card className="border-2 shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن مشكلة أو ملصق... (مزامنة، GPS، بلوك)"
              className="ps-10 h-12 text-base border-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={systemFilter === "ALL"}
              onClick={() => setSystemFilter("ALL")}
              label="الكل"
            />
            {SOLUTION_SYSTEMS.map((system) => (
              <FilterChip
                key={system.id}
                active={systemFilter === system.id}
                onClick={() => setSystemFilter(system.id)}
                label={`${system.icon} ${system.label}`}
              />
            ))}
          </div>

          <p className="text-sm text-muted-foreground font-bold">
            {totalCount === 0
              ? "لا توجد نتائج"
              : `${totalCount} ${totalCount === 1 ? "حل" : "حلول"}`}
          </p>
        </CardContent>
      </Card>

      {totalCount === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-10">
          {grouped.map(({ system, items }) => (
            <SystemSection key={system.id} system={system} items={items} />
          ))}
        </div>
      )}
    </div>
  );
}

function SystemSection({
  system,
  items,
}: {
  system: SolutionSystem;
  items: SolutionItem[];
}) {
  const accent = SYSTEM_ACCENT[system.accent];

  return (
    <section className="space-y-4">
      {/* رأس القسم — يُبيّن التبعية للنظام */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border-2 px-5 py-4",
          accent.header
        )}
      >
        <span className="text-3xl shrink-0" aria-hidden>
          {system.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black">{system.label}</h2>
          <p className="text-xs text-muted-foreground font-bold mt-0.5">
            {items.length} {items.length === 1 ? "مشكلة" : "مشاكل"}
          </p>
        </div>
        <Badge className={cn("shrink-0 border font-black", accent.badge)}>
          {system.label}
        </Badge>
      </div>

      {/* بطاقة مستقلة لكل مشكلة — عمود واحد */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <SolutionCard
            key={item.id}
            item={item}
            system={system}
            index={index + 1}
            accent={accent}
          />
        ))}
      </div>
    </section>
  );
}

function SolutionCard({
  item,
  system,
  index,
  accent,
}: {
  item: SolutionItem;
  system: SolutionSystem;
  index: number;
  accent: (typeof SYSTEM_ACCENT)[SolutionSystem["accent"]];
}) {
  return (
    <Card
      className={cn(
        "border-2 border-s-4 shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-primary/30",
        accent.border
      )}
    >
      <CardContent className="p-5 space-y-4">
        {/* رأس البطاقة: رقم + عنوان + ملصقات */}
        <div className="flex flex-wrap items-start gap-3">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black",
              accent.number
            )}
          >
            {index}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="font-black text-base leading-snug">{item.title}</h3>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant="outline"
                className={cn("text-xs font-black border", accent.badge)}
              >
                {system.icon} {system.label}
              </Badge>
              {item.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs font-bold gap-1"
                >
                  <Tag className="h-3 w-3 opacity-60" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* خطوات الحل */}
        <div className="rounded-xl bg-muted/40 border p-4">
          <p className="text-xs font-black text-muted-foreground mb-3">تحقق من:</p>
          <ul className="space-y-2.5">
            {item.steps.map((step, stepIndex) => (
              <li
                key={stepIndex}
                className="flex items-start gap-2.5 text-sm leading-relaxed"
              >
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex h-44 flex-col items-center justify-center gap-2 text-muted-foreground rounded-2xl border-2 border-dashed">
      <BookOpen className="h-9 w-9 opacity-40" />
      <p className="font-black">لم يُعثر على حل مطابق</p>
      <p className="text-sm">جرّب كلمات أخرى أو اختر نظاماً مختلفاً</p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border-2 px-4 py-2 text-sm font-bold transition-all",
        active
          ? "border-primary bg-primary/10 text-primary shadow-sm"
          : "border-border bg-background hover:border-primary/30 hover:bg-muted/50"
      )}
    >
      {label}
    </button>
  );
}
