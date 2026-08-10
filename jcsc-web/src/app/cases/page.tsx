import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSupervisorRole } from "@/lib/reports";
import type { UserRole } from "@/lib/types";
import CasesPageClient from "./cases-page-client";

export default async function CasesPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as UserRole | undefined;

  if (role && isSupervisorRole(role)) {
    redirect("/reports/my");
  }

  return <CasesPageClient />;
}
