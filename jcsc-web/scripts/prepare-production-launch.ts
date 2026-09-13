/**
 * تجهيز قاعدة البيانات للإطلاق الرسمي:
 * - حذف البلاغات والحالات والإشعارات وسجل التدقيق فقط
 * - لا يحذف أي مستخدم — USE_REMOVE_USERS=true لحذف غير الرسميين (غير موصى)
 *
 * Run: npx tsx scripts/prepare-production-launch.ts
 */
import { PrismaClient } from "@prisma/client";
import { PRODUCTION_PASSWORDS } from "../prisma/production-passwords";
import {
  FIELD_OPERATIONS_COORDINATOR,
  RESEARCHER_FIELD_COORDINATOR,
  REGIONAL_COORDINATORS,
} from "../src/lib/coordinator-routing";
import { AHMED_AY_PROFILE } from "../src/lib/developers/escalation-hierarchy";

const prisma = new PrismaClient();

const ALLOWED_EMAILS = new Set(
  Object.keys(PRODUCTION_PASSWORDS).map((e) => e.trim().toLowerCase())
);

/** حسابات دعم المراكز cs0001–cs9999 — لا تُحذف أبداً */
function isProtectedProductionUser(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (ALLOWED_EMAILS.has(e)) return true;
  return /^cs\d{4}@jcsc\.gov\.jo$/.test(e);
}

/** أسماء رسمية للحسابات — مزامنة بعد التنظيف */
const OFFICIAL_NAMES: Record<string, string> = {
  "admin@jcsc.gov.jo": "Super Admin",
  "support-supervisor@jcsc.gov.jo": "مشرف الدعم",
  [FIELD_OPERATIONS_COORDINATOR.email]: FIELD_OPERATIONS_COORDINATOR.name,
  [RESEARCHER_FIELD_COORDINATOR.email]: RESEARCHER_FIELD_COORDINATOR.name,
  "supervisor@jcsc.gov.jo": "دعم فني — إربد",
  "supervisor.aqaba@jcsc.gov.jo": "دعم فني — العقبة",
  [AHMED_AY_PROFILE.email]: AHMED_AY_PROFILE.name,
};
for (const c of REGIONAL_COORDINATORS) {
  OFFICIAL_NAMES[c.email] = c.name;
}

async function clearOperationalData() {
  await prisma.auditLog.deleteMany();
  await prisma.notificationDebounce.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.issueChecklistItem.deleteMany();
  await prisma.issueTimelineEvent.deleteMany();
  await prisma.issueComment.deleteMany();
  await prisma.issueAttachment.deleteMany();
  await prisma.issueReport.deleteMany();
  await prisma.caseAttachment.deleteMany();
  await prisma.caseTimelineEvent.deleteMany();
  await prisma.caseComment.deleteMany();
  await prisma.caseDecision.deleteMany();
  await prisma.case.deleteMany();
  await prisma.reportAttachment.deleteMany();
  await prisma.report.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.knowledgeArticle.deleteMany();
}

async function removeUnofficialUsers() {
  const allUsers = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
  const toRemove = allUsers.filter((u) => !isProtectedProductionUser(u.email));

  if (toRemove.length === 0) {
    console.log("✓ لا توجد حسابات وهمية للحذف");
    return 0;
  }

  const removeIds = toRemove.map((u) => u.id);

  for (const id of removeIds) {
    await prisma.user.updateMany({ where: { directManagerId: id }, data: { directManagerId: null } });
  }

  await prisma.userPermission.deleteMany({ where: { userId: { in: removeIds } } });
  await prisma.user.deleteMany({ where: { id: { in: removeIds } } });

  for (const u of toRemove) {
    console.log(`  ✗ حُذف: ${u.name} (${u.email})`);
  }

  return toRemove.length;
}

async function syncOfficialUsers() {
  const admin = await prisma.user.findFirst({ where: { email: "admin@jcsc.gov.jo" } });
  const supportSupervisor = await prisma.user.findFirst({
    where: { email: "support-supervisor@jcsc.gov.jo" },
  });

  for (const email of ALLOWED_EMAILS) {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      console.warn(`  ⚠ حساب مفقود — شغّل setup-regional-coordinators أو seed: ${email}`);
      continue;
    }

    const officialName = OFFICIAL_NAMES[email];
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        ...(officialName ? { name: officialName } : {}),
      },
    });
  }

  if (admin && supportSupervisor) {
    await prisma.user.update({
      where: { id: supportSupervisor.id },
      data: { directManagerId: admin.id },
    });
    for (const c of REGIONAL_COORDINATORS) {
      await prisma.user.updateMany({
        where: { email: c.email },
        data: { directManagerId: admin.id },
      });
    }
    await prisma.user.updateMany({
      where: { email: "supervisor@jcsc.gov.jo" },
      data: { directManagerId: supportSupervisor.id },
    });
    await prisma.user.updateMany({
      where: { email: "supervisor.aqaba@jcsc.gov.jo" },
      data: { directManagerId: supportSupervisor.id },
    });
  }
}

async function setProductionConfig() {
  await prisma.systemConfig.upsert({
    where: { key: "environment" },
    create: { key: "environment", value: "production" },
    update: { value: "production" },
  });
}

async function main() {
  console.log("═".repeat(50));
  console.log("  JCSC — تجهيز الإطلاق الرسمي");
  console.log("═".repeat(50));

  const before = {
    reports: await prisma.report.count(),
    cases: await prisma.case.count(),
    issues: await prisma.issue.count(),
    notifications: await prisma.notification.count(),
    users: await prisma.user.count(),
  };

  console.log("\n▸ قبل التنظيف:");
  console.log(`  بلاغات: ${before.reports} | حالات: ${before.cases} | مسائل: ${before.issues}`);
  console.log(`  إشعارات: ${before.notifications} | مستخدمون: ${before.users}`);

  console.log("\n▸ حذف البيانات التشغيلية...");
  await clearOperationalData();
  console.log("✓ تم تفريغ البلاغات والحالات والإشعارات وسجل التدقيق");

  if (process.env.REMOVE_UNOFFICIAL_USERS === "true") {
    console.log("\n▸ حذف الحسابات غير الرسمية (REMOVE_UNOFFICIAL_USERS=true)...");
    const removed = await removeUnofficialUsers();
    console.log(`✓ حُذف ${removed} حساب`);
  } else {
    console.log("\n▸ المستخدمون: لم يُحذف أي حساب (آمن)");
  }

  console.log("\n▸ مزامنة الحسابات الرسمية...");
  await syncOfficialUsers();
  const totalUsers = await prisma.user.count();
  console.log(`✓ ${totalUsers} مستخدم في النظام`);

  console.log("\n▸ ضبط بيئة الإنتاج...");
  await setProductionConfig();
  console.log("✓ environment = production");

  const after = {
    reports: await prisma.report.count(),
    cases: await prisma.case.count(),
    issues: await prisma.issue.count(),
    notifications: await prisma.notification.count(),
    users: await prisma.user.count(),
  };

  console.log("\n▸ بعد التنظيف:");
  console.log(`  بلاغات: ${after.reports} | حالات: ${after.cases} | مسائل: ${after.issues}`);
  console.log(`  إشعارات: ${after.notifications} | مستخدمون: ${after.users}`);
  console.log("\n✓ النظام جاهز للإطلاق الرسمي");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
