"use client";

import { Suspense } from "react";
import { JordanCensusLogo } from "@/components/brand/jordan-census-logo";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { buildNavItems } from "@/components/layout/nav-config";
import { useUIStore } from "@/stores/ui-store";
import { useAuthReady } from "@/hooks/use-effective-user";

/** القائمة الجانبية — سطح المكتب فقط */
export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user } = useAuthReady();
  const navItems = user?.role ? buildNavItems(user.role) : [];

  return (
    <aside
      className={cn(
        "fixed top-0 start-0 z-40 hidden h-screen flex-col sidebar-shell sidebar-mesh text-sidebar-foreground transition-all duration-300 border-e lg:flex",
        sidebarCollapsed ? "w-[4.75rem]" : "w-[17rem]"
      )}
    >
      <div className="sidebar-header flex h-16 items-center gap-2 border-b px-3">
        <JordanCensusLogo
          variant="sidebar"
          size="sm"
          showText={!sidebarCollapsed}
          className={cn("min-w-0 flex-1", sidebarCollapsed && "justify-center")}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="sidebar-toggle-btn shrink-0"
          aria-label={sidebarCollapsed ? "توسيع القائمة" : "طي القائمة"}
        >
          {sidebarCollapsed ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Suspense fallback={null}>
        <SidebarNav items={navItems} collapsed={sidebarCollapsed} />
      </Suspense>
    </aside>
  );
}
