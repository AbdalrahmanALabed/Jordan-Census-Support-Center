"use client";

import {
  Paperclip,
  Image,
  Video,
  Mic,
  FileText,
  File,
  User,
  MapPin,
  Layers,
  Calendar,
  Users,
} from "lucide-react";
import {
  ATTACHMENT_TYPE_LABELS,
  type AttachmentType,
  type FieldReport,
} from "@/lib/reports";
import { CENSUS_SYSTEM_LABELS, type CensusSystem } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const ATTACHMENT_ICONS: Record<AttachmentType, React.ElementType> = {
  image: Image,
  video: Video,
  voice: Mic,
  log: FileText,
  pdf: File,
};

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

      {report.attachments.length > 0 ? (
        <div>
          <p className="text-sm font-black mb-2 flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            المرفقات ({report.attachments.length})
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {report.attachments.map((a) => {
              const Icon = ATTACHMENT_ICONS[a.type];
              const content = (
                <>
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ATTACHMENT_TYPE_LABELS[a.type]}
                      {a.size ? ` · ${a.size}` : ""}
                    </p>
                  </div>
                </>
              );
              return a.url && a.url !== "/placeholder" ? (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border-2 p-3 hover:bg-muted/50 transition-colors"
                >
                  {content}
                </a>
              ) : (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border-2 p-3 opacity-80"
                >
                  {content}
                </div>
              );
            })}
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
