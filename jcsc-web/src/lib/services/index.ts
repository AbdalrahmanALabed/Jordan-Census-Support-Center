import type {
  Ticket,
  TicketStatus,
  TicketPriority,
  User,
  DashboardStats,
  Notification,
  KnowledgeArticle,
  Researcher,
  Comment,
  Attachment,
  TimelineEvent,
  InternalNote,
  TicketLog,
} from "@/lib/types";
import {
  mockIssues,
  mockUsers,
  mockDashboardStats,
  mockNotifications,
  mockKnowledgeArticles,
  mockResearchers,
  mockComments,
  mockAttachments,
  mockTimeline,
  mockInternalNotes,
  mockLogs,
} from "@/lib/mock-data";

export interface TicketFilters {
  search?: string;
  status?: TicketStatus | "ALL";
  priority?: TicketPriority | "ALL";
  governorate?: string;
  issueType?: string;
  team?: string;
  sortBy?: keyof Ticket;
  sortDir?: "asc" | "desc";
}

function delay(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await delay();
  return mockDashboardStats;
}

export async function getTickets(filters?: TicketFilters): Promise<Ticket[]> {
  const { fetchIssues } = await import("@/lib/services/issues");
  const apiData = await fetchIssues(filters);
  if (apiData !== null) return apiData as Ticket[];

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

export async function getTicketById(id: string): Promise<Ticket | null> {
  const { fetchIssueById } = await import("@/lib/services/issues");
  const apiData = await fetchIssueById(id);
  if (apiData) return apiData as Ticket;

  await delay();
  return mockIssues.find((t) => t.id === id) ?? null;
}

export async function getRecentTickets(limit = 5): Promise<Ticket[]> {
  await delay();
  return [...mockIssues]
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, limit);
}

export async function getUsers(): Promise<User[]> {
  await delay();
  return mockUsers;
}

export async function getNotifications(): Promise<Notification[]> {
  const { fetchNotifications } = await import("@/lib/services/notifications");
  const data = await fetchNotifications("general");
  if (data) return data.notifications;

  await delay();
  return mockNotifications;
}

export async function getEscalationNotifications() {
  const { fetchNotifications, toEscalationNotification } = await import(
    "@/lib/services/notifications"
  );
  const data = await fetchNotifications("escalation");
  if (data) return data.notifications.map(toEscalationNotification);

  await delay();
  const { mockEscalationNotifications } = await import("@/lib/mock-data/operations");
  return mockEscalationNotifications;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { fetchNotifications } = await import("@/lib/services/notifications");
  const data = await fetchNotifications("all");
  if (data) return data.unreadCount;
  await delay();
  return mockNotifications.filter((n) => !n.isRead).length;
}

export async function getKnowledgeArticles(
  search?: string,
  category?: string
): Promise<KnowledgeArticle[]> {
  const { searchSolutions, getSystemById, SOLUTION_SYSTEMS } = await import(
    "@/lib/knowledge-base/solutions"
  );

  const systemFilter =
    category && category !== "ALL"
      ? (SOLUTION_SYSTEMS.find((s) => s.label === category || s.id === category)?.id ?? "ALL")
      : "ALL";

  const items = searchSolutions(search ?? "", systemFilter as "ALL" | import("@/lib/knowledge-base/solutions").SolutionSystemId);

  return items.map((item) => {
    const system = getSystemById(item.systemId);
    return {
      id: item.id,
      title: item.title,
      content: item.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
      category: system.label,
      tags: [system.label, ...item.tags],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

export async function getResearchers(
  status?: Researcher["status"]
): Promise<Researcher[]> {
  await delay();
  if (!status) return mockResearchers;
  return mockResearchers.filter((r) => r.status === status);
}

export async function getTicketComments(ticketId: string): Promise<Comment[]> {
  const { fetchIssueById } = await import("@/lib/services/issues");
  const issue = await fetchIssueById(ticketId);
  if (issue?.comments) return issue.comments;

  await delay();
  return mockComments.filter((c) => c.ticketId === ticketId);
}

export async function getTicketAttachments(
  ticketId: string
): Promise<Attachment[]> {
  await delay();
  return mockAttachments.filter((a) => a.ticketId === ticketId);
}

export async function getTicketTimeline(
  ticketId: string
): Promise<TimelineEvent[]> {
  const { fetchIssueById } = await import("@/lib/services/issues");
  const issue = await fetchIssueById(ticketId);
  if (issue?.timeline) return issue.timeline;

  await delay();
  return mockTimeline.filter((t) => t.ticketId === ticketId);
}

export async function getTicketInternalNotes(
  ticketId: string
): Promise<InternalNote[]> {
  await delay();
  return mockInternalNotes.filter((n) => n.ticketId === ticketId);
}

export async function getTicketLogs(ticketId: string): Promise<TicketLog[]> {
  await delay();
  return mockLogs.filter((l) => l.ticketId === ticketId);
}

export async function getTicketChecklist(ticketId: string): Promise<
  import("@/lib/operations").TicketChecklistItem[]
> {
  const { fetchIssueById } = await import("@/lib/services/issues");
  const issue = await fetchIssueById(ticketId);
  if (issue?.checklist) {
    return issue.checklist.map((c, i) => ({
      id: c.id,
      ticketId,
      label: c.label,
      completed: c.completed,
      order: c.order ?? i,
    }));
  }

  await delay();
  const { mockChecklists } = await import("@/lib/mock-data/operations");
  return mockChecklists.filter((c) => c.ticketId === ticketId).sort((a, b) => a.order - b.order);
}

export async function getSimilarTickets(ticketId: string) {
  await delay();
  const { mockSimilarTickets } = await import("@/lib/mock-data/operations");
  return mockSimilarTickets[ticketId] ?? [];
}

export async function getPlaybooks(issueType?: string) {
  await delay();
  const { mockPlaybooks } = await import("@/lib/mock-data/operations");
  if (!issueType) return mockPlaybooks;
  return mockPlaybooks.filter((p) => p.issueType === issueType);
}

export async function getShiftHandovers() {
  await delay();
  const { mockShiftHandovers } = await import("@/lib/mock-data/operations");
  return mockShiftHandovers;
}

export async function getQueueTickets(team: string) {
  await delay();
  return mockIssues.filter((t) => t.team === team && t.status !== "CLOSED");
}

export async function getSuggestedKnowledge(issueType: string) {
  const { searchSolutions } = await import("@/lib/knowledge-base/solutions");
  await delay();
  const items = searchSolutions(issueType).slice(0, 3);
  const { getSystemById } = await import("@/lib/knowledge-base/solutions");
  return items.map((item) => {
    const system = getSystemById(item.systemId);
    return {
      id: item.id,
      title: item.title,
      content: item.steps.join("\n"),
      category: system.label,
      tags: [system.label],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

export async function createTicketFromTriage(data: {
  title: string;
  description: string;
  issueType: string;
  priority: TicketPriority;
  team: string;
  governorate?: string;
}) {
  await delay(300);
  const num = mockIssues.length + 1;
  const issue: Ticket = {
    id: `t${num}`,
    number: `ISS-2026-${String(num).padStart(3, "0")}`,
    title: data.title,
    description: data.description,
    status: "RECEIVED",
    priority: data.priority,
    governorate: data.governorate ?? "عمان",
    issueType: data.issueType,
    team: data.team,
    reporterName: "مستخدم",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockIssues.unshift(issue);
  return issue;
}
