"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NavItem } from "@/components/layout/nav-config";

interface SidebarNavProps {
  items: NavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ items, collapsed, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <>
      <ScrollArea className="flex-1 py-4">
        {!collapsed && (
          <p className="sidebar-section-label px-5 mb-3 text-[11px] font-bold uppercase">
            القائمة الرئيسية
          </p>
        )}
        <nav className="space-y-1 px-2.5">
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/cases" && /^\/cases/.test(pathname)) ||
              (item.href === "/reports/my" &&
                (pathname === "/reports/my" || /^\/reports\/[^/]+$/.test(pathname))) ||
              (item.href === "/users" && pathname.startsWith("/users")) ||
              (item.href === "/roles" && pathname.startsWith("/roles")) ||
              (item.href === "/knowledge-base" && pathname.startsWith("/knowledge-base")) ||
              (item.href !== "/dashboard" &&
                item.href !== "/cases" &&
                item.href !== "/reports/my" &&
                item.href !== "/users" &&
                item.href !== "/roles" &&
                pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-all duration-200",
                  isActive ? "nav-item-active" : "nav-item-idle"
                )}
                title={collapsed ? item.label : undefined}
              >
                {isActive && (
                  <span className="nav-active-bar absolute inset-y-2 start-0 w-1 rounded-full" />
                )}
                <span className="nav-icon-wrap">
                  {isActive ? (
                    <span
                      className={cn(
                        "flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
                        item.activeGradient
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.25} />
                    </span>
                  ) : (
                    <Icon
                      className="h-5 w-5 text-sidebar-muted transition-colors group-hover:text-sidebar-foreground"
                      strokeWidth={2}
                    />
                  )}
                </span>
                {!collapsed && <span>{item.label}</span>}
                {isActive && !collapsed && (
                  <span
                    className="ms-auto h-2 w-2 rounded-full animate-pulse-soft"
                    style={{
                      background: "hsl(var(--cta-start))",
                      boxShadow: "0 0 10px hsl(var(--cta-start) / 0.55)",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {!collapsed && (
        <div className="sidebar-footer-card border-t border-sidebar-border p-4 mx-2 mb-2 rounded-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="sidebar-footer-accent flex h-6 w-6 items-center justify-center rounded-lg">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <p className="text-xs font-bold text-sidebar-foreground">Jordan Census 2026</p>
          </div>
          <p className="text-[10px] text-sidebar-muted leading-relaxed">
            منصة عمليات الدعم — التعداد السكاني
          </p>
        </div>
      )}
    </>
  );
}
