"use client";



import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { MainLayout } from "@/components/layout/main-layout";

import { OperationsDashboardContent } from "@/components/dashboard/operations-dashboard-content";

import { DashboardContent } from "@/components/dashboard/dashboard-content";

import { SupervisorDashboardContent } from "@/components/dashboard/supervisor-dashboard-content";

import { SupportOperationsDashboardContent } from "@/components/dashboard/support-operations-dashboard-content";

import { CoordinatorDashboardContent } from "@/components/dashboard/coordinator-dashboard-content";

import { isManagerRole, isSupervisorRole, isSupportCoordinatorRole } from "@/lib/reports";
import { isDeveloperRole } from "@/lib/permissions";
import { useAuthReady } from "@/hooks/use-effective-user";

import { ChevronDown, BarChart3 } from "lucide-react";

import { cn } from "@/lib/utils";



function AnalyticsSection() {

  const [open, setOpen] = useState(false);



  return (

    <div className="content-container pb-8">

      <button

        type="button"

        onClick={() => setOpen(!open)}

        className={cn(

          "flex w-full items-center justify-between rounded-2xl border-2 bg-card px-5 py-4 text-start transition-all hover:bg-muted/30 hover:border-primary/20 shadow-sm",

          open && "rounded-b-none border-b-0"

        )}

      >

        <div className="flex items-center gap-3">

          <div className="rounded-xl bg-primary/10 p-2.5">

            <BarChart3 className="h-5 w-5 text-primary" />

          </div>

          <div>

            <span className="font-black text-base block">إحصائيات تفصيلية</span>

            <span className="text-xs text-muted-foreground">رسوم بيانية، أولويات، وآخر التذاكر</span>

          </div>

        </div>

        <ChevronDown

          className={cn(

            "h-5 w-5 text-muted-foreground transition-transform shrink-0",

            open && "rotate-180"

          )}

        />

      </button>

      {open && (

        <div className="rounded-b-2xl border-2 border-t-0 bg-card p-5 md:p-6 shadow-sm">

          <DashboardContent />

        </div>

      )}

    </div>

  );

}



export default function DashboardPage() {

  const router = useRouter();

  const { user, isLoading } = useAuthReady();
  const role = user?.role;

  const isCoordinator = role ? isSupportCoordinatorRole(role) : false;
  const isManager = role ? isManagerRole(role) : false;
  const isSupervisor = role ? isSupervisorRole(role) : false;
  const isDeveloper = role ? isDeveloperRole(role) : false;



  useEffect(() => {

    if (isDeveloper) router.replace("/cases");

  }, [isDeveloper, router]);



  if (isLoading || !role) {

    return (

      <MainLayout title="لوحة التحكم">

        <div className="flex h-72 items-center justify-center">

          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />

        </div>

      </MainLayout>

    );

  }



  if (isDeveloper) {

    return (

      <MainLayout title="أعطالي">

        <div className="flex h-72 items-center justify-center">

          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />

        </div>

      </MainLayout>

    );

  }



  return (

    <MainLayout title="لوحة التحكم">

      {isManager ? (

        <div className="space-y-2">

          <OperationsDashboardContent />

          <AnalyticsSection />

        </div>

      ) : isCoordinator ? (

        <CoordinatorDashboardContent />

      ) : isSupervisor ? (

        <SupervisorDashboardContent />

      ) : (

        <SupportOperationsDashboardContent />

      )}

    </MainLayout>

  );

}


