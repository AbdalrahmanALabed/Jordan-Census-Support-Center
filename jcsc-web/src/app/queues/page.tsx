import { MainLayout } from "@/components/layout/main-layout";
import { TeamQueueContent } from "@/components/queues/team-queue-content";

export default function QueuesPage() {
  return (
    <MainLayout title="طوابير العمل">
      <TeamQueueContent />
    </MainLayout>
  );
}
