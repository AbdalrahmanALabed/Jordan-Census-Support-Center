/**
 * قائمة المستخدمين الرسميين للإطلاق — تُرفع إلى GitHub.
 * Run: npx tsx scripts/setup-production-users.ts
 */
import { UserRole } from "@prisma/client";
import {
  REGIONAL_COORDINATORS,
  FIELD_OPERATIONS_COORDINATOR,
  RESEARCHER_FIELD_COORDINATOR,
  INFRASTRUCTURE_SUPERVISOR,
} from "../src/lib/coordinator-routing";
import { AHMED_AY_PROFILE } from "../src/lib/developers/escalation-hierarchy";

export type OfficialUserDef = {
  name: string;
  email: string;
  role: UserRole;
  team: string;
  governorate: string;
};

export const OFFICIAL_USERS: OfficialUserDef[] = [
  { name: "Super Admin", email: "admin@jcsc.gov.jo", role: UserRole.ADMIN, team: "إدارة", governorate: "عمان" },
  {
    name: "مشرف الدعم",
    email: "support-supervisor@jcsc.gov.jo",
    role: UserRole.SUPPORT_SUPERVISOR,
    team: "الدعم",
    governorate: "عمان",
  },
  ...REGIONAL_COORDINATORS.map((c) => ({
    name: c.name,
    email: c.email,
    role: UserRole.SUPPORT_COORDINATOR,
    team: "منسق الدعم",
    governorate: c.governorates[0],
  })),
  {
    name: FIELD_OPERATIONS_COORDINATOR.name,
    email: FIELD_OPERATIONS_COORDINATOR.email,
    role: UserRole.FIELD_OPERATIONS_COORDINATOR,
    team: "منسق إدارة العمل الميداني",
    governorate: "عمان",
  },
  {
    name: RESEARCHER_FIELD_COORDINATOR.name,
    email: RESEARCHER_FIELD_COORDINATOR.email,
    role: UserRole.RESEARCHER_FIELD_COORDINATOR,
    team: "مشرف الدعم الفني",
    governorate: "عمان",
  },
  {
    name: INFRASTRUCTURE_SUPERVISOR.name,
    email: INFRASTRUCTURE_SUPERVISOR.email,
    role: UserRole.INFRASTRUCTURE_SUPERVISOR,
    team: "البنية التحتية",
    governorate: "عمان",
  },
  {
    name: "دعم فني — إربد",
    email: "supervisor@jcsc.gov.jo",
    role: UserRole.SUPERVISOR,
    team: "الدعم الفني المراكز",
    governorate: "إربد",
  },
  {
    name: "دعم فني — العقبة",
    email: "supervisor.aqaba@jcsc.gov.jo",
    role: UserRole.SUPERVISOR,
    team: "الدعم الفني المراكز",
    governorate: "العقبة",
  },
  { name: "محمد حازم", email: "hazem@jcsc.gov.jo", role: UserRole.DEVELOPER, team: "Developer", governorate: "عمان" },
  { name: "بوران عواد", email: "boran@jcsc.gov.jo", role: UserRole.DEVELOPER, team: "Developer", governorate: "عمان" },
  { name: "حمزة عياد", email: "hamza@jcsc.gov.jo", role: UserRole.DEVELOPER, team: "Developer", governorate: "عمان" },
  { name: "عبدالله مدغمش", email: "abdullah.m@jcsc.gov.jo", role: UserRole.DEVELOPER, team: "Developer", governorate: "عمان" },
  { name: "احمد موافي", email: "ahmad.m@jcsc.gov.jo", role: UserRole.DEVELOPER, team: "Developer", governorate: "عمان" },
  { name: "محمد الحسن", email: "mohammad.h@jcsc.gov.jo", role: UserRole.DEVELOPER, team: "Developer", governorate: "عمان" },
  { name: "مصطفى اليوسف", email: "mustafa@jcsc.gov.jo", role: UserRole.DEVELOPER, team: "Developer", governorate: "عمان" },
  { name: "محمد ابو باجة", email: "mohammad.ab@jcsc.gov.jo", role: UserRole.DEVELOPER, team: "Developer", governorate: "عمان" },
  { name: "ميس جابر", email: "mais@jcsc.gov.jo", role: UserRole.DEVELOPER, team: "Developer", governorate: "عمان" },
  { name: "محمود مطاوع", email: "mahmoud@jcsc.gov.jo", role: UserRole.DEVELOPER, team: "Developer", governorate: "عمان" },
  { name: "عبدالرحمن العبد", email: "abdelrahman@jcsc.gov.jo", role: UserRole.DEVELOPER, team: "Developer", governorate: "عمان" },
  {
    name: AHMED_AY_PROFILE.name,
    email: AHMED_AY_PROFILE.email,
    role: UserRole.DEVELOPER,
    team: AHMED_AY_PROFILE.team,
    governorate: AHMED_AY_PROFILE.governorate,
  },
];
