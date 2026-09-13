import type { ReportClassification, IssuePriority } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generatePrefixedTicketNumber } from "@/lib/ticket-numbers";

export function parseKeywords(raw: string): string[] {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return raw.split(",").map((k) => k.trim());
  }
}

export async function recommendRouting(description: string) {
  const text = description.toLowerCase();
  const rules = await prisma.routingRule.findMany({ where: { enabled: true } });

  for (const rule of rules) {
    const keywords = parseKeywords(rule.keywords);
    if (keywords.some((k) => text.includes(k.toLowerCase()))) {
      return {
        team: rule.recommendedTeam,
        classification: rule.recommendedClassification,
        priority: rule.priority,
        autoConvertAllowed: rule.autoConvertAllowed,
      };
    }
  }

  return {
    team: "Call Center",
    classification: "QUESTION" as ReportClassification,
    priority: "MEDIUM" as IssuePriority,
    autoConvertAllowed: false,
  };
}

export async function generateReportNumber(affectedSystem?: string): Promise<string> {
  return generatePrefixedTicketNumber(affectedSystem);
}

export async function generateIssueNumber(affectedSystem?: string): Promise<string> {
  return generatePrefixedTicketNumber(affectedSystem);
}

function mapReportStatus(status: string) {
  const map: Record<string, string> = {
    NEW: "NEW",
    UNDER_REVIEW: "UNDER_REVIEW",
    CLASSIFIED: "WAITING_CLASSIFICATION",
    CONVERTED: "CONVERTED_TO_TICKET",
    REJECTED: "REJECTED",
  };
  return map[status] ?? status;
}

function deriveManagerDecision(report: {
  status: string;
  classification?: string | null;
  rejectionReason?: string | null;
}): "CONFIRMED_PROBLEM" | "NOT_A_PROBLEM" | undefined {
  if (report.status === "REJECTED" || report.rejectionReason) return "NOT_A_PROBLEM";
  if (report.status === "CLASSIFIED" && report.classification === "BUG") return "CONFIRMED_PROBLEM";
  if (report.status === "CONVERTED") return "CONFIRMED_PROBLEM";
  return undefined;
}

export function mapReportToClient(report: Awaited<ReturnType<typeof fetchReport>>) {
  if (!report) return null;
  const managerDecision = deriveManagerDecision(report);
  return {
    id: report.id,
    number: report.number,
    observation: report.description,
    status: mapReportStatus(report.status),
    governorate: report.governorate,
    district: report.district ?? undefined,
    center: report.center ?? undefined,
    enumeratorsAffected: report.enumeratorsAffected,
    supervisorId: report.supervisorId,
    supervisorName: report.supervisor.name,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    reviewedBy: report.reviewedBy?.name,
    reviewedAt: report.reviewedAt?.toISOString(),
    classification: report.classification ?? undefined,
    rejectionReason: report.rejectionReason ?? undefined,
    managerDecision,
    convertedIssueId: report.convertedIssueId ?? undefined,
    convertedIssueNumber: report.convertedIssue?.number,
    convertedTicketId: report.convertedIssueId ?? undefined,
    convertedTicketNumber: report.convertedIssue?.number,
    linkedCaseId: report.sourceCases?.[0]?.id,
    linkedCaseNumber: report.sourceCases?.[0]?.number,
    recommendedTeam: report.recommendedTeam ?? undefined,
    recommendedPriority: report.recommendedPriority ?? undefined,
    submissionChannel: report.submissionChannel,
    affectedSystem: report.affectedSystem ?? undefined,
    researcherIssueType: report.researcherIssueType ?? undefined,
    attachments: report.attachments.map((a) => ({
      id: a.id,
      reportId: a.reportId,
      name: a.name,
      type: a.type.toLowerCase() as "image" | "video" | "voice" | "log" | "pdf",
      url: a.url,
      size: a.size ?? undefined,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export const reportClientInclude = {
  supervisor: true,
  reviewedBy: true,
  convertedIssue: true,
  attachments: true,
  sourceCases: { select: { id: true, number: true }, take: 1 },
} as const;

async function fetchReport(id: string) {
  return prisma.report.findUnique({
    where: { id },
    include: reportClientInclude,
  });
}

export async function getReportWithRelations(id: string) {
  return fetchReport(id);
}

export async function listReportsWithRelations(where: Record<string, unknown> = {}) {
  return prisma.report.findMany({
    where,
    include: reportClientInclude,
    orderBy: { createdAt: "desc" },
  });
}

const STOP_WORDS = new Set(["في", "من", "على", "إلى", "أن", "هذا", "هذه", "التي", "الذي", "لا", "ما", "مع"]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/** بلاغات مشابهة — للكشف عن التكرار */
export async function findSimilarReports(
  reportId: string,
  description: string,
  affectedSystem?: string | null
) {
  const tokens = tokenize(description);
  if (tokens.length === 0) return [];

  const candidates = await prisma.report.findMany({
    where: {
      id: { not: reportId },
      status: { in: ["NEW", "UNDER_REVIEW", "CLASSIFIED", "CONVERTED"] },
    },
    include: reportClientInclude,
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  const scored = candidates
    .map((r) => {
      const otherTokens = new Set(tokenize(r.description));
      let overlap = tokens.filter((t) => otherTokens.has(t)).length;
      if (affectedSystem && r.affectedSystem === affectedSystem) overlap += 1;
      return { report: r, score: overlap };
    })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return scored.map((x) => mapReportToClient(x.report)!);
}
