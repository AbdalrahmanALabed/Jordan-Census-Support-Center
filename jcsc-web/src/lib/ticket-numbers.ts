import { prisma } from "@/lib/db";
import {
  CENSUS_SYSTEMS,
  CENSUS_SYSTEM_LABELS,
  type CensusSystem,
} from "@/lib/types";

/** حرف فريد لكل نظام تعداد — يظهر في رقم الحالة/البلاغ */
export const TICKET_PREFIX_BY_SYSTEM: Record<CensusSystem, string> = {
  CALL_CENTER: "C",
  SELF_ENUMERATION: "S",
  RESEARCHER_SYSTEM: "R",
  FIELD_OPERATIONS: "F",
  INFRASTRUCTURE: "I",
};

export const TICKET_PREFIX_LABELS: Record<string, string> = {
  C: "Call Center",
  S: "Self Enumeration",
  R: "Researcher",
  F: "Field Operations",
  I: "Infrastructure",
  G: "General",
};

/** YYMMDD */
export function ticketDateStamp(date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

/** يحدد الحرف من enum أو الاسم العربي أو النص المخزّن */
export function resolveTicketPrefix(affectedSystem?: string | null): string {
  if (!affectedSystem?.trim()) return "G";

  const trimmed = affectedSystem.trim();

  if (trimmed in TICKET_PREFIX_BY_SYSTEM) {
    return TICKET_PREFIX_BY_SYSTEM[trimmed as CensusSystem];
  }

  for (const sys of CENSUS_SYSTEMS) {
    if (trimmed === sys.label || trimmed.includes(sys.label)) {
      return sys.ticketPrefix;
    }
  }

  for (const [key, label] of Object.entries(CENSUS_SYSTEM_LABELS)) {
    if (trimmed === label || trimmed.includes(label)) {
      return TICKET_PREFIX_BY_SYSTEM[key as CensusSystem];
    }
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes("call") || lower.includes("اتصال")) return "C";
  if (lower.includes("self") || lower.includes("ذاتي")) return "S";
  if (lower.includes("research") || lower.includes("باحث")) return "R";
  if (lower.includes("field") || lower.includes("ميدان")) return "F";

  return "G";
}

export function formatTicketNumber(
  prefix: string,
  sequence: number,
  date = new Date()
): string {
  const stamp = ticketDateStamp(date);
  return `${prefix}-${stamp}-${String(sequence).padStart(4, "0")}`;
}

function parseSequence(number: string, head: string): number {
  if (!number.startsWith(head)) return 0;
  return parseInt(number.slice(head.length), 10) || 0;
}

/** تسلسل مشترك عبر Case + Report + Issue لنفس الحرف واليوم */
async function nextSharedSequence(prefix: string, stamp: string): Promise<number> {
  const head = `${prefix}-${stamp}-`;

  const [caseLatest, reportLatest, issueLatest] = await Promise.all([
    prisma.case.findFirst({
      where: { number: { startsWith: head } },
      orderBy: { number: "desc" },
      select: { number: true },
    }),
    prisma.report.findFirst({
      where: { number: { startsWith: head } },
      orderBy: { number: "desc" },
      select: { number: true },
    }),
    prisma.issue.findFirst({
      where: { number: { startsWith: head } },
      orderBy: { number: "desc" },
      select: { number: true },
    }),
  ]);

  const maxSeq = Math.max(
    parseSequence(caseLatest?.number ?? "", head),
    parseSequence(reportLatest?.number ?? "", head),
    parseSequence(issueLatest?.number ?? "", head)
  );

  return maxSeq + 1;
}

/** C-260804-0001 — حرف النظام + تاريخ + تسلسل يومي فريد */
export async function generatePrefixedTicketNumber(
  affectedSystem?: string | null
): Promise<string> {
  const prefix = resolveTicketPrefix(affectedSystem);
  const stamp = ticketDateStamp();
  const seq = await nextSharedSequence(prefix, stamp);
  return formatTicketNumber(prefix, seq);
}

/** للـ mock/offline — بدون قاعدة بيانات */
export function mockPrefixedTicketNumber(
  affectedSystem: string | undefined,
  existingNumbers: string[]
): string {
  const prefix = resolveTicketPrefix(affectedSystem);
  const stamp = ticketDateStamp();
  const head = `${prefix}-${stamp}-`;
  const maxSeq = existingNumbers
    .filter((n) => n.startsWith(head))
    .reduce((max, n) => Math.max(max, parseSequence(n, head)), 0);
  return formatTicketNumber(prefix, maxSeq + 1);
}

export function describeTicketPrefix(number: string): string | null {
  const prefix = number.split("-")[0];
  return TICKET_PREFIX_LABELS[prefix] ?? null;
}
