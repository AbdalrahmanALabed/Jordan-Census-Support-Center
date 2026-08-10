import { MainLayout } from "@/components/layout/main-layout";
import { UserManagementContent } from "@/components/users/user-management-content";
import { PermissionGate } from "@/components/auth/permission-gate";

export default function UsersPage() {
  return (
    <MainLayout title="">
      <PermissionGate permission={["manage_users", "manage_roles"]}>
        <UserManagementContent />
      </PermissionGate>
    </MainLayout>
  );
}
