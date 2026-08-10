import { MainLayout } from "@/components/layout/main-layout";
import { DeploymentQueueContent } from "@/components/deployment/deployment-queue-content";

export default function DeploymentPage() {
  return (
    <MainLayout title="طابور النشر">
      <DeploymentQueueContent />
    </MainLayout>
  );
}
