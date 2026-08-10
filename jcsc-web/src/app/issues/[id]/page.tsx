import { MainLayout } from "@/components/layout/main-layout";
import { IssueDetailContent } from "@/components/issues/issue-detail-content";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <MainLayout title="تفاصيل المسألة">
      <IssueDetailContent issueId={id} />
    </MainLayout>
  );
}
