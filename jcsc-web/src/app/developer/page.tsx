import { MainLayout } from "@/components/layout/main-layout";
import { DeveloperWorkspaceContent } from "@/components/developer/developer-workspace-content";

export default function DeveloperPage() {
  return (
    <MainLayout title="مساحة المطور">
      <DeveloperWorkspaceContent />
    </MainLayout>
  );
}
