/**
 * استعادة الحسابات التي حُذفت خطأً أثناء prepare-production-launch
 * Run: npx tsx scripts/restore-deleted-users.ts
 */
import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { normalizeEmail } from "../src/lib/email";

const prisma = new PrismaClient();

const RESTORED_USERS: {
  name: string;
  email: string;
  role: UserRole;
  team?: string;
  governorate?: string;
  isActive?: boolean;
}[] = [
  {
    name: "منسق الدعم",
    email: "coordinator@jcsc.gov.jo",
    role: "SUPPORT_COORDINATOR",
    team: "منسق الدعم",
    governorate: "عمان",
    isActive: false,
  },
  {
    name: "مطور33",
    email: "m-motawer33@jcsc.gov.jo",
    role: "DEVELOPER",
    team: "Developer",
    governorate: "عمان",
  },
  {
    name: "جمال  مطور",
    email: "j-mahmood@jcsc.gov.jo",
    role: "DEVELOPER",
    team: "Developer",
    governorate: "عمان",
  },
  {
    name: "مشرف الكرk",
    email: "m-moshref11@jcsc.gov.jo",
    role: "SUPERVISOR",
    team: "الدعm الفني المراكز",
    governorate: "الكرk",
  },
  {
    name: "داعm فني123",
    email: "daem-f@jcsc.gov.jo",
    role: "SUPERVISOR",
    team: "الدعm الفني المراكز",
    governorate: "عمان",
  },
  {
    name: "شريف  مشرف الدعm",
    email: "s-moshref@jcsc.gov.jo",
    role: "SUPERVISOR",
    team: "الدعm الفني المراكز",
    governorate: "عمان",
  },
  {
    name: "ابراهيم تجربة",
    email: "ibraheem@jcsc.gov.jo",
    role: "SUPERVISOR",
    team: "الدعm الفني المراكز",
    governorate: "عمان",
  },
];

async function main() {
  const passwordHash = await hash("jcsc2026", 10);
  const supportSupervisor = await prisma.user.findFirst({
    where: { email: "support-supervisor@jcsc.gov.jo" },
  });

  let restored = 0;
  for (const u of RESTORED_USERS) {
    const email = normalizeEmail(u.email);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`• موجود مسبقاً: ${u.name} (${email})`);
      continue;
    }

    await prisma.user.create({
      data: {
        name: u.name,
        email,
        password: passwordHash,
        role: u.role,
        team: u.team ?? null,
        governorate: u.governorate ?? "عمان",
        phone: "+962790000000",
        shift: "صباحي",
        specialtyTags: "[]",
        isActive: u.isActive ?? true,
        directManagerId:
          u.role === "SUPERVISOR" && supportSupervisor ? supportSupervisor.id : null,
      },
    });
    console.log(`✓ استُعيد: ${u.name} (${email}) — ${u.role}`);
    restored++;
  }

  const total = await prisma.user.count();
  console.log(`\n✓ استُعيد ${restored} حساب | الإجمالي الآن: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
