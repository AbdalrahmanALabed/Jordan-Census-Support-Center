import { ASSIGNEE_NAMES, ASSIGNEE_SEED_USERS, type AssigneeName } from "@/lib/assignees";
import { mockUsers } from "@/lib/mock-data";
import { apiFetchResult, shouldUseMockFallback } from "@/lib/api-client";

export type AssigneeOption = {
  id: string | null;
  name: AssigneeName;
  email: string;
};

export async function getAssigneeOptions(): Promise<AssigneeOption[]> {
  const result = await apiFetchResult<AssigneeOption[]>("/api/assignees");
  if (result.ok) return result.data;

  if (!shouldUseMockFallback(result.status)) {
    return ASSIGNEE_NAMES.map((name) => {
      const seed = ASSIGNEE_SEED_USERS.find((s) => s.name === name)!;
      const user = mockUsers.find((u) => u.name === name || u.email === seed.email);
      return { id: user?.id ?? null, name, email: seed.email };
    });
  }

  return ASSIGNEE_NAMES.map((name) => {
    const seed = ASSIGNEE_SEED_USERS.find((s) => s.name === name)!;
    const user = mockUsers.find((u) => u.name === name || u.email === seed.email);
    return { id: user?.id ?? null, name, email: seed.email };
  });
}

/** قيمة الاختيار في الواجهة — id إن وُجد وإلا الاسم */
export function assigneeSelectValue(option: AssigneeOption): string {
  return option.id ?? option.name;
}
