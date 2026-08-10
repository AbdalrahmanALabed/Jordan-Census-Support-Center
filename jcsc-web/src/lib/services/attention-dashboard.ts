import { getCases, getRecentCaseActivity } from "@/lib/services/cases";
import {
  toSimpleCaseStatus,
  CASE_TYPE_LABELS,
  type Case,
  type CaseTimelineEvent,
} from "@/lib/cases/types";

export interface DashboardActivity extends CaseTimelineEvent {
  caseNumber?: string;
  caseTitle?: string;
}

export interface OperationsDashboardData {
  waitingReview: Case[];
  escalatedSystemBugs: Case[];
  assignedToDevelopers: Case[];
  solvedAwaitingClose: Case[];
  closedToday: Case[];
  topIssueToday: { label: string; count: number } | null;
  latestActivities: DashboardActivity[];
  stats: {
    waitingReview: number;
    assignedToDevelopers: number;
    solvedAwaitingClose: number;
    closedToday: number;
    totalOpen: number;
    createdToday: number;
    criticalOpen: number;
    highOpen: number;
    mediumOpen: number;
    lowOpen: number;
    waitingDeployment: number;
    unassigned: number;
    totalClosed: number;
    bugsOpen: number;
    resolvedToday: number;
    inProgressTotal: number;
    escalatedSystemBugs: number;
  };
  byType: { label: string; count: number; type: string }[];
  byPriority: { label: string; count: number; priority: string }[];
  byTeam: { label: string; count: number }[];
  weeklyTrend: { date: string; count: number }[];
}

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function isOpenCase(c: Case): boolean {
  return toSimpleCaseStatus(c.status) !== "CLOSED";
}

function buildWeeklyTrend(cases: Case[]): { date: string; count: number }[] {
  const days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    days.push({
      date: label,
      count: cases.filter((c) => new Date(c.createdAt).toDateString() === key).length,
    });
  }
  return days;
}

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: "حرجة",
  HIGH: "عالية",
  MEDIUM: "متوسطة",
  LOW: "منخفضة",
};

type CaseSummaryStats = {
  pendingCoordinator: number;
  awaitingApproval: number;
  inProgress: number;
  solved: number;
  closedToday: number;
  escalatedToday: number;
  createdToday: number;
  waitingDeployment: number;
  bugsOpen: number;
  totalOpen: number;
};

async function fetchCaseSummaryStats(): Promise<CaseSummaryStats | null> {
  try {
    const res = await fetch("/api/cases/summary");
    if (!res.ok) return null;
    return (await res.json()) as CaseSummaryStats;
  } catch {
    return null;
  }
}

