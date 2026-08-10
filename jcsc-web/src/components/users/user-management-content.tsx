"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  Search,
  Pencil,
  KeyRound,
  Mail,
  Users,
  UserCheck,
  Shield,
  Phone,
  MapPin,
  Briefcase,
  X,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHero } from "@/components/shared/ops-ui";
import {
  getUsersWithPermissions,
  createUser,
  updateUser,
  toggleUserActive,
  resetUserPassword,
  updateUserPermissions,
} from "@/lib/services/users";
import { UserPermissionsPicker } from "@/components/users/user-permissions-picker";
import { RoleManagementContent } from "@/components/admin/role-management-content";
import { DeveloperSpecialtyBadge } from "@/components/shared/developer-specialty-badge";
import {
  DEVELOPER_SPECIALTIES,
  isTechnicalAssigneeRole,
} from "@/lib/developer-specialties";
import { ROLE_LABELS, CORE_ROLES, GOVERNORATES, type UserRole } from "@/lib/types";
import { hasPermission } from "@/lib/reports";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { cn } from "@/lib/utils";

const ROLE_SELECT_OPTIONS: { value: UserRole; label: string }[] = CORE_ROLES.map((r) => ({
  value: r,
  label: ROLE_LABELS[r],
}));

function FieldLabel({
  label,
  required,
  icon: Icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 text-start">
      <label className="text-sm font-black text-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-primary shrink-0" />}
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function UserManagementInner() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useEffectiveUser();
  const canManageRoles = user?.role ? hasPermission(user.role, "manage_roles") : false;
  const [tab, setTab] = useState("list");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState<UserRole>("SUPERVISOR");
  const [team, setTeam] = useState<string>(DEVELOPER_SPECIALTIES[0].team);
  const [governorate, setGovernorate] = useState<string>(GOVERNORATES[0]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    phone: string;
    jobTitle: string;
    role: UserRole;
    team: string;
    governorate: string;
  }>({
    name: "",
    email: "",
    phone: "",
    jobTitle: "",
    role: "SUPERVISOR",
    team: DEVELOPER_SPECIALTIES[0].team,
    governorate: GOVERNORATES[0],
  });

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "add" || t === "permissions" || t === "list") setTab(t);
  }, [searchParams]);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users-manage"],
    queryFn: getUsersWithPermissions,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createUser({
        name,
        email,
        phone,
        jobTitle,
        role,
        team: isTechnicalAssigneeRole(role) ? team : undefined,
        governorate,
        permissions: canManageRoles && role !== "ADMIN" ? permissions : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-manage"] });
      setName("");
      setEmail("");
      setPhone("");
      setJobTitle("");
      setPermissions([]);
      setTab("list");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      await updateUser(editingId!, editForm);
      if (canManageRoles && editForm.role !== "ADMIN") {
        await updateUserPermissions(editingId!, editPermissions);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-manage"] });
      setEditingId(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleUserActive,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users-manage"] }),
  });

  const resetMutation = useMutation({
    mutationFn: (userId: string) => resetUserPassword(userId),
    onSuccess: () => alert("تم إعادة تعيين كلمة المرور إلى: jcsc2026"),
  });

  const filtered = useMemo(
    () =>
      users?.filter((u) => {
        const q = search.trim();
        const matchSearch =
          !q ||
          u.name.includes(q) ||
          u.email.toLowerCase().includes(q.toLowerCase()) ||
          (u.phone?.includes(q) ?? false);
        const matchRole = roleFilter === "ALL" || u.role === roleFilter;
        const matchActive =
          activeFilter === "ALL" ||
          (activeFilter === "ACTIVE" && u.isActive) ||
          (activeFilter === "INACTIVE" && !u.isActive);
        return matchSearch && matchRole && matchActive;
      }) ?? [],
    [users, search, roleFilter, activeFilter]
  );

  const stats = useMemo(() => {
    const all = users ?? [];
    return {
      total: all.length,
      active: all.filter((u) => u.isActive).length,
      supervisors: all.filter((u) => u.role === "SUPERVISOR").length,
      developers: all.filter((u) => u.role === "DEVELOPER").length,
    };
  }, [users]);

  const startEdit = (u: (typeof filtered)[0]) => {
    setEditingId(u.id);
    setEditPermissions(u.permissions ?? []);
    setEditForm({
      name: u.name,
      email: u.email,
      phone: u.phone ?? "",
      jobTitle: u.jobTitle ?? u.team ?? "",
      role: u.role,
      team: u.team ?? DEVELOPER_SPECIALTIES[0].team,
      governorate: u.governorate ?? GOVERNORATES[0],
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHero
        title="الأفراد والصلاحيات"
        subtitle="إدارة حسابات الفريق، الأدوار، والصلاحيات — كل شيء في مكان واحد"
      />

      {/* إحصائيات سريعة */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="إجمالي الأفراد" value={stats.total} />
        <StatCard icon={UserCheck} label="نشط" value={stats.active} accent="emerald" />
        <StatCard icon={Shield} label="مشرفون" value={stats.supervisors} accent="amber" />
        <StatCard icon={Briefcase} label="مطورون" value={stats.developers} accent="violet" />
      </div>

      <Tabs value={tab} onValueChange={setTab} dir="rtl">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 h-auto p-1.5 gap-1">
          <TabsTrigger value="list" className="gap-2 py-3">
            <Users className="h-4 w-4" />
            قائمة الأفراد
            <Badge variant="secondary" className="text-xs font-black">
              {users?.length ?? 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="add" className="gap-2 py-3">
            <UserPlus className="h-4 w-4" />
            إضافة فرد
          </TabsTrigger>
          {canManageRoles && (
            <TabsTrigger value="permissions" className="gap-2 py-3 sm:col-span-1 col-span-2">
              <Shield className="h-4 w-4" />
              الصلاحيات
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── إضافة فرد ── */}
        <TabsContent value="add" className="mt-5">
          <Card className="border-2 shadow-sm">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-base font-black flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                إضافة شخص جديد
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldLabel label="الاسم الكامل" required icon={Users}>
                  <Input
                    className="h-11 border-2 text-start"
                    placeholder="مثال: محمد حازم"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </FieldLabel>
                <FieldLabel label="البريد الإلكتروني" required icon={Mail}>
                  <Input
                    className="h-11 border-2 text-start"
                    dir="ltr"
                    placeholder="name@jcsc.gov.jo"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </FieldLabel>
                <FieldLabel label="الهاتف" icon={Phone}>
                  <Input
                    className="h-11 border-2 text-start"
                    dir="ltr"
                    placeholder="07XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </FieldLabel>
                <FieldLabel label="المسمى الوظيفي" icon={Briefcase}>
                  <Input
                    className="h-11 border-2 text-start"
                    placeholder="مثال: مطور أنظمة"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </FieldLabel>
                <FieldLabel label="الدور" required icon={Shield}>
                  <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                    <SelectTrigger className="h-11 border-2">
                      <SelectValue placeholder="اختر الدور...">{ROLE_LABELS[role]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[200]">
                      {ROLE_SELECT_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value} className="text-base py-3">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldLabel>
                {isTechnicalAssigneeRole(role) && (
                  <FieldLabel label="التخصص">
                    <Select value={team} onValueChange={setTeam}>
                      <SelectTrigger className="h-11 border-2">
                        <SelectValue placeholder="اختر التخصص...">
                          {DEVELOPER_SPECIALTIES.find((s) => s.team === team)?.label}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[200]">
                        {DEVELOPER_SPECIALTIES.map((s) => (
                          <SelectItem key={s.value} value={s.team} className="text-base py-3">
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldLabel>
                )}
                <FieldLabel label="المحافظة" icon={MapPin}>
                  <Select value={governorate} onValueChange={setGovernorate}>
                    <SelectTrigger className="h-11 border-2">
                      <SelectValue placeholder="اختر المحافظة...">{governorate}</SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[200]">
                      {GOVERNORATES.map((g) => (
                        <SelectItem key={g} value={g} className="text-base py-3">
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldLabel>
              </div>

              {canManageRoles && role !== "ADMIN" && (
                <UserPermissionsPicker value={permissions} onChange={setPermissions} />
              )}

              <div className="flex flex-wrap gap-3 pt-2 border-t">
                <Button
                  className="gap-2 flex-1 sm:flex-none"
                  disabled={!name.trim() || !email.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  <UserPlus className="h-4 w-4" />
                  {createMutation.isPending ? "جاري الإضافة..." : "إضافة الفرد"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground font-bold flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                البريد الإلكتروني مطلوب — كلمة المرور الافتراضية: jcsc2026
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── قائمة الأفراد ── */}
        <TabsContent value="list" className="mt-5 space-y-4">
          <Card className="border-2">
            <CardContent className="pt-5 space-y-3">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="ps-10 h-11 border-2 text-start"
                  placeholder="بحث بالاسم أو البريد أو الهاتف..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={roleFilter}
                  onValueChange={(v) => setRoleFilter(v as UserRole | "ALL")}
                >
                  <SelectTrigger className="w-full sm:w-44 h-10 border-2">
                    <SelectValue>
                      {roleFilter === "ALL" ? "كل الأدوار" : ROLE_LABELS[roleFilter]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[200]">
                    <SelectItem value="ALL">كل الأدوار</SelectItem>
                    {ROLE_SELECT_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={activeFilter}
                  onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}
                >
                  <SelectTrigger className="w-full sm:w-36 h-10 border-2">
                    <SelectValue>
                      {activeFilter === "ALL"
                        ? "كل الحالات"
                        : activeFilter === "ACTIVE"
                          ? "نشط"
                          : "معطّل"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[200]">
                    <SelectItem value="ALL">كل الحالات</SelectItem>
                    <SelectItem value="ACTIVE">نشط</SelectItem>
                    <SelectItem value="INACTIVE">معطّل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs font-bold text-muted-foreground text-start">
                {filtered.length} {filtered.length === 1 ? "نتيجة" : "نتائج"}
              </p>
            </CardContent>
          </Card>

          {isLoading ? (
            <LoadingState />
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {filtered.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  isEditing={editingId === user.id}
                  editForm={editForm}
                  editPermissions={editPermissions}
                  canManageRoles={canManageRoles}
                  onEditFormChange={setEditForm}
                  onEditPermissionsChange={setEditPermissions}
                  onStartEdit={() => startEdit(user)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={() => updateMutation.mutate()}
                  isSaving={updateMutation.isPending}
                  onResetPassword={() => resetMutation.mutate(user.id)}
                  onToggleActive={() => toggleMutation.mutate(user.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── الصلاحيات ── */}
        {canManageRoles && (
          <TabsContent value="permissions" className="mt-5">
            <RoleManagementContent />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent?: "emerald" | "amber" | "violet";
}) {
  const colors = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30",
    amber: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30",
    violet: "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/30",
    default: "bg-muted/50 border-border",
  };
  const c = accent ? colors[accent] : colors.default;

  return (
    <div className={cn("rounded-2xl border-2 p-4 text-start", c)}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 opacity-70" />
        <p className="text-xs font-bold opacity-80">{label}</p>
      </div>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

type ManagedUser = Awaited<ReturnType<typeof getUsersWithPermissions>>[number];

function UserCard({
  user,
  isEditing,
  editForm,
  editPermissions,
  canManageRoles,
  onEditFormChange,
  onEditPermissionsChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  isSaving,
  onResetPassword,
  onToggleActive,
}: {
  user: ManagedUser;
  isEditing: boolean;
  editForm: {
    name: string;
    email: string;
    phone: string;
    jobTitle: string;
    role: UserRole;
    team: string;
    governorate: string;
  };
  editPermissions: string[];
  canManageRoles: boolean;
  onEditFormChange: (f: typeof editForm) => void;
  onEditPermissionsChange: (p: string[]) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  isSaving: boolean;
  onResetPassword: () => void;
  onToggleActive: () => void;
}) {
  if (isEditing) {
    return (
      <Card className="border-2 border-primary/40 shadow-md">
        <CardHeader className="pb-3 border-b bg-primary/5">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            تعديل: {user.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldLabel label="الاسم الكامل">
              <Input
                className="h-10 border-2 text-start"
                value={editForm.name}
                onChange={(e) => onEditFormChange({ ...editForm, name: e.target.value })}
              />
            </FieldLabel>
            <FieldLabel label="البريد الإلكتروني">
              <Input
                className="h-10 border-2 text-start"
                dir="ltr"
                value={editForm.email}
                onChange={(e) => onEditFormChange({ ...editForm, email: e.target.value })}
              />
            </FieldLabel>
            <FieldLabel label="الهاتف">
              <Input
                className="h-10 border-2 text-start"
                dir="ltr"
                value={editForm.phone}
                onChange={(e) => onEditFormChange({ ...editForm, phone: e.target.value })}
              />
            </FieldLabel>
            <FieldLabel label="المسمى الوظيفي">
              <Input
                className="h-10 border-2 text-start"
                value={editForm.jobTitle}
                onChange={(e) => onEditFormChange({ ...editForm, jobTitle: e.target.value })}
              />
            </FieldLabel>
            <FieldLabel label="الدور">
              <Select
                value={editForm.role}
                onValueChange={(v) => onEditFormChange({ ...editForm, role: v as UserRole })}
              >
                <SelectTrigger className="h-10 border-2">
                  <SelectValue>{ROLE_LABELS[editForm.role]}</SelectValue>
                </SelectTrigger>
                <SelectContent position="popper" className="z-[200]">
                  {ROLE_SELECT_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldLabel>
            {isTechnicalAssigneeRole(editForm.role) && (
              <FieldLabel label="التخصص">
                <Select
                  value={editForm.team}
                  onValueChange={(v) => onEditFormChange({ ...editForm, team: v })}
                >
                  <SelectTrigger className="h-10 border-2">
                    <SelectValue>
                      {DEVELOPER_SPECIALTIES.find((s) => s.team === editForm.team)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[200]">
                    {DEVELOPER_SPECIALTIES.map((s) => (
                      <SelectItem key={s.value} value={s.team}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldLabel>
            )}
            <FieldLabel label="المحافظة">
              <Select
                value={editForm.governorate}
                onValueChange={(v) => onEditFormChange({ ...editForm, governorate: v })}
              >
                <SelectTrigger className="h-10 border-2">
                  <SelectValue>{editForm.governorate}</SelectValue>
                </SelectTrigger>
                <SelectContent position="popper" className="z-[200]">
                  {GOVERNORATES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldLabel>
          </div>
          {canManageRoles && editForm.role !== "ADMIN" && (
            <UserPermissionsPicker
              value={editPermissions}
              onChange={onEditPermissionsChange}
            />
          )}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button size="sm" className="gap-1.5" disabled={isSaving} onClick={onSave}>
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onCancelEdit}>
              <X className="h-3.5 w-3.5" />
              إلغاء
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 hover:border-primary/30 hover:shadow-sm transition-all overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
          {/* معلومات الفرد — محاذاة يمين */}
          <div className="flex items-start gap-3 flex-1 min-w-0 text-start">
            <Avatar className="h-12 w-12 shrink-0 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-black text-sm">
                {user.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="font-black text-base truncate">{user.name}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span dir="ltr" className="truncate">{user.email}</span>
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground font-bold">
                {(user.jobTitle || user.team) && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {user.jobTitle ?? user.team}
                  </span>
                )}
                {user.governorate && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {user.governorate}
                  </span>
                )}
                {user.phone && (
                  <span className="flex items-center gap-1" dir="ltr">
                    <Phone className="h-3 w-3" />
                    {user.phone}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <Badge variant="outline" className="font-black">
                  {ROLE_LABELS[user.role]}
                </Badge>
                {isTechnicalAssigneeRole(user.role) && (
                  <DeveloperSpecialtyBadge user={user} />
                )}
                <Badge variant={user.isActive ? "success" : "secondary"} className="font-black">
                  {user.isActive ? "نشط" : "معطّل"}
                </Badge>
              </div>
            </div>
          </div>

          {/* إجراءات */}
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch shrink-0">
            <Button size="sm" variant="outline" className="gap-1.5 font-bold" onClick={onStartEdit}>
              <Pencil className="h-3.5 w-3.5" />
              تعديل
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 font-bold" onClick={onResetPassword}>
              <KeyRound className="h-3.5 w-3.5" />
              كلمة المرور
            </Button>
            <Button
              size="sm"
              variant={user.isActive ? "ghost" : "default"}
              className="gap-1.5 font-bold"
              onClick={onToggleActive}
            >
              {user.isActive ? "تعطيل" : "تفعيل"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex h-40 items-center justify-center text-muted-foreground rounded-2xl border-2 border-dashed">
      <p className="font-bold">جاري التحميل...</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground rounded-2xl border-2 border-dashed">
      <Users className="h-8 w-8 opacity-40" />
      <p className="font-black">لا توجد نتائج</p>
    </div>
  );
}

export function UserManagementContent() {
  return (
    <Suspense fallback={<LoadingState />}>
      <UserManagementInner />
    </Suspense>
  );
}
