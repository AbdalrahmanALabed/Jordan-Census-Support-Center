/** أسماء المطورين/المسؤولين في قائمة «إسناد إلى» — بالترتيب */
export const ASSIGNEE_NAMES = [
  "محمد حازم",
  "حمزة عياد",
  "بوران عواد",
  "عبدالله مدغمش",
  "احمد موافي",
  "محمد الحسن",
  "مصطفى اليوسف",
  "محمد ابو باجة",
  "ميس جابر",
  "محمود مطاوع",
  "عبدالرحمن العبد",
] as const;

export type AssigneeName = (typeof ASSIGNEE_NAMES)[number];

/** بريد seed لكل مسؤول */
export const ASSIGNEE_SEED_USERS: { name: AssigneeName; email: string }[] = [
  { name: "محمد حازم", email: "hazem@jcsc.gov.jo" },
  { name: "حمزة عياد", email: "hamza@jcsc.gov.jo" },
  { name: "بوران عواد", email: "boran@jcsc.gov.jo" },
  { name: "عبدالله مدغمش", email: "abdullah.m@jcsc.gov.jo" },
  { name: "احمد موافي", email: "ahmad.m@jcsc.gov.jo" },
  { name: "محمد الحسن", email: "mohammad.h@jcsc.gov.jo" },
  { name: "مصطفى اليوسف", email: "mustafa@jcsc.gov.jo" },
  { name: "محمد ابو باجة", email: "mohammad.ab@jcsc.gov.jo" },
  { name: "ميس جابر", email: "mais@jcsc.gov.jo" },
  { name: "محمود مطاوع", email: "mahmoud@jcsc.gov.jo" },
  { name: "عبدالرحمن العبد", email: "abdelrahman@jcsc.gov.jo" },
];

export function sortAssigneesByName<T extends { name: string }>(users: T[]): T[] {
  const order = new Map(ASSIGNEE_NAMES.map((n, i) => [n, i]));
  return [...users].sort((a, b) => {
    const ai = order.get(a.name as AssigneeName);
    const bi = order.get(b.name as AssigneeName);
    if (ai != null && bi != null) return ai - bi;
    if (ai != null) return -1;
    if (bi != null) return 1;
    return a.name.localeCompare(b.name, "ar");
  });
}

export function isAssigneeName(name: string): name is AssigneeName {
  return (ASSIGNEE_NAMES as readonly string[]).includes(name);
}
