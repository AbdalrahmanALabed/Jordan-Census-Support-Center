"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search, Filter, Copy, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getReports } from "@/lib/services/reports";
import {
  REPORT_STATUS_LABELS,
  type FieldReport,
  type ReportStatus,
} from "@/lib/reports";
import { GOVERNORATES, CENSUS_SYSTEMS, CENSUS_SYSTEM_LABELS, type CensusSystem } from "@/lib/types";
import { useUserStore } from "@/stores/user-store";
import { formatRelativeDate } from "@/lib/utils";
import {
  ReportClassifyDialog,
  canReviewReport,
} from "@/components/reports/report-classify-dialog";

const STATUS_VARIANT: Record<
  ReportStatus,
  "info" | "warning" | "success" | "critical" | "secondary"
> = {
  NEW: "critical",
  UNDER_REVIEW: "warning",
  WAITING_CLASSIFICATION: "info",
  CONVERTED_TO_TICKET: "success",
  REJECTED: "secondary",
  CLOSED: "secondary",
};

export function IncomingReportsContent() {
  const router = useRouter();
  const { currentUser, hasPermission } = useUserStore();
  const userId = currentUser?.id ?? "";
  const canReviewAll = hasPermission("review_reports");
  const [status, setStatus] = useState<ReportStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [governorate, setGovernorate] = useState("ALL");
  const [systemFilter, setSystemFilter] = useState<CensusSystem | "ALL">("ALL");
  const [reviewReport, setReviewReport] = useState<FieldReport | null>(null);

  const openReview = (report: FieldReport) => {
    if (canReviewAll && canReviewReport(report)) {
      setReviewReport(report);
    } else {
      router.push(`/reports/${report.id}`);
    }
  };

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports", status, search, governorate, systemFilter, userId, canReviewAll],
    queryFn: async () => {
      if (!canReviewAll) return [];
      let list = await getReports({ status, search, governorate });
      if (systemFilter !== "ALL") {
        list = list.filter((r) => r.affectedSystem === systemFilter);
      }
      return list;
    },
    enabled: canReviewAll,
  });

  const statusCounts = Object.keys(REPORT_STATUS_LABELS).reduce(
    (acc, key) => {
      acc[key as ReportStatus] = reports?.filter((r) => r.status === key).length ?? 0;
      return acc;
    },
    {} as Record<ReportStatus, number>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.entries(REPORT_STATUS_LABELS) as [ReportStatus, string][]).map(
          ([key, label]) => (
            <Badge
              key={key}
              variant={status === key ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatus(status === key ? "ALL" : key)}
            >
              {label} ({statusCounts[key] ?? 0})
            </Badge>
          )
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-1">
              <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث في الملاحظات..."
                className="ps-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as ReportStatus | "ALL")}>
              <SelectTrigger>
                <Filter className="h-4 w-4 me-2" />
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل الحالات</SelectItem>
                {Object.entries(REPORT_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={systemFilter} onValueChange={(v) => setSystemFilter(v as CensusSystem | "ALL")}>
              <SelectTrigger>
                <SelectValue placeholder="النظام" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل الأنظمة</SelectItem>
                {CENSUS_SYSTEMS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={governorate} onValueChange={setGovernorate}>
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-start">الرقم</th>
                  <th className="px-4 py-3 text-start">الملاحظة</th>
                  <th className="px-4 py-3 text-start">المشرف</th>
                  <th className="px-4 py-3 text-start">النظام</th>
                  <th className="px-4 py-3 text-start">الحالة</th>
                  <th className="px-4 py-3 text-start">مرفقات</th>
                  <th className="px-4 py-3 text-start">التاريخ</th>
                  {canReviewAll && <th className="px-4 py-3 text-start">مراجعة</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={canReviewAll ? 8 : 7} className="px-4 py-8 text-center text-muted-foreground">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : reports?.length === 0 ? (
                  <tr>
                    <td colSpan={canReviewAll ? 8 : 7} className="px-4 py-8 text-center text-muted-foreground">
                      لا توجد بلاغات
                    </td>
                  </tr>
                ) : (
                  reports?.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-b hover:bg-muted/30 ${
                        canReviewAll && canReviewReport(r) ? "cursor-pointer" : ""
                      }`}
                      onClick={() => openReview(r)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-primary">{r.number}</span>
                        {r.similarReportIds?.length ? (
                          <span className="flex items-center gap-1 text-xs text-amber-500 mt-1">
                            <Copy className="h-3 w-3" />
                            مشابه ({r.similarReportIds.length + 1})
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="line-clamp-2">{r.observation}</p>
                      </td>
                      <td className="px-4 py-3">{r.supervisorName}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {r.affectedSystem
                            ? CENSUS_SYSTEM_LABELS[r.affectedSystem as CensusSystem] ?? r.affectedSystem
                            : "—"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[r.status]}>
                          {REPORT_STATUS_LABELS[r.status]}
                        </Badge>
                        {r.managerDecision === "CONFIRMED_PROBLEM" && (
                          <Badge variant="success" className="mt-1 block w-fit text-xs">مشكلة</Badge>
                        )}
                        {r.managerDecision === "NOT_A_PROBLEM" && (
                          <Badge variant="secondary" className="mt-1 block w-fit text-xs">ليست مشكلة</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">{r.attachments.length || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatRelativeDate(r.createdAt)}
                      </td>
                      {canReviewAll && (
                        <td className="px-4 py-3 min-w-[120px]">
                          {canReviewReport(r) ? (
                            <Button
                              size="sm"
                              className="gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReviewReport(r);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              مراجعة
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {reviewReport && (
        <ReportClassifyDialog
          report={reviewReport}
          open={Boolean(reviewReport)}
          onOpenChange={(open) => {
            if (!open) setReviewReport(null);
          }}
          startAtReview
        />
      )}
    </div>
  );
}
