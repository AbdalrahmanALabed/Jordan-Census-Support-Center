"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PriorityBadge, IssueStatusBadge } from "@/components/shared/status-badges";
import { getIssues, type IssueFilters } from "@/lib/services/issues";
import {
  ISSUE_STATUS_LABELS,
  PRIORITY_LABELS,
  GOVERNORATES,
  ISSUE_CATEGORIES,
  TEAMS,
  type Issue,
} from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";

export function IssuesContent() {
  const [filters, setFilters] = useState<IssueFilters>({
    search: "",
    status: "ALL",
    priority: "ALL",
    governorate: "ALL",
    issueType: "ALL",
    team: "ALL",
    sortBy: "updatedAt",
    sortDir: "desc",
  });

  const { data: issues, isLoading } = useQuery({
    queryKey: ["issues", filters],
    queryFn: () => getIssues(filters),
  });

  const updateFilter = <K extends keyof IssueFilters>(
    key: K,
    value: IssueFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSort = (field: keyof Issue) => {
    if (filters.sortBy === field) {
      updateFilter("sortDir", filters.sortDir === "asc" ? "desc" : "asc");
    } else {
      setFilters((prev) => ({ ...prev, sortBy: field, sortDir: "desc" }));
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>فلترة وبحث — مسائل عمليات الدعم</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم المسألة، العنوان، المحافظة..."
                className="ps-9"
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
              />
            </div>
            <Select
              value={filters.status}
              onValueChange={(v) => updateFilter("status", v as IssueFilters["status"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="مرحلة العمليات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل المراحل</SelectItem>
                {Object.entries(ISSUE_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.priority}
              onValueChange={(v) => updateFilter("priority", v as IssueFilters["priority"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="الأولوية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل الأولويات</SelectItem>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.governorate}
              onValueChange={(v) => updateFilter("governorate", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="المحافظة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل المحافظات</SelectItem>
                {GOVERNORATES.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.issueType}
              onValueChange={(v) => updateFilter("issueType", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="التصنيف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل التصنيفات</SelectItem>
                {ISSUE_CATEGORIES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.team}
              onValueChange={(v) => updateFilter("team", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="الفريق" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل الفرق</SelectItem>
                {TEAMS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-start font-medium">
                    <Button variant="ghost" size="sm" onClick={() => toggleSort("number")}>
                      رقم المسألة
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-start font-medium">مرحلة العمليات</th>
                  <th className="px-4 py-3 text-start font-medium">الأولوية</th>
                  <th className="px-4 py-3 text-start font-medium">المحافظة</th>
                  <th className="px-4 py-3 text-start font-medium">التصنيف</th>
                  <th className="px-4 py-3 text-start font-medium">الفريق</th>
                  <th className="px-4 py-3 text-start font-medium">المصدر</th>
                  <th className="px-4 py-3 text-start font-medium">
                    <Button variant="ghost" size="sm" onClick={() => toggleSort("updatedAt")}>
                      آخر تحديث
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-start font-medium">المكلّف</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : issues?.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      لا توجد مسائل
                    </td>
                  </tr>
                ) : (
                  issues?.map((issue) => (
                    <tr key={issue.id} className="border-b transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/issues/${issue.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {issue.number}
                        </Link>
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                          {issue.title}
                        </p>
                      </td>
                      <td className="px-4 py-3"><IssueStatusBadge status={issue.status} /></td>
                      <td className="px-4 py-3"><PriorityBadge priority={issue.priority} /></td>
                      <td className="px-4 py-3">{issue.governorate}</td>
                      <td className="px-4 py-3">{issue.issueType}</td>
                      <td className="px-4 py-3">{issue.team}</td>
                      <td className="px-4 py-3">{issue.reporterName ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatRelativeDate(issue.updatedAt)}
                      </td>
                      <td className="px-4 py-3">{issue.assigneeName ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** @deprecated Use IssuesContent */
export const TicketsContent = IssuesContent;
