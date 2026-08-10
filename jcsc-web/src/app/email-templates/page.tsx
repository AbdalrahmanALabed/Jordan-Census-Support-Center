import { MainLayout } from "@/components/layout/main-layout";
import { EmailTemplatesContent } from "@/components/email/email-templates-content";
import { PermissionGate } from "@/components/auth/permission-gate";

export default function EmailTemplatesPage() {
  return (
    <MainLayout title="قوالب البريد الإلكتروني">
      <PermissionGate permission="manage_users">
        <EmailTemplatesContent />
      </PermissionGate>
    </MainLayout>
  );
}
