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
import { PriorityBadge, StatusBadge } from "@/components/shared/status-badges";
import { getTickets, type TicketFilters } from "@/lib/services";
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  GOVERNORATES,
  ISSUE_TYPES,
  TEAMS,
  type Ticket,
} from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";

export function TicketsContent() {
  const [filters, setFilters] = useState<TicketFilters>({
    search: "",
    status: "ALL",
    priority: "ALL",
    governorate: "ALL",
    issueType: "ALL",
    team: "ALL",
    sortBy: "updatedAt",
    sortDir: "desc",
  });

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets", filters],
    queryFn: () => getTickets(filters),
  });

  const updateFilter = <K extends keyof TicketFilters>(
    key: K,
    value: TicketFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSort = (field: keyof Ticket) => {
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
          <CardTitle>فلترة وبحث</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم التذكرة، العنوان، المحافظة..."
                className="ps-9"
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
              />
            </div>
            <Select
              value={filters.status}
              onValueChange={(v) => updateFilter("status", v as TicketFilters["status"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل الحالات</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.priority}
              onValueChange={(v) => updateFilter("priority", v as TicketFilters["priority"])}
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
                <SelectValue placeholder="نوع المشكلة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل الأنواع</SelectItem>
                {ISSUE_TYPES.map((t) => (
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
                      رقم التذكرة
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-start font-medium">الحالة</th>
                  <th className="px-4 py-3 text-start font-medium">الأولوية</th>
                  <th className="px-4 py-3 text-start font-medium">المحافظة</th>
                  <th className="px-4 py-3 text-start font-medium">نوع المشكلة</th>
                  <th className="px-4 py-3 text-start font-medium">الفريق</th>
                  <th className="px-4 py-3 text-start font-medium">صاحب البلاغ</th>
                  <th className="px-4 py-3 text-start font-medium">
                    <Button variant="ghost" size="sm" onClick={() => toggleSort("updatedAt")}>
                      آخر تحديث
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-start font-medium">المسؤول</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : tickets?.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      لا توجد تذاكر
                    </td>
                  </tr>
                ) : (
                  tickets?.map((ticket) => (
                    <tr key={ticket.id} className="border-b transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {ticket.number}
                        </Link>
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                          {ticket.title}
                        </p>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                      <td className="px-4 py-3"><PriorityBadge priority={ticket.priority} /></td>
                      <td className="px-4 py-3">{ticket.governorate}</td>
                      <td className="px-4 py-3">{ticket.issueType}</td>
                      <td className="px-4 py-3">{ticket.team}</td>
                      <td className="px-4 py-3">{ticket.reporterName ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatRelativeDate(ticket.updatedAt)}
                      </td>
                      <td className="px-4 py-3">{ticket.assigneeName ?? "—"}</td>
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
