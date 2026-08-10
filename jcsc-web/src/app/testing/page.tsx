import { MainLayout } from "@/components/layout/main-layout";
import { TestingCenterContent } from "@/components/testing/testing-center-content";

export default function TestingPage() {
  return (
    <MainLayout title="مركز الاختبار">
      <TestingCenterContent />
    </MainLayout>
  );
}
