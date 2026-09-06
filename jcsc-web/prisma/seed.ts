import { PrismaClient, UserRole, ReportClassification, IssuePriority } from "@prisma/client";
import { seedQaData } from "./seed-qa-data";
import { hash } from "bcryptjs";
import {
  AHMED_AY_PROFILE,
  applyDeveloperEscalationHierarchy,
} from "../src/lib/developers/escalation-hierarchy";
import { REGIONAL_COORDINATORS } from "../src/lib/coordinator-routing";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: "view_dashboard", label: "عرض لوحة التحكم", screen: "dashboard", action: "view" },
  { key: "submit_report", label: "تقديم ملاحظة", screen: "reports", action: "create" },
  { key: "view_own_reports", label: "عرض ملاحظاتي", screen: "reports", action: "view" },
  { key: "review_reports", label: "مراجعة الملاحظات", screen: "reports", action: "edit" },
  { key: "classify_reports", label: "تصنيف الملاحظات", screen: "reports", action: "edit" },
  { key: "convert_to_issue", label: "تحويل لمسألة", screen: "reports", action: "create" },
  { key: "reject_reports", label: "رفض الملاحظات", screen: "reports", action: "edit" },
  { key: "view_issues", label: "عرض المسائل", screen: "issues", action: "view" },
  { key: "manage_issues", label: "إدارة المسائل", screen: "issues", action: "edit" },
  { key: "assign_issues", label: "تعيين المسائل", screen: "issues", action: "assign" },
  { key: "close_issues", label: "إغلاق المسائل", screen: "issues", action: "close" },
  { key: "view_queues", label: "عرض الطوابير", screen: "queues", action: "view" },
  { key: "manage_users", label: "إدارة المستخدمين", screen: "users", action: "edit" },
  { key: "manage_roles", label: "إدارة الصلاحيات", screen: "roles", action: "edit" },
  { key: "assign_user_permissions", label: "منح صلاحيات للفريق", screen: "users", action: "assign" },
  { key: "manage_routing", label: "إدارة قواعد التوجيه", screen: "routing", action: "edit" },
  { key: "view_audit", label: "عرض سجل التدقيق", screen: "audit", action: "view" },
  { key: "log_report_fallback", label: "تسجيل ملاحظة نيابةً", screen: "reports", action: "create" },
];

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPERVISOR: ["view_dashboard", "submit_report", "view_own_reports", "view_issues"],
  SUPPORT_SUPERVISOR: [
    "view_dashboard",
    "view_issues",
    "manage_users",
    "assign_user_permissions",
  ],
  SUPPORT_COORDINATOR: [
    "view_dashboard",
    "submit_report",
    "view_own_reports",
    "review_reports",
    "reject_reports",
    "view_issues",
    "close_issues",
    "manage_users",
  ],
  ADMIN: PERMISSIONS.map((p) => p.key),
  DEVELOPER: ["view_dashboard", "view_issues", "manage_issues", "view_queues"],
  SUPPORT_MANAGER: [],
  DATABASE: [],
  DEVOPS: [],
  GIS: [],
  CALL_CENTER: [],
  SUPPORT_L1: [],
  SUPPORT_L2: [],
};

const ROUTING_RULES = [
  {
    keywords: JSON.stringify(["sync", "synchronize", "مزامنة", "تزامn", "بيانات", "sql", "timeout"]),
    recommendedTeam: "Database",
    recommendedClassification: ReportClassification.BUG,
    priority: IssuePriority.HIGH,
    autoConvertAllowed: false,
  },
  {
    keywords: JSON.stringify(["login", "دخول", "password", "حساب", "تسجيل", "forgot password", "نسيت"]),
    recommendedTeam: "Developer",
    recommendedClassification: ReportClassification.BUG,
    priority: IssuePriority.HIGH,
    autoConvertAllowed: true,
  },
  {
    keywords: JSON.stringify(["freeze", "crash", "يتوقf", "يعلق", "runtime", "ui", "واجهة"]),
    recommendedTeam: "Developer",
    recommendedClassification: ReportClassification.BUG,
    priority: IssuePriority.HIGH,
    autoConvertAllowed: false,
  },
  {
    keywords: JSON.stringify(["map", "خريطة", "gps", "موقع", "server", "خادم"]),
    recommendedTeam: "Developer",
    recommendedClassification: ReportClassification.BUG,
    priority: IssuePriority.MEDIUM,
    autoConvertAllowed: false,
  },
  {
    keywords: JSON.stringify(["sms", "notification", "إشعار", "رسالة"]),
    recommendedTeam: "Integration",
    recommendedClassification: ReportClassification.BUG,
    priority: IssuePriority.MEDIUM,
    autoConvertAllowed: false,
  },
  {
    keywords: JSON.stringify(["training", "تدريب", "لا يعرف", "كيف يستخدم"]),
    recommendedTeam: "Call Center",
    recommendedClassification: ReportClassification.TRAINING_ISSUE,
    priority: IssuePriority.LOW,
    autoConvertAllowed: false,
  },
];

