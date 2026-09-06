"use client";

import {
  User,
  MapPin,
  Layers,
  Calendar,
  Users,
  Paperclip,
} from "lucide-react";
import { AttachmentCard } from "@/components/shared/attachment-card";
import {
  ATTACHMENT_TYPE_LABELS,
  type FieldReport,
} from "@/lib/reports";
import { CENSUS_SYSTEM_LABELS, type CensusSystem } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { isRealAttachmentUrl } from "@/lib/attachments";

interface ReportDetailsPanelProps {
  report: FieldReport;
  /** وضع المراجعة — الحقول الأساسية فقط */
  reviewMode?: boolean;
}

function FieldRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        {label}
      </p>
      <p className="text-sm font-black leading-relaxed">{value}</p>
    </div>
  );
}

export function ReportDetailsPanel({ report, reviewMode = false }: ReportDetailsPanelProps) {
  const systemLabel = report.affectedSystem
    ? CENSUS_SYSTEM_LABELS[report.affectedSystem as CensusSystem] ?? report.affectedSystem
    : "—";

  const visibleAttachments = report.attachments.filter((a) => isRealAttachmentUrl(a.url));

  return (
    <div className="space-y-5">
      <FieldRow label="وصف البلاغ" value={report.observation} />

      <div className="grid gap-4 sm:grid-cols-2 rounded-xl border-2 bg-muted/30 p-4">
        <FieldRow label="اسم المستخدم" value={report.supervisorName} icon={User} />
        <FieldRow label="النظام" value={systemLabel} icon={Layers} />
        <FieldRow label="المحافظة" value={report.governorate || "—"} icon={MapPin} />
        <FieldRow
          label="عدد الباحثين المتأثرين"
          value={report.enumeratorsAffected ?? 1}
          icon={Users}
        />
        <FieldRow
          label="التاريخ والوقت"
          value={formatDate(report.createdAt)}
          icon={Calendar}
        />
        {!reviewMode && report.number && (
          <FieldRow label="رقم البلاغ" value={report.number} />
        )}
      </div>

      {visibleAttachments.length > 0 ? (
        <div>
          <p className="text-sm font-black mb-3 flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            المرفقات ({visibleAttachments.length})
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleAttachments.map((a) => (
              <AttachmentCard
                key={a.id}
                compact
                item={{
                  id: a.id,
                  name: a.name,
                  url: a.url,
                  kind: a.type,
                  typeLabel: ATTACHMENT_TYPE_LABELS[a.type],
                  size: a.size,
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground rounded-xl border-2 border-dashed p-4 text-center">
          لا توجد مرفقات
        </p>
      )}
    </div>
  );
}
