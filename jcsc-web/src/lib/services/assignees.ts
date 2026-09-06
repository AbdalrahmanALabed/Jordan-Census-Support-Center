import { mockUsers } from "@/lib/mock-data";
import { sortAssigneesByName } from "@/lib/assignees";
import { isTechnicalAssigneeRole } from "@/lib/developer-specialties";
import { apiFetchResult, shouldUseMockFallback } from "@/lib/api-client";

export type AssigneeOption = {
  id: string;
  name: string;
  email: string;
  team?: string | null;
};

function mockAssigneeOptions(): AssigneeOption[] {
  return sortAssigneesByName(
    mockUsers
      .filter((u) => u.isActive && isTechnicalAssigneeRole(u.role))
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        team: u.team ?? null,
      }))
  );
}

export async function getAssigneeOptions(): Promise<AssigneeOption[]> {
  const result = await apiFetchResult<AssigneeOption[]>("/api/assignees");
  if (result.ok) return result.data;
  if (!shouldUseMockFallback(result.status)) return mockAssigneeOptions();
  return mockAssigneeOptions();
}

/** قيمة الاختيار في الواجهة — دائماً user id */
export function assigneeSelectValue(option: AssigneeOption): string {
  return option.id;
}
