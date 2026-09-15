import { createHash } from "node:crypto";
import { GOVERNORATES } from "@/lib/types";

export const CENTER_SUPPORT_TEAM = "الدعم الفني المراكز";
export const CENTER_SUPPORT_NAME_PREFIX = "مركز الدعم الفني";
export const CENTER_SUPPORT_EMAIL_PREFIX = "cs";
export const CENTER_SUPPORT_EMAIL_DOMAIN = "jcsc.gov.jo";
export const DEFAULT_CENTER_SUPPORT_COUNT = 1006;

export function centerSupportEmail(index: number): string {
  return `${CENTER_SUPPORT_EMAIL_PREFIX}${String(index).padStart(4, "0")}@${CENTER_SUPPORT_EMAIL_DOMAIN}`;
}

export function centerSupportDisplayName(index: number): string {
  return `${CENTER_SUPPORT_NAME_PREFIX} ${String(index).padStart(4, "0")}`;
}

/** كلمة مرور ثابتة — نفس seed-center-support-users.ts */
export function centerSupportPassword(index: number): string {
  const padded = String(index).padStart(4, "0");
  const suffix = createHash("sha256")
    .update(`jcsc-center-support-v1-${index}`)
    .digest("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 5);
  return `Jcsc@Cs${padded}${suffix}`;
}

export function centerSupportGovernorate(index: number): string {
  return GOVERNORATES[(index - 1) % GOVERNORATES.length];
}

export type CenterSupportRow = {
  index: number;
  name: string;
  email: string;
  password: string;
  governorate: string;
  role: "SUPERVISOR";
  team: string;
};

export function listCenterSupportUsers(count = DEFAULT_CENTER_SUPPORT_COUNT): CenterSupportRow[] {
  return Array.from({ length: count }, (_, i) => {
    const index = i + 1;
    return {
      index,
      name: centerSupportDisplayName(index),
      email: centerSupportEmail(index),
      password: centerSupportPassword(index),
      governorate: centerSupportGovernorate(index),
      role: "SUPERVISOR",
      team: CENTER_SUPPORT_TEAM,
    };
  });
}
