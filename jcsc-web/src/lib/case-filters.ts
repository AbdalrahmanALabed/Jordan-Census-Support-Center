import type { Case, SimpleCaseStatus } from "@/lib/cases/types";
import { toSimpleCaseStatus } from "@/lib/cases/types";
import {
  DEVELOPER_SPECIALTIES,
  resolveDeveloperSpecialty,
  type DeveloperSpecialty,
} from "@/lib/developer-specialties";
import { describeTicketPrefix, TICKET_PREFIX_LABELS } from "@/lib/ticket-numbers";
import type { UserRole } from "@/lib/types";

export type SystemPrefixFilter = "ALL" | "C" | "F" | "S" | "R" | "G";
export type SpecialtyFilter = "ALL" | DeveloperSpecialty;

export const SYSTEM_PREFIX_FILTER_OPTIONS: {
  value: SystemPrefixFilter;
  label: string;
}[] = [
  { value: "ALL", label: "كل الأنظمة" },
  { value: "C", label: "C · Call Center" },
  { value: "F", label: "F · Field Ops" },
  { value: "S", label: "S · Self Enum" },
  { value: "R", label: "R · Researcher" },
  { value: "G", label: "G · General" },
];

export const SPECIALTY_FILTER_OPTIONS: { value: SpecialtyFilter; label: string }[] = [
  { value: "ALL", label: "كل التخصصات" },
  ...DEVELOPER_SPECIALTIES.map((s) => ({ value: s.value as SpecialtyFilter, label: s.label })),
];

export function parseTicketPrefixFromNumber(number: string): string {
  return number.split("-")[0]?.toUpperCase() ?? "G";
}

export function getSystemBadgeLabel(caseNumber: string): string | null {
  const prefix = parseTicketPrefixFromNumber(caseNumber);
  return TICKET_PREFIX_LABELS[prefix] ?? describeTicketPrefix(caseNumber);
}

export function matchesSystemPrefixFilter(
  caseItem: Case,
  filter: SystemPrefixFilter
): boolean {
  if (filter === "ALL") return true;
  return parseTicketPrefixFromNumber(caseItem.number) === filter;
}

export function matchesSpecialtyFilter(
  caseItem: Case,
  filter: SpecialtyFilter
): boolean {
  if (filter === "ALL") return true;
  if (!caseItem.assignedDeveloperId && !caseItem.assignedDeveloperTeam) return false;
  const specialty = resolveDeveloperSpecialty({
    role: (caseItem.assignedDeveloperRole ?? "DEVELOPER") as UserRole,
    team: caseItem.assignedDeveloperTeam,
  });
  return specialty === filter;
}

export function computeCaseStatusKpis(cases: Case[]): Record<SimpleCaseStatus, number> {
  const kpis: Record<SimpleCaseStatus, number> = {
    NEW: 0,
    IN_PROGRESS: 0,
    SOLVED: 0,
    CLOSED: 0,
  };
  for (const c of cases) {
    kpis[toSimpleCaseStatus(c.status)] += 1;
  }
  return kpis;
}
