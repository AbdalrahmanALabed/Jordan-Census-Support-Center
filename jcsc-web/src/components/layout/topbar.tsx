"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Moon,
  Sun,
  Search,
  Menu,
  PlusCircle,
  LogOut,
  BellRing,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { useUserStore } from "@/stores/user-store";
import { useAuthReady } from "@/hooks/use-effective-user";
import { ROLE_LABELS, type UserRole } from "@/lib/types";
import { hasPermission, isSupervisorRole } from "@/lib/reports";
import { getUnreadNotificationCount } from "@/lib/services";

interface TopbarProps {
  title: string;
}

function UserInitials({ name }: { name: string }) {
  const trimmed = name.trim();
  if (!trimmed) return "JC";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

export function Topbar({ title }: TopbarProps) {
  const router = useRouter();
  const [searchQ, setSearchQ] = useState("");
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { setSidebarOpen } = useUIStore();
  const { data: session } = useSession();
  const setUser = useUserStore((s) => s.setUser);
  const { user, isLoading: authLoading } = useAuthReady();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (session?.user) {
      setUser({
        id: session.user.id,
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        role: session.user.role as UserRole,
        team: session.user.team,
        permissions: session.user.permissions ?? [],
      });
    }
  }, [session, setUser]);

  const displayUser = user;

  const canSubmit = user?.role ? hasPermission(user.role, "submit_report") : false;
  const isSupervisor = user?.role ? isSupervisorRole(user.role) : false;

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications"],
    queryFn: getUnreadNotificationCount,
    refetchInterval: 30_000,
  });

  function goSearch() {
    if (searchQ.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQ.trim())}`);
    }
  }

  const iconBtn = "topbar-icon-btn";

  return (
    <header className="sticky top-0 z-30 topbar-shell">
      <div className="flex h-16 items-center gap-3 px-3 sm:px-5 md:px-6">
        {/* ── العنوان ── */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden topbar-icon-btn h-9 w-9 shrink-0 rounded-lg hover:bg-white/10"
            onClick={() => setSidebarOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="min-w-0 border-s border-white/15 ps-2 sm:ps-3 lg:border-0 lg:ps-0">
            <h1 className="topbar-title truncate text-base font-black tracking-tight sm:text-lg md:text-xl">
              {title}
            </h1>
            <p className="topbar-subtitle hidden truncate text-[11px] font-medium sm:block">
              مركز دعم التعداد · JCSC 2026
            </p>
          </div>
        </div>

        {/* ── بحث (شاشات كبيرة) ── */}
        <form
          className="relative mx-2 hidden max-w-sm flex-1 lg:block xl:max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            goSearch();
          }}
        >
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <Input
            placeholder="بحث شامل..."
            className="topbar-search h-9 w-full rounded-full ps-9 text-sm shadow-none"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </form>

        {/* ── إجراءات ── */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          {canSubmit && (
            <Button
              asChild
              size="sm"
              className={cn(
                "btn-create-report h-9 gap-1.5 rounded-lg px-3 text-sm font-bold",
                isSupervisor ? "flex" : "hidden md:flex"
              )}
            >
              <Link href="/cases/create">
                <PlusCircle className="h-4 w-4" />
                <span className="hidden lg:inline">إنشاء بلاغ</span>
                <span className="lg:hidden">بلاغ</span>
              </Link>
            </Button>
          )}

          {/* مجموعة أيقونات */}
          <div className="topbar-toolbar flex items-center gap-0.5 rounded-xl border p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(iconBtn, "lg:hidden")}
              aria-label="بحث"
              onClick={() => router.push("/search")}
            >
              <Search className="h-4 w-4" />
            </Button>

            <Button
              asChild
              variant="ghost"
              size="icon"
              className={cn(iconBtn, "relative")}
              aria-label="الإشعارات"
            >
              <Link href="/notifications">
                <BellRing className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-black leading-none text-white ring-2 ring-card">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={iconBtn}
              aria-label="تبديل الوضع"
              disabled={!mounted}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {mounted && theme === "dark" ? (
                <Moon className="h-4 w-4 text-violet-500" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(iconBtn, "hover:text-red-400 hover:bg-red-500/15")}
              aria-label="تسجيل الخروج"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          {/* المستخدم */}
          <div className="topbar-user-card hidden items-center gap-2.5 rounded-xl border py-1 ps-1 pe-3 md:flex">
            <Avatar className="h-8 w-8 ring-2 ring-white/20">
              <AvatarFallback className="btn-create-report text-[11px] font-black text-white">
                <UserInitials name={displayUser?.name ?? ""} />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 max-w-[8.5rem] lg:max-w-[10rem]">
              <p className="topbar-user-name truncate text-sm font-bold leading-tight">
                {authLoading ? "…" : displayUser?.name || "مستخدم"}
              </p>
              <p className="topbar-user-role truncate text-[10px] font-semibold">
                {displayUser?.role ? ROLE_LABELS[displayUser.role] : ""}
              </p>
            </div>
          </div>

          {/* avatar فقط على الشاشات الصغيرة */}
          <Avatar className="h-9 w-9 ring-2 ring-white/20 md:hidden">
            <AvatarFallback className="btn-create-report text-xs font-black text-white">
              <UserInitials name={displayUser?.name ?? ""} />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
