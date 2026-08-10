import { MainLayout } from "@/components/layout/main-layout";
import { ApprovalCenterContent } from "@/components/approval/approval-center-content";
import { PermissionGate } from "@/components/auth/permission-gate";

export default function ApprovalCenterPage() {
  return (
    <MainLayout title="مركز الموافقات">
      <PermissionGate permission={["review_reports", "classify_reports", "close_issues"]}>
        <ApprovalCenterContent />
      </PermissionGate>
    </MainLayout>
  );
}
