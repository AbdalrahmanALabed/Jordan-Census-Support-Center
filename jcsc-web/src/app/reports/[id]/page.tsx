import { MainLayout } from "@/components/layout/main-layout";
import { ReportDetailContent } from "@/components/reports/report-detail-content";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <MainLayout title="تفاصيل البلاغ">
      <ReportDetailContent reportId={id} />
    </MainLayout>
  );
}
