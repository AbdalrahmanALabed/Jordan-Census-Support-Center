import { MainLayout } from "@/components/layout/main-layout";
import { MyReportsContent } from "@/components/reports/my-reports-content";
import { PageAuthGate } from "@/components/auth/page-auth-gate";

export default function MyReportsPage() {
  return (
    <PageAuthGate title="بلاغاتي">
      <MainLayout title="بلاغاتي">
        <MyReportsContent />
      </MainLayout>
    </PageAuthGate>
  );
}
