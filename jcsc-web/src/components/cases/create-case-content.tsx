"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Save,
  Layers,
  UserCheck,
  FileText,
  MapPin,
  Phone,
  Users,
  Search,
  CheckCircle2,
  ArrowLeft,
  Paperclip,
  Info,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpecialtyAssignSelect } from "@/components/shared/specialty-assign-select";
import { PrioritySeverityFields } from "@/components/shared/priority-severity-fields";
import { PageHero } from "@/components/shared/ops-ui";
import { FileUploadZone, type UploadedFile } from "@/components/shared/file-upload-zone";
import { NumberStepper } from "@/components/shared/number-stepper";
import type { CaseSeverity } from "@/lib/cases/types";
import {
  GOVERNORATES,
  CENSUS_SYSTEMS,
  censusSystemToLabel,
  RESEARCHER_ISSUE_TYPES,
  type IssuePriority,
  type CensusSystem,
  type ResearcherIssueType,
} from "@/lib/types";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { useToast } from "@/components/ui/toast";
import { isSuperAdminRole, isSupportCoordinatorRole } from "@/lib/permissions";
import { addCaseAttachment, createCaseManual } from "@/lib/services/cases";
import { submitFieldReport } from "@/lib/services/reports";
import type { AttachmentType } from "@/lib/reports";
import { cn } from "@/lib/utils";

const QUICK_TEMPLATES = [
  "تعذّر تسجيل الدخول",
  "فشل مزامنة البيانات",
  "التطبيق يتوقف أثناء الاستخدام",
  "بيانات غير دقيقة في النظام",
];

const SYSTEM_ICONS: Record<CensusSystem, React.ElementType> = {
  CALL_CENTER: Phone,
  SELF_ENUMERATION: Users,
  RESEARCHER_SYSTEM: Search,
  FIELD_OPERATIONS: MapPin,
};

function mapUploadType(type: UploadedFile["attachmentType"]): AttachmentType {
  if (type === "IMAGE") return "image";
  if (type === "VIDEO") return "video";
  if (type === "VOICE") return "voice";
  if (type === "PDF") return "pdf";
  return "log";
}

