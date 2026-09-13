"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { OperationsDashboardContent } from "@/components/dashboard/operations-dashboard-content";
import { SupervisorDashboardContent } from "@/components/dashboard/supervisor-dashboard-content";
import { SupportOperationsDashboardContent } from "@/components/dashboard/support-operations-dashboard-content";
import { CoordinatorDashboardContent } from "@/components/dashboard/coordinator-dashboard-content";
import { SupportSupervisorDashboardContent } from "@/components/dashboard/support-supervisor-dashboard-content";
import { isManagerRole, isSupervisorRole, isSupportCoordinatorRole } from "@/lib/reports";
import {
  isDeveloperRole,
  isSupportSupervisorRole,
  isInfrastructureSupervisorRole,
} from "@/lib/permissions";
import { useAuthReady } from "@/hooks/use-effective-user";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthReady();
  const role = user?.role;

  const isSupportSupervisor = role ? isSupportSupervisorRole(role) : false;
  const isCoordinator =
    role ? isSupportCoordinatorRole(role) || isInfrastructureSupervisorRole(role) : false;
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
        <OperationsDashboardContent />
      ) : isSupportSupervisor ? (
        <SupportSupervisorDashboardContent />
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
