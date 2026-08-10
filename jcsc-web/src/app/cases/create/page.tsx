import { MainLayout } from "@/components/layout/main-layout";
import { CreateCaseContent } from "@/components/cases/create-case-content";
import { PermissionGate } from "@/components/auth/permission-gate";

export default function CreateCasePage() {
  return (
    <MainLayout title="إنشاء بلاغ">
      <PermissionGate
        permission={["submit_report", "manage_issues", "convert_to_issue"]}
        excludeRoles={["DEVELOPER"]}
      >
        <CreateCaseContent />
      </PermissionGate>
    </MainLayout>
  );
}
