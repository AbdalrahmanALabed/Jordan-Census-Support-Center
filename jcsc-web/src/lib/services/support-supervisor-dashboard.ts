export interface SupportSupervisorDashboardData {
  stats: {
    teamSize: number;
    activeTeam: number;
    totalCases: number;
    openCases: number;
    newToday: number;
    inProgress: number;
  };
  team: {
    id: string;
    name: string;
    email: string;
    role: string;
    roleLabel: string;
    governorate: string | null;
    isActive: boolean;
    caseCount: number;
    openCount: number;
  }[];
  recentCases: {
    id: string;
    number: string;
    title: string;
    status: string;
    simpleStatus: string;
    createdByName: string;
    createdByRole?: string;
    governorate: string;
    createdAt: string;
    updatedAt: string;
  }[];
}

export async function getSupportSupervisorDashboard(): Promise<SupportSupervisorDashboardData> {
  const res = await fetch("/api/dashboard/support-supervisor");
  if (!res.ok) throw new Error("فشل تحميل لوحة مشرف الدعم");
  return res.json();
}