async function main() {
  const passwordHash = await hash("jcsc2026", 10);

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
  await prisma.userPermission.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.routingRule.deleteMany();
  await prisma.knowledgeArticle.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.user.deleteMany();

  for (const perm of PERMISSIONS) {
    await prisma.permission.create({ data: perm });
  }

  const allPerms = await prisma.permission.findMany();
  const permByKey = Object.fromEntries(allPerms.map((p) => [p.key, p.id]));

  for (const [role, keys] of Object.entries(ROLE_PERMISSIONS) as [UserRole, string[]][]) {
    for (const key of keys) {
      await prisma.rolePermission.create({
        data: { role, permissionId: permByKey[key], granted: true },
      });
    }
  }

  const users = [
    { name: "Super Admin", email: "admin@jcsc.gov.jo", role: UserRole.ADMIN, team: "إدارة", governorate: "عمان" },
    { name: "مشرف الدعم", email: "support-supervisor@jcsc.gov.jo", role: UserRole.SUPPORT_SUPERVISOR, team: "الدعم", governorate: "عمان" },
    ...REGIONAL_COORDINATORS.map((c) => ({
      name: c.name,
      email: c.email,
      role: UserRole.SUPPORT_COORDINATOR,
      team: "منسق الدعم",
      governorate: c.governorates[0],
    })),
    { name: "دعم فني — إربد", email: "supervisor@jcsc.gov.jo", role: UserRole.SUPERVISOR, team: "الدعم الفني المراكز", governorate: "إربد" },
    { name: "دعم فني — العقبة", email: "supervisor.aqaba@jcsc.gov.jo", role: UserRole.SUPERVISOR, team: "الدعم الفني المراكز", governorate: "العقبة" },
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

  const createdUsers: Record<string, string> = {};
  for (const u of users) {
    const user = await prisma.user.create({
      data: {
        ...u,
        password: passwordHash,
        phone: "+962790000000",
        shift: "صباحي",
        specialtyTags: "[]",
      },
    });
    createdUsers[u.email] = user.id;
  }

  const supervisorId = createdUsers["supervisor@jcsc.gov.jo"];
  const supervisorAqabaId = createdUsers["supervisor.aqaba@jcsc.gov.jo"];
  const razanId = createdUsers["razan.m@jcsc.gov.jo"];
  const supportSupervisorId = createdUsers["support-supervisor@jcsc.gov.jo"];
  const devId = createdUsers["hazem@jcsc.gov.jo"];
  const dbId = createdUsers["mohammad.h@jcsc.gov.jo"];
  const adminId = createdUsers["admin@jcsc.gov.jo"];

  await prisma.user.update({
    where: { id: supportSupervisorId },
    data: { directManagerId: adminId },
  });
  for (const coord of REGIONAL_COORDINATORS) {
    const id = createdUsers[coord.email];
    if (id) {
      await prisma.user.update({
        where: { id },
        data: { directManagerId: adminId },
      });
    }
  }
  await prisma.user.update({
    where: { id: supervisorId },
    data: { directManagerId: supportSupervisorId },
  });
  await prisma.user.update({
    where: { id: supervisorAqabaId },
    data: { directManagerId: supportSupervisorId },
  });

  await applyDeveloperEscalationHierarchy(prisma, createdUsers);

  for (const rule of ROUTING_RULES) {
    await prisma.routingRule.create({ data: rule });
  }

  await prisma.systemConfig.createMany({
    data: [
      { key: "ai_auto_convert_threshold", value: "0.90" },
      { key: "notification_debounce_minutes", value: "2" },
      { key: "sla_escalation_unopened_minutes", value: "30" },
      { key: "developer_fix_escalation_hours", value: "2" },
      { key: "environment", value: "staging" },
    ],
  });

  await prisma.knowledgeArticle.createMany({
    data: [
      {
        title: "لا يمكن تسجيل الدخول — نظام الباحث",
        content: "تحقق من اسم المستخدم والإنترنت وأعد تشغيل التطبيق",
        category: "نظام الباحث",
        tags: JSON.stringify(["login", "researcher"]),
      },
      {
        title: "لا يمكن المزامنة",
        content: "تحقق من الإنترنت ومساحة التخزين",
        category: "نظام الباحث",
        tags: JSON.stringify(["sync"]),
      },
      {
        title: "الإنجاز لا يظهر للباحث",
        content: "تحقق من الإسناد والمزامنة",
        category: "إدارة العمل الميداني",
        tags: JSON.stringify(["progress", "field"]),
      },
      {
        title: "لا تظهر استمارة العد الذاتي",
        content: "تحقق من الرقم الوطني أو الهاتف",
        category: "مركز الاتصال",
        tags: JSON.stringify(["call-center", "form"]),
      },
      {
        title: "المؤشرات لا تظهر",
        content: "حدّث الصفحة وتحقق من الصلاحية",
        category: "لوحة المؤشرات",
        tags: JSON.stringify(["dashboard"]),
      },
    ],
  });

  await seedQaData(prisma, {
    adminId,
    coordinatorId: razanId,
    supervisorId,
    supervisorAqabaId,
    devHazemId: devId,
    devHamzaId: createdUsers["hamza@jcsc.gov.jo"],
    devBoranId: createdUsers["boran@jcsc.gov.jo"],
    devDbId: dbId,
    devAbdullahId: createdUsers["abdullah.m@jcsc.gov.jo"],
  });

  console.log("Seed completed. Default password for all users: jcsc2026");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
