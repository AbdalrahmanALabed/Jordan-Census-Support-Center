"use client";

import { JordanCensusLogo } from "@/components/brand/jordan-census-logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { buildNavItems } from "@/components/layout/nav-config";
import { useUIStore } from "@/stores/ui-store";
import { useAuthReady } from "@/hooks/use-effective-user";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

export function SidebarDrawer() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user } = useAuthReady();
  const navItems = user?.role ? buildNavItems(user.role) : [];

  return (
    <Dialog open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <DialogContent className="sidebar-shell sidebar-mesh fixed start-0 top-0 z-[101] flex h-full w-[min(18rem,88vw)] max-w-none translate-x-0 translate-y-0 flex-col gap-0 border-e border-sidebar-border p-0 text-sidebar-foreground shadow-2xl [background:linear-gradient(180deg,hsl(var(--sidebar))_0%,hsl(var(--sidebar-end))_100%)] data-[state=open]:slide-in-from-start data-[state=closed]:slide-out-to-start sm:rounded-none [&>button]:end-3 [&>button]:top-3 [&>button]:text-sidebar-muted [&>button]:hover:bg-white/10 [&>button]:hover:text-sidebar-foreground">
        <DialogTitle className="sr-only">القائمة الرئيسية</DialogTitle>
        <div className="sidebar-header flex h-16 items-center border-b px-4">
          <JordanCensusLogo variant="sidebar" size="sm" showText />
        </div>
        <SidebarNav items={navItems} onNavigate={() => setSidebarOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
