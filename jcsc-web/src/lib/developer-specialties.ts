import type { User, UserRole } from "@/lib/types";

/** Developer team specialties — stored in user.team */
export const DEVELOPER_SPECIALTIES = [
  { value: "DEVELOPER", team: "Developer", label: "Developer" },
  { value: "DATABASE", team: "Database", label: "Database" },
  { value: "DESIGN", team: "Design", label: "Design" },
  { value: "DEVOPS", team: "DevOps", label: "DevOps" },
] as const;

export type DeveloperSpecialty = (typeof DEVELOPER_SPECIALTIES)[number]["value"];

export const DEVELOPER_SPECIALTY_LABELS: Record<DeveloperSpecialty, string> =
  Object.fromEntries(
    DEVELOPER_SPECIALTIES.map((s) => [s.value, s.label])
  ) as Record<DeveloperSpecialty, string>;

export const DEVELOPER_SPECIALTY_COLORS: Record<DeveloperSpecialty, string> = {
  DEVELOPER: "bg-violet-500/15 text-violet-700 border-violet-300",
  DATABASE: "bg-amber-500/15 text-amber-800 border-amber-300",
  DESIGN: "bg-pink-500/15 text-pink-700 border-pink-300",
  DEVOPS: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
};

const TEAM_TO_SPECIALTY = new Map(
  DEVELOPER_SPECIALTIES.flatMap((s) => [
    [s.team.toLowerCase(), s.value],
    [s.value.toLowerCase(), s.value],
    [s.label.toLowerCase(), s.value],
  ])
);

/** Legacy team names → current specialty */
TEAM_TO_SPECIALTY.set("backend", "DEVELOPER");
TEAM_TO_SPECIALTY.set("frontend", "DEVELOPER");
TEAM_TO_SPECIALTY.set("mobile", "DEVELOPER");
TEAM_TO_SPECIALTY.set("gis", "DEVELOPER");
TEAM_TO_SPECIALTY.set("android", "DEVELOPER");

const ROLE_TO_SPECIALTY: Partial<Record<UserRole, DeveloperSpecialty>> = {
  DEVELOPER: "DEVELOPER",
  DATABASE: "DATABASE",
  DEVOPS: "DEVOPS",
};

/** Roles that can be assigned bugs/cases — specialty comes from user.team */
export const TECHNICAL_ASSIGNEE_ROLES: UserRole[] = ["DEVELOPER"];

export function isTechnicalAssigneeRole(role?: UserRole | string | null): boolean {
  return TECHNICAL_ASSIGNEE_ROLES.includes(role as UserRole);
}

export function resolveDeveloperSpecialty(user: Pick<User, "role" | "team">): DeveloperSpecialty | null {
  if (user.team) {
    const key = user.team.trim().toLowerCase();
    const fromTeam = TEAM_TO_SPECIALTY.get(key);
    if (fromTeam) return fromTeam;
    for (const s of DEVELOPER_SPECIALTIES) {
      if (key.includes(s.team.toLowerCase()) || key.includes(s.label.toLowerCase())) {
        return s.value;
      }
    }
  }
  return ROLE_TO_SPECIALTY[user.role] ?? null;
}

export function getSpecialtyLabel(user: Pick<User, "role" | "team">): string {
  const specialty = resolveDeveloperSpecialty(user);
  if (specialty) return DEVELOPER_SPECIALTY_LABELS[specialty];
  if (user.team) return user.team;
  return "Developer";
}

export function getSpecialtyLabelFromTeam(team?: string | null): string {
  if (!team) return "—";
  const key = team.trim().toLowerCase();
  for (const s of DEVELOPER_SPECIALTIES) {
    if (
      s.team.toLowerCase() === key ||
      s.label.toLowerCase() === key ||
      s.value.toLowerCase() === key
    ) {
      return s.label;
    }
  }
  return team;
}

export function getSpecialtyBadgeClass(user: Pick<User, "role" | "team">): string {
  const specialty = resolveDeveloperSpecialty(user);
  if (specialty) return DEVELOPER_SPECIALTY_COLORS[specialty];
  return "bg-muted text-muted-foreground border-border";
}
