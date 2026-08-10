"use client";

import type { ReactNode } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuthReady } from "@/hooks/use-effective-user";

type PageAuthGateProps = {
  title: string;
  children: ReactNode;
};

/** Waits for session role before rendering role-specific page content. */
export function PageAuthGate({ title, children }: PageAuthGateProps) {
  const { user, isLoading } = useAuthReady();

  if (isLoading || !user?.role) {
    return (
      <MainLayout title={title}>
        <div className="flex h-72 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  return <>{children}</>;
}
