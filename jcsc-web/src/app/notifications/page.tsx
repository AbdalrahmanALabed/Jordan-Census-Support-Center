import { MainLayout } from "@/components/layout/main-layout";
import { NotificationsContent } from "@/components/notifications/notifications-content";

export default function NotificationsPage() {
  return (
    <MainLayout title="الإشعارات">
      <NotificationsContent />
    </MainLayout>
  );
}
