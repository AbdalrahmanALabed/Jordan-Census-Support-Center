"use client";

import { Suspense } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { CasesHubContent } from "@/components/cases/cases-hub-content";
import { useAuthReady } from "@/hooks/use-effective-user";
import { isDeveloperRole, isSupportCoordinatorRole } from "@/lib/permissions";

export default function CasesPageClient() {
  const { user, isLoading } = useAuthReady();
  const title = isDeveloperRole(user?.role)
    ? "أعطالي"
    : isSupportCoordinatorRole(user?.role)
      ? "تصنيف البلاغات"
      : "إدارة الحالات";

  if (isLoading || !user?.role) {
    return (
      <MainLayout title="الحالات">
        <div className="flex h-72 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={title}>
      <Suspense
        fallback={
          <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
        }
      >
        <CasesHubContent />
      </Suspense>
    </MainLayout>
  );
}
