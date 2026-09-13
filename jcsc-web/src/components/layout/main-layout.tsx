"use client";

import { Sidebar } from "./sidebar";
import { SidebarDrawer } from "./sidebar-drawer";
import { MobileFab } from "./mobile-fab";
import { Topbar } from "./topbar";
import { NotificationSoundListener } from "./notification-sound-listener";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function MainLayout({ children, title }: MainLayoutProps) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen app-mesh-bg content-dot-grid">
      <NotificationSoundListener />
      <Sidebar />
      <SidebarDrawer />
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "lg:ms-[4.75rem]" : "lg:ms-[17rem]"
        )}
      >
        <Topbar title={title} />
        <main className="min-h-[calc(100vh-4rem)] p-4 pb-24 md:p-6 md:pb-8 lg:p-8 page-enter">
          <div className="mx-auto max-w-[88rem]">{children}</div>
        </main>
      </div>
      <MobileFab />
    </div>
  );
}