export async function getOperationsDashboard(): Promise<OperationsDashboardData> {
  const [cases, summary, latestActivities] = await Promise.all([
    getCases(),
    fetchCaseSummaryStats(),
    getRecentCaseActivity(12),
  ]);

  const waitingReview = cases.filter((c) => c.status === "AWAITING_APPROVAL");
  const escalatedSystemBugs = waitingReview;
  const pendingCoordinator = cases.filter((c) => c.status === "OPEN");
  const assignedToDevelopers = cases.filter(
    (c) =>
      toSimpleCaseStatus(c.status) === "IN_PROGRESS" &&
      (c.assignedDeveloperId || c.assignedDeveloperName)
  );
  const inProgressAll = cases.filter((c) => toSimpleCaseStatus(c.status) === "IN_PROGRESS");
  const solvedAwaitingClose = cases.filter((c) => toSimpleCaseStatus(c.status) === "SOLVED");
  const closedToday = cases.filter(
    (c) => toSimpleCaseStatus(c.status) === "CLOSED" && isToday(c.updatedAt)
  );

  const todayCases = cases.filter((c) => isToday(c.createdAt));
  const counts: Record<string, number> = {};
  for (const c of todayCases) {
    const key = CASE_TYPE_LABELS[c.caseType] ?? c.caseType;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const topEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const topIssueToday = topEntry ? { label: topEntry[0], count: topEntry[1] } : null;

  const byType = Object.entries(
    cases.reduce<Record<string, number>>((acc, c) => {
      const label = CASE_TYPE_LABELS[c.caseType] ?? c.caseType;
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([label, count]) => ({ label, count, type: label }))
    .sort((a, b) => b.count - a.count);

  const totalOpen =
    pendingCoordinator.length +
    waitingReview.length +
    inProgressAll.length +
    solvedAwaitingClose.length;

  const openCases = cases.filter(isOpenCase);
  const createdToday = cases.filter((c) => isToday(c.createdAt));
  const waitingDeployment = cases.filter((c) => c.status === "WAITING_DEPLOYMENT");
  const unassigned = inProgressAll.filter(
    (c) => !c.assignedDeveloperId && !c.assignedDeveloperName
  );
  const totalClosed = cases.filter((c) => toSimpleCaseStatus(c.status) === "CLOSED");
  const bugsOpen = openCases.filter((c) => c.caseType === "BUG");
  const resolvedToday = cases.filter(
    (c) => toSimpleCaseStatus(c.status) === "SOLVED" && isToday(c.updatedAt)
  );

  const priorityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const c of openCases) {
    const p = c.priority as keyof typeof priorityCounts;
    if (p in priorityCounts) priorityCounts[p]++;
  }

  const byPriority = (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((p) => ({
    priority: p,
    label: PRIORITY_LABELS[p],
    count: priorityCounts[p],
  }));

  const teamMap = openCases.reduce<Record<string, number>>((acc, c) => {
    const team = c.assignedTeam ?? c.suggestedTeam ?? "غير محدد";
    acc[team] = (acc[team] ?? 0) + 1;
    return acc;
  }, {});
  const byTeam = Object.entries(teamMap)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return {
    waitingReview,
    escalatedSystemBugs,
    assignedToDevelopers,
    solvedAwaitingClose,
    closedToday,
    topIssueToday,
    latestActivities,
    stats: {
      waitingReview: summary?.awaitingApproval ?? waitingReview.length,
      assignedToDevelopers: assignedToDevelopers.length,
      solvedAwaitingClose: solvedAwaitingClose.length,
      closedToday: summary?.closedToday ?? closedToday.length,
      totalOpen: summary?.totalOpen ?? totalOpen,
      createdToday: summary?.createdToday ?? createdToday.length,
      criticalOpen: priorityCounts.CRITICAL,
      highOpen: priorityCounts.HIGH,
      mediumOpen: priorityCounts.MEDIUM,
      lowOpen: priorityCounts.LOW,
      waitingDeployment: summary?.waitingDeployment ?? waitingDeployment.length,
      unassigned: unassigned.length,
      totalClosed: totalClosed.length,
      bugsOpen: summary?.bugsOpen ?? bugsOpen.length,
      resolvedToday: resolvedToday.length,
      inProgressTotal: inProgressAll.length,
      escalatedSystemBugs: escalatedSystemBugs.length,
    },
    byType,
    byPriority,
    byTeam,
    weeklyTrend: buildWeeklyTrend(cases),
  };
}

export interface CoordinatorDashboardData {
  pendingClassification: Case[];
  escalatedToday: Case[];
  closedToday: Case[];
  latestActivities: DashboardActivity[];
  stats: {
    pending: number;
    escalatedToday: number;
    closedToday: number;
  };
}

export async function getCoordinatorDashboard(): Promise<CoordinatorDashboardData> {
  const [summary, pendingClassification] = await Promise.all([
    fetchCaseSummaryStats(),
    getCases({ status: "OPEN", limit: 50 }),
  ]);

  return {
    pendingClassification,
    escalatedToday: [],
    closedToday: [],
    latestActivities: [],
    stats: {
      pending: summary?.pendingCoordinator ?? pendingClassification.length,
      escalatedToday: summary?.escalatedToday ?? 0,
      closedToday: summary?.closedToday ?? 0,
    },
  };
}

/** @deprecated use getOperationsDashboard */
export async function getManagerAttentionDashboard() {
  const d = await getOperationsDashboard();
  return {
    newCases: d.waitingReview,
    inProgress: d.assignedToDevelopers,
    solvedAwaitingClose: d.solvedAwaitingClose,
    topIssueToday: d.topIssueToday,
  };
}

export interface DeveloperDashboardData {
  assignedToMe: Case[];
  requiresDeployment: Case[];
  solvedAwaitingReview: Case[];
  solvedToday: Case[];
  latestActivities: DashboardActivity[];
  stats: {
    assigned: number;
    deployment: number;
    solvedPending: number;
    solvedToday: number;
  };
}

function isAssignedToDeveloper(c: Case, developerId: string, developerName?: string): boolean {
  return (
    c.assignedDeveloperId === developerId ||
    (!!developerName && c.assignedDeveloperName === developerName)
  );
}

export async function getDeveloperDashboard(
  developerId: string,
  developerName?: string
): Promise<DeveloperDashboardData> {
  const [inProgressCases, deploymentCases, solvedCases, closedCases] = await Promise.all([
    getCases({ caseType: "BUG", simpleStatus: "IN_PROGRESS" }),
    getCases({ caseType: "BUG", status: "WAITING_DEPLOYMENT" }),
    getCases({ caseType: "BUG", simpleStatus: "SOLVED" }),
    getCases({ caseType: "BUG", simpleStatus: "CLOSED", limit: 80 }),
  ]);

  const cases = [...inProgressCases, ...deploymentCases, ...solvedCases, ...closedCases];
  const uniqueCases = [...new Map(cases.map((c) => [c.id, c])).values()];

  const mine = uniqueCases.filter(
    (c) => c.caseType === "BUG" && isAssignedToDeveloper(c, developerId, developerName)
  );

  const assignedToMe = mine.filter((c) => toSimpleCaseStatus(c.status) === "IN_PROGRESS");
  const requiresDeployment = mine.filter((c) => c.status === "WAITING_DEPLOYMENT");
  const solvedAwaitingReview = mine.filter((c) => toSimpleCaseStatus(c.status) === "SOLVED");
  const solvedToday = mine.filter(
    (c) => toSimpleCaseStatus(c.status) === "CLOSED" && isToday(c.updatedAt)
  );

  return {
    assignedToMe,
    requiresDeployment,
    solvedAwaitingReview,
    solvedToday,
    latestActivities: [],
    stats: {
      assigned: assignedToMe.length,
      deployment: requiresDeployment.length,
      solvedPending: solvedAwaitingReview.length,
      solvedToday: solvedToday.length,
    },
  };
}
