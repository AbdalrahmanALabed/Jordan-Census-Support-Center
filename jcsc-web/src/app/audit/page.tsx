import { MainLayout } from "@/components/layout/main-layout";
import { AuditLogContent } from "@/components/audit/audit-log-content";
import { PermissionGate } from "@/components/auth/permission-gate";

export default function AuditPage() {
  return (
    <MainLayout title="سجل التدقيق والقرارات">
      <PermissionGate permission="view_audit">
        <AuditLogContent />
      </PermissionGate>
    </MainLayout>
  );
}
