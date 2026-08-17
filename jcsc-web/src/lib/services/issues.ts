import type { Issue, IssueStatus, IssuePriority, OperationsStats } from "@/lib/types";
import { mockIssues } from "@/lib/mock-data";
import { apiFetchResult, shouldUseMockFallback } from "@/lib/api-client";
import { withBasePath } from "@/lib/base-path";

function delay(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchIssues(filters?: IssueFilters): Promise<Issue[] | null> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.status && filters.status !== "ALL") params.set("status", filters.status);
  if (filters?.governorate && filters.governorate !== "ALL") params.set("governorate", filters.governorate);
  if (filters?.team && filters.team !== "ALL") params.set("team", filters.team);
  if (filters?.priority && filters.priority !== "ALL") params.set("priority", filters.priority);
  if (filters?.issueType && filters.issueType !== "ALL") params.set("category", filters.issueType);

  const result = await apiFetchResult<Issue[]>(`/api/issues?${params}`);
  if (result.ok) return result.data;
  if (!shouldUseMockFallback(result.status)) return null;

  await delay();
  return mockIssues;
}

export async function fetchIssueById(id: string): Promise<Issue | null> {
  const result = await apiFetchResult<Issue>(`/api/issues/${id}`);
  if (result.ok) return result.data;
  if (result.status === 404) return null;
  if (!shouldUseMockFallback(result.status)) return null;

  await delay();
  return mockIssues.find((i) => i.id === id) ?? null;
}

export async function fetchTeamQueue(team: string): Promise<Issue[] | null> {
  const params = new URLSearchParams({ team });
  const result = await apiFetchResult<Issue[]>(`/api/issues?${params}`);
  if (result.ok) return result.data;
  if (!shouldUseMockFallback(result.status)) return null;

  await delay();
  return mockIssues.filter((i) => i.team === team);
}

export async function updateIssueStatus(
  id: string,
  data: { status: IssueStatus; comment?: string; closeReason?: string; resolutionNote?: string }
): Promise<Issue> {
  const res = await fetch(withBasePath(`/api/issues/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "فشل الطلب" }));
    throw new Error((err as { error?: string }).error ?? "فشل الطلب");
  }
  return res.json();
}

export async function addIssueComment(
  id: string,
  content: string,
  isInternal = true
): Promise<{ id: string; content: string; authorName: string; createdAt: string }> {
  const res = await fetch(withBasePath(`/api/issues/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "add_comment", content, isInternal }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "فشل الطلب" }));
    throw new Error((err as { error?: string }).error ?? "فشل الطلب");
  }
  return res.json();
}

export async function toggleChecklistItem(
  id: string,
  itemId: string,
  completed: boolean
): Promise<void> {
  const res = await fetch(withBasePath(`/api/issues/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "toggle_checklist", itemId, completed }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "فشل الطلب" }));
    throw new Error((err as { error?: string }).error ?? "فشل الطلب");
  }
}

export interface IssueFilters {
  search?: string;
  status?: IssueStatus | "ALL";
  priority?: IssuePriority | "ALL";
  governorate?: string;
  issueType?: string;
  team?: string;
  sortBy?: keyof Issue;
  sortDir?: "asc" | "desc";
}

const OPEN_STATUSES: IssueStatus[] = [
  "RECEIVED",
  "ASSIGNED",
  "IN_PROGRESS",
  "NEED_INFO",
  "WAITING_DEPLOYMENT",
  "READY_FOR_TESTING",
  "RETURNED",
];

export async function getIssues(filters?: IssueFilters): Promise<Issue[]> {
  const apiData = await fetchIssues(filters);
  if (apiData !== null) return apiData;

  await delay();
  let result = [...mockIssues];

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (t) =>
        t.number.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.governorate.includes(q) ||
        t.assigneeName?.includes(q) ||
        t.reporterName?.includes(q)
    );
  }
  if (filters?.status && filters.status !== "ALL") {
    result = result.filter((t) => t.status === filters.status);
  }
  if (filters?.priority && filters.priority !== "ALL") {
    result = result.filter((t) => t.priority === filters.priority);
  }
  if (filters?.governorate && filters.governorate !== "ALL") {
    result = result.filter((t) => t.governorate === filters.governorate);
  }
  if (filters?.issueType && filters.issueType !== "ALL") {
    result = result.filter((t) => t.issueType === filters.issueType);
  }
  if (filters?.team && filters.team !== "ALL") {
    result = result.filter((t) => t.team === filters.team);
  }

  if (filters?.sortBy) {
    const dir = filters.sortDir === "asc" ? 1 : -1;
    result.sort((a, b) => {
      const av = a[filters.sortBy!];
      const bv = b[filters.sortBy!];
      if (av === bv) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return av > bv ? dir : -dir;
    });
  } else {
    result.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  return result;
}

export async function getIssueById(id: string): Promise<Issue | null> {
  const apiData = await fetchIssueById(id);
  if (apiData) return apiData;

  await delay();
  return mockIssues.find((t) => t.id === id) ?? null;
}

export async function getRecentIssues(limit = 5): Promise<Issue[]> {
  await delay();
  return [...mockIssues]
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, limit);
}

export async function getOperationsStats(): Promise<OperationsStats> {
  await delay();
  const now = Date.now();
  return {
    received: mockIssues.filter((i) => i.status === "RECEIVED").length,
    assigned: mockIssues.filter((i) => i.status === "ASSIGNED").length,
    inProgress: mockIssues.filter((i) => i.status === "IN_PROGRESS").length,
    needInfo: mockIssues.filter((i) => i.status === "NEED_INFO").length,
    waitingDeployment: mockIssues.filter((i) => i.status === "WAITING_DEPLOYMENT").length,
    readyForTesting: mockIssues.filter((i) => i.status === "READY_FOR_TESTING").length,
    returned: mockIssues.filter((i) => i.status === "RETURNED").length,
    closed: mockIssues.filter((i) => i.status === "CLOSED").length,
    slaBreached: mockIssues.filter(
      (i) =>
        i.slaTargetAt &&
        new Date(i.slaTargetAt).getTime() < now &&
        i.status !== "CLOSED"
    ).length,
    chartData: [
      { date: "26/7", count: 4 },
      { date: "27/7", count: 7 },
      { date: "28/7", count: 5 },
      { date: "29/7", count: 9 },
      { date: "30/7", count: 6 },
      { date: "31/7", count: 11 },
      { date: "1/8", count: 7 },
    ],
  };
}

export { OPEN_STATUSES };
