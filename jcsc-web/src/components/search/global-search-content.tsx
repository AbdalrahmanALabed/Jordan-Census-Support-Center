"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, FolderOpen, ClipboardList, Workflow, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { globalSearch } from "@/lib/services/cases";
import { useSearchParams } from "next/navigation";

export function GlobalSearchContent() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initial);

  const { data, isLoading } = useQuery({
    queryKey: ["global-search", query],
    queryFn: () => globalSearch(query),
    enabled: query.length >= 2,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="relative">
        <Search className="absolute start-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input
          className="ps-10 h-12 text-base"
          placeholder="بحث شامل — حالات، بلاغات، مسائل، مستخدمون..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {query.length < 2 ? (
        <p className="text-center text-muted-foreground text-sm">اكتب حرفين على الأقل</p>
      ) : isLoading ? (
        <p className="text-center text-muted-foreground">جاري البحث...</p>
      ) : (
        <div className="space-y-4">
          {[
            { key: "cases", label: "الحالات", icon: FolderOpen, href: (id: string) => `/cases/${id}`, items: data?.cases, render: (c: { id: string; number: string; title: string }) => `${c.number} — ${c.title}` },
            { key: "reports", label: "البلاغات", icon: ClipboardList, href: (id: string) => `/reports/${id}`, items: data?.reports, render: (r: { id: string; number: string; observation: string }) => `${r.number} — ${r.observation}` },
            { key: "issues", label: "المسائل", icon: Workflow, href: (id: string) => `/issues/${id}`, items: data?.issues, render: (i: { id: string; number: string; title: string }) => `${i.number} — ${i.title}` },
            { key: "users", label: "المستخدمون", icon: Users, href: () => `/users`, items: data?.users, render: (u: { id: string; name: string; email: string }) => `${u.name} (${u.email})` },
          ].map(({ key, label, icon: Icon, href, items, render }) =>
            items && items.length > 0 ? (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Icon className="h-4 w-4" /> {label} <Badge variant="secondary">{items.length}</Badge></CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {items.map((item: { id: string }) => (
                    <Link key={item.id} href={href(item.id)} className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                      {render(item as never)}
                    </Link>
                  ))}
                </CardContent>
              </Card>
            ) : null
          )}
          {data && !data.cases.length && !data.reports.length && !data.issues.length && !data.users.length && (
            <p className="text-center text-muted-foreground">لا نتائج</p>
          )}
        </div>
      )}
    </div>
  );
}
