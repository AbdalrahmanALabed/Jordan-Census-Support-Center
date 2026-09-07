import { MainLayout } from "@/components/layout/main-layout";
import { KnowledgeBaseContent } from "@/components/knowledge-base/knowledge-base-content";
import { PermissionGate } from "@/components/auth/permission-gate";

export default function KnowledgeBasePage() {
  return (
    <MainLayout title="الحلول">
      <PermissionGate knowledgeBase allowRoles={["SUPERVISOR", "SUPPORT_COORDINATOR", "FIELD_OPERATIONS_COORDINATOR", "ADMIN"]}>
        <KnowledgeBaseContent />
      </PermissionGate>
    </MainLayout>
  );
}
