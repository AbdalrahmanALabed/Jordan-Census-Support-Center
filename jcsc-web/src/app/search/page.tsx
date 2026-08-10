import { Suspense } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { GlobalSearchContent } from "@/components/search/global-search-content";

export default function SearchPage() {
  return (
    <MainLayout title="بحث شامل">
      <Suspense fallback={<p className="text-center text-muted-foreground py-8">جاري التحميل...</p>}>
        <GlobalSearchContent />
      </Suspense>
    </MainLayout>
  );
}
