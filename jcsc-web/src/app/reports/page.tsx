import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { MainLayout } from "@/components/layout/main-layout";
import { PermissionGate } from "@/components/auth/permission-gate";
import { IncomingReportsContent } from "@/components/reports/incoming-reports-content";
import { authOptions } from "@/lib/auth";
import { isSupervisorRole } from "@/lib/reports";
import { isSupportCoordinatorRole } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as UserRole | undefined;

  if (role && (isSupervisorRole(role) || isSupportCoordinatorRole(role))) {
    redirect("/reports/my");
  }

  return (
    <MainLayout title="تصنيف البلاغات">
      <PermissionGate permission="review_reports">
        <IncomingReportsContent />
      </PermissionGate>
    </MainLayout>
  );
}