function SectionCard({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border-2 bg-card shadow-sm overflow-hidden text-start">
      <div className="flex items-start gap-3 border-b bg-muted/30 px-5 py-4 md:px-6">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-sm font-black text-white shadow-sm"
          aria-hidden
        >
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base md:text-lg font-black leading-snug">{title}</h3>
          {hint && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{hint}</p>
          )}
        </div>
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function FieldLabel({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 text-start">
      <label className="block text-sm font-black text-foreground">
        {label}
        {required && <span className="text-destructive ms-1">*</span>}
      </label>
      {children}
    </div>
  );
}

export function CreateCaseContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { status: sessionStatus } = useSession();
  const user = useEffectiveUser();
  const isAdmin = isSuperAdminRole(user?.role);
  const isCoordinator = isSupportCoordinatorRole(user?.role);

  const [description, setDescription] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [affectedUsers, setAffectedUsers] = useState(1);
  const [affectedSystem, setAffectedSystem] = useState<CensusSystem>("FIELD_OPERATIONS");
  const [researcherIssueType, setResearcherIssueType] = useState<ResearcherIssueType | "">("");
  const [priority, setPriority] = useState<IssuePriority>("MEDIUM");
  const [severity, setSeverity] = useState<CaseSeverity>("MEDIUM");
  const [assignedDeveloperId, setAssignedDeveloperId] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isAdmin) {
        const created = await createCaseManual({
          description: description.trim(),
          caseType: "BUG",
          priority,
          severity,
          governorate: governorate.trim() || undefined,
          affectedSystem: censusSystemToLabel(affectedSystem),
          affectedUsers: Math.max(1, affectedUsers),
          createdBy: user?.id ?? "",
          createdByName: user?.name ?? "مستخدم",
          developerId: assignedDeveloperId || undefined,
        });
        for (const f of files) {
          await addCaseAttachment(created.id, f.name, f.attachmentType, f.url, f.size);
        }
        return { kind: "case" as const, data: created };
      }

      const report = await submitFieldReport({
        observation: description.trim(),
        governorate: governorate.trim(),
        enumeratorsAffected: Math.max(1, affectedUsers),
        affectedSystem,
        researcherIssueType:
          affectedSystem === "RESEARCHER_SYSTEM" ? researcherIssueType : undefined,
        supervisorId: user?.id ?? "",
        supervisorName: user?.name ?? "مستخدم",
        attachmentNames: files.map((f) => ({
          name: f.name,
          type: mapUploadType(f.attachmentType),
          url: f.url,
        })),
      });
      return { kind: "report" as const, data: report };
    },
    onSuccess: (result) => {
      toast("تم حفظ البلاغ", "success");
      router.push(
        result.kind === "case" ? `/cases/${result.data.id}` : "/reports/my"
      );
    },
    onError: (err: Error) => toast(err.message || "فشل حفظ البلاغ", "error"),
  });

  const canSave = isAdmin
    ? description.trim().length > 0 &&
      Boolean(affectedSystem) &&
      Boolean(assignedDeveloperId)
    : description.trim().length > 0 &&
      Boolean(affectedSystem) &&
      Boolean(governorate.trim()) &&
      affectedUsers >= 1 &&
      (affectedSystem !== "RESEARCHER_SYSTEM" || Boolean(researcherIssueType));

  const selectedSystemLabel =
    CENSUS_SYSTEMS.find((s) => s.value === affectedSystem)?.label ?? "";

  if (sessionStatus === "loading" && !user) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="content-container max-w-5xl space-y-6 pb-28 lg:pb-10" dir="rtl">
      <PageHero
        title="إنشاء بلاغ"
        subtitle={
          isAdmin
            ? "صِف المشكلة، حدّد النظام والأولوية، واسند للتخصص المناسب"
            : isCoordinator
              ? "سجّل بلاغاً ميدانياً — يظهر في قائمة التصنيف للمتابعة"
              : "صف ما حدث في الميدان — يصل البلاغ لمنسق الدعم للتصنيف"
        }
        variant="default"
      >
        <Button
          type="button"
          variant="outline"
          className="font-bold gap-2 border-2"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          رجوع
        </Button>
      </PageHero>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="space-y-5 min-w-0">
          <SectionCard
            step={1}
            title="وصف المشكلة"
            hint="اكتب بلغة واضحة: ماذا حدث؟ متى؟ ومن تأثر؟"
          >
            <div className="space-y-4">
              <div className="text-start">
                <p className="text-xs font-bold text-muted-foreground mb-2">عبارات جاهزة</p>
                <div className="flex flex-wrap gap-2 justify-start">
                  {QUICK_TEMPLATES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDescription(t)}
                      className={cn(
                        "rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition-colors text-start",
                        description === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/40 hover:border-primary/40 hover:bg-muted"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <FieldLabel label="التفاصيل" required>
                <Textarea
                  placeholder="مثال: في محافظة إربد، الباحثون لا يستطيعون تسجيل الدخول منذ صباح اليوم..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  autoFocus
                  dir="auto"
                  className="border-2 text-base min-h-[140px] resize-y text-start leading-relaxed"
                />
                <p className="text-xs text-muted-foreground text-start">
                  {description.trim().length > 0
                    ? `${description.trim().length} حرف`
                    : "الوصف مطلوب للمتابعة"}
                </p>
              </FieldLabel>
            </div>
          </SectionCard>

          <SectionCard
            step={2}
            title="النظام المتأثر"
            hint="اختر النظام الذي ظهرت فيه المشكلة"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {CENSUS_SYSTEMS.map(({ value, label }) => {
                const Icon = SYSTEM_ICONS[value];
                const active = affectedSystem === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setAffectedSystem(value);
                      if (value !== "RESEARCHER_SYSTEM") setResearcherIssueType("");
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 p-4 text-start transition-all",
                      active
                        ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20"
                        : "border-border bg-muted/30 hover:border-primary/35 hover:bg-muted/50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-primary"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-black leading-snug">{label}</span>
                      {active && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs font-bold text-primary">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          محدّد
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            {affectedSystem === "RESEARCHER_SYSTEM" && (
              <div className="mt-5 pt-5 border-t space-y-3">
                <FieldLabel label="نوع المشكلة في نظام الباحث" required>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {RESEARCHER_ISSUE_TYPES.map(({ value, label }) => {
                      const active = researcherIssueType === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setResearcherIssueType(value)}
                          className={cn(
                            "rounded-xl border-2 p-4 text-start transition-all",
                            active
                              ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20"
                              : "border-border bg-muted/30 hover:border-primary/35"
                          )}
                        >
                          <span className="block text-sm font-black">{label}</span>
                          <span className="mt-1 block text-xs text-muted-foreground leading-relaxed">
                            {value === "TECHNICAL"
                              ? "عطل تقني — يُوجّه لمنسق المحافظة"
                              : "مشكلة فنية — تُوجّه لمشرف الدعم الفني بغض النظر عن المحافظة"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </FieldLabel>
              </div>
            )}
          </SectionCard>

          <SectionCard
            step={3}
            title={isAdmin ? "التصنيف والإسناد" : "المحافظة وعدد المتأثرين"}
            hint={
              isAdmin
                ? "حدّد الأولوية والخطورة والمسؤول عن المعالجة"
                : "حدّد المحافظة وعدد الباحثين أو المستخدمين المتأثرين"
            }
          >
            {isAdmin ? (
              <div className="space-y-5">
                <PrioritySeverityFields
                  priority={priority}
                  severity={severity}
                  onPriorityChange={setPriority}
                  onSeverityChange={setSeverity}
                  triggerClassName="h-12 border-2 text-start"
                  layout="stack"
                />
                <FieldLabel label="إسناد إلى" required>
                  <SpecialtyAssignSelect
                    value={assignedDeveloperId}
                    onValueChange={setAssignedDeveloperId}
                    triggerClassName="h-12 border-2 text-start"
                    placeholder="اختر التخصص المسؤول..."
                  />
                </FieldLabel>
              </div>
            ) : (
              <div className="space-y-5">
                <FieldLabel label="المحافظة" required>
                  <div className="flex flex-wrap gap-2 justify-start">
                    {GOVERNORATES.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGovernorate(g)}
                        className={cn(
                          "rounded-xl border-2 px-4 py-2 text-sm font-bold transition-colors",
                          governorate === g
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted/40 hover:border-primary/30"
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </FieldLabel>
                <FieldLabel label="عدد المتأثرين" required>
                  <NumberStepper
                    value={affectedUsers}
                    onChange={setAffectedUsers}
                    min={1}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    عدد الباحثين أو المستخدمين المتأثرين بالمشكلة
                  </p>
                </FieldLabel>
              </div>
            )}

            {isAdmin && (
              <div className="mt-5 pt-5 border-t">
                <FieldLabel label="المحافظة (اختياري)">
                  <Select
                    value={governorate || "NONE"}
                    onValueChange={(v) => setGovernorate(v === "NONE" ? "" : v)}
                  >
                    <SelectTrigger className="h-12 border-2 text-start">
                      <SelectValue placeholder="اختر المحافظة..." />
                    </SelectTrigger>
                    <SelectContent dir="rtl" align="start" position="popper" className="z-[200]">
                      <SelectItem value="NONE" className="text-base py-3">
                        — بدون —
                      </SelectItem>
                      {GOVERNORATES.map((g) => (
                        <SelectItem key={g} value={g} className="text-base py-3">
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldLabel>
              </div>
            )}
          </SectionCard>

          <SectionCard
            step={4}
            title="المرفقات"
            hint="صورة أو ملف PDF يساعد على فهم المشكلة — اختياري"
          >
            <FileUploadZone
              files={files}
              onChange={setFiles}
              label="اسحب الملف هنا أو انقر للرفع"
              maxFiles={4}
              accept="image/*,application/pdf"
            />
          </SectionCard>

          <div className="hidden lg:block">
            <Button
              className="w-full h-14 text-lg font-black gap-3 bg-brand-gradient border-0 shadow-md"
              disabled={!canSave || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              <Save className="h-5 w-5" />
              {mutation.isPending ? "جاري الحفظ..." : "حفظ البلاغ"}
            </Button>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 text-start">
          <div className="rounded-2xl border-2 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-primary shrink-0" />
              <h4 className="font-black text-base">ملخص البلاغ</h4>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>
                  <span className="font-bold text-muted-foreground">الوصف: </span>
                  {description.trim() ? (
                    <span className="line-clamp-3">{description.trim()}</span>
                  ) : (
                    <span className="text-muted-foreground">لم يُكتب بعد</span>
                  )}
                </span>
              </li>
              <li className="flex gap-2">
                <Layers className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>
                  <span className="font-bold text-muted-foreground">النظام: </span>
                  {selectedSystemLabel || "—"}
                </span>
              </li>
              {governorate && (
                <li className="flex gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>
                    <span className="font-bold text-muted-foreground">المحافظة: </span>
                    {governorate}
                  </span>
                </li>
              )}
              {!isAdmin && (
                <li className="flex gap-2">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>
                    <span className="font-bold text-muted-foreground">عدد المتأثرين: </span>
                    {affectedUsers >= 1 ? affectedUsers : "—"}
                  </span>
                </li>
              )}
              {files.length > 0 && (
                <li className="flex gap-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>
                    <span className="font-bold text-muted-foreground">مرفقات: </span>
                    {files.length} ملف
                  </span>
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5">
            <h4 className="font-black text-base mb-3">ماذا يحدث بعد الإرسال؟</h4>
            <ol className="space-y-2.5 text-sm text-muted-foreground list-none">
              <li className="flex gap-2">
                <span className="font-black text-primary shrink-0">١.</span>
                <span>
                  {isCoordinator
                    ? "يُسجّل البلاغ ويظهر في قائمة «بانتظار التصنيف»"
                    : "يصل البلاغ إلى منسق الدعم للتصنيف"}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-black text-primary shrink-0">٢.</span>
                <span>مراجعة التفاصيل — System Bug أو إغلاق بسبب تقني</span>
              </li>
              <li className="flex gap-2">
                <span className="font-black text-primary shrink-0">٣.</span>
                <span>تصعيد System Bug للسوبر أدمن أو إغلاق الحالة</span>
              </li>
            </ol>
          </div>

          {isAdmin && (
            <div className="rounded-2xl border-2 bg-muted/40 p-5">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <h4 className="font-black text-sm">صلاحية المدير</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                يُصنّف البلاغ تلقائياً كـ BUG ويُسند مباشرة للتخصص الذي تختاره.
              </p>
            </div>
          )}
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 bg-background/95 backdrop-blur-md p-4 lg:hidden">
        <Button
          className="w-full h-14 text-base font-black gap-2 bg-brand-gradient border-0"
          disabled={!canSave || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          <Save className="h-5 w-5" />
          {mutation.isPending ? "جاري الحفظ..." : "حفظ البلاغ"}
        </Button>
      </div>
    </div>
  );
}
