/**
 * QA seed dataset — covers all case statuses, workflow paths, roles, and report states.
 * Run via: npx prisma db seed
 */
import { formatStatusChangeDetails } from "../src/lib/cases/timeline-log";
import {
  PrismaClient,
  CaseStatus,
  CaseType,
  CaseSeverity,
  ReportStatus,
  ReportClassification,
  IssuePriority,
  IssueStatus,
  DeploymentStatus,
  TestingStatus,
  KnowledgeValue,
  AuditAction,
} from "@prisma/client";

export type SeedUserIds = {
  adminId: string;
  coordinatorId: string;
  supervisorId: string;
  supervisorAqabaId: string;
  devHazemId: string;
  devHamzaId: string;
  devBoranId: string;
  devDbId: string;
  devAbdullahId: string;
};

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

export async function seedQaData(prisma: PrismaClient, ids: SeedUserIds) {
  const {
    adminId,
    coordinatorId,
    supervisorId,
    supervisorAqabaId,
    devHazemId,
    devHamzaId,
    devBoranId,
    devDbId,
    devAbdullahId,
  } = ids;

  // ─── Reports (supervisor submissions → linked OPEN cases) ───────────────────

  const reportSyncIrbid = await prisma.report.create({
    data: {
      number: "F-260806-0001",
      description:
        "باحثون في إربد — التطبيق يتوقف عند المزامنة منذ 09:00. ظهرت رسالة timeout متكررة.",
      status: ReportStatus.NEW,
      governorate: "إربد",
      district: "قصبة إربد",
      center: "مركز 12",
      enumeratorsAffected: 8,
      supervisorId,
      affectedSystem: "FIELD_OPERATIONS",
      recommendedTeam: "Database",
      recommendedPriority: IssuePriority.HIGH,
      aiSuggestedCategory: "مزامنة البيانات",
      aiConfidence: 0.91,
      createdAt: hoursAgo(3),
      attachments: {
        create: [
          { name: "sync-timeout.png", type: "IMAGE", url: "/uploads/placeholder.png", size: "312 KB" },
        ],
      },
    },
  });

  const reportLoginAmman = await prisma.report.create({
    data: {
      number: "R-260806-0001",
      description:
        "نظام الباحث — 15 باحثاً في عمان لا يستطيعون تسجيل الدخول. رسالة: بيانات الاعتماد غير صحيحة.",
      status: ReportStatus.NEW,
      governorate: "عمان",
      district: "ماركا",
      enumeratorsAffected: 15,
      supervisorId,
      affectedSystem: "RESEARCHER_SYSTEM",
      recommendedTeam: "Developer",
      recommendedPriority: IssuePriority.CRITICAL,
      aiConfidence: 0.88,
      createdAt: hoursAgo(5),
    },
  });

  const reportMdmKarak = await prisma.report.create({
    data: {
      number: "F-260806-0002",
      description: "أجهزة MDM في الكرك لا تستقبل التحديثات — 4 أجهزة متأثرة.",
      status: ReportStatus.NEW,
      governorate: "الكرك",
      enumeratorsAffected: 4,
      supervisorId: supervisorAqabaId,
      affectedSystem: "FIELD_OPERATIONS",
      recommendedPriority: IssuePriority.MEDIUM,
      createdAt: hoursAgo(2),
    },
  });

  const reportSelfEnum = await prisma.report.create({
    data: {
      number: "S-260806-0001",
      description: "استمارة العد الذاتي لا تُحمّل — الأسر في مادبا تُبلّغ عن شاشة بيضاء.",
      status: ReportStatus.UNDER_REVIEW,
      governorate: "مادبا",
      enumeratorsAffected: 22,
      supervisorId,
      affectedSystem: "SELF_ENUMERATION",
      recommendedTeam: "Developer",
      recommendedPriority: IssuePriority.HIGH,
      classification: ReportClassification.BUG,
      reviewedById: coordinatorId,
      reviewedAt: hoursAgo(1),
      createdAt: hoursAgo(8),
    },
  });

  const reportTrainingClosed = await prisma.report.create({
    data: {
      number: "F-260805-0003",
      description: "الباحثون لا يعرفون كيفية إدخال بيانات الأسرة — يحتاجون توضيحاً فقط.",
      status: ReportStatus.REJECTED,
      governorate: "معان",
      enumeratorsAffected: 6,
      supervisorId,
      affectedSystem: "FIELD_OPERATIONS",
      classification: ReportClassification.TRAINING_ISSUE,
      rejectionReason: "مشكلة تدريب — تم إرسال دليل PDF",
      reviewedById: coordinatorId,
      reviewedAt: daysAgo(1),
      createdAt: daysAgo(2),
    },
  });

  const reportCallCenter = await prisma.report.create({
    data: {
      number: "C-260805-0001",
      description: "مركز الاتصال — المتصلون يسمعون صوتاً مشوّشاً في 30% من المكالمات.",
      status: ReportStatus.CLASSIFIED,
      governorate: "عمان",
      enumeratorsAffected: 50,
      supervisorId,
      affectedSystem: "CALL_CENTER",
      classification: ReportClassification.BUG,
      reviewedById: coordinatorId,
      reviewedAt: daysAgo(1),
      createdAt: daysAgo(3),
    },
  });

  // ─── Issues (legacy queue — varied statuses) ────────────────────────────────

  const issueSync = await prisma.issue.create({
    data: {
      number: "F-260805-0001",
      title: "فشل مزامنة البيانات — إربد",
      description: "timeout متكرر عند المزامنة",
      status: IssueStatus.IN_PROGRESS,
      priority: IssuePriority.HIGH,
      category: "مزامنة البيانات",
      team: "Database",
      governorate: "إربد",
      enumeratorsAffected: 8,
      assigneeId: devDbId,
      slaTargetAt: hoursAgo(1),
      createdAt: daysAgo(2),
      timeline: {
        create: [
          { action: "تحويل من بلاغ", details: "F-260806-0001", actorId: adminId },
          { action: "تعيين", details: "Database — محمد الحسن", actorId: adminId },
        ],
      },
      checklist: {
        create: [
          { label: "فحص سجلات الخادم", sortOrder: 0, completed: true },
          { label: "اختبار مزامنة تجريبية", sortOrder: 1, completed: true },
          { label: "مراجعة timeout في API", sortOrder: 2 },
        ],
      },
      comments: {
        create: [
          {
            content: "السبب محتمل في connection pool — جاري زيادة الحد الأقصى",
            authorId: devDbId,
            isInternal: true,
          },
        ],
      },
    },
  });

  await prisma.issueReport.create({
    data: { issueId: issueSync.id, reportId: reportSyncIrbid.id },
  });

  const issueLogin = await prisma.issue.create({
    data: {
      number: "R-260805-0002",
      title: "خطأ مصادقة — نظام الباحث",
      status: IssueStatus.READY_FOR_TESTING,
      priority: IssuePriority.CRITICAL,
      category: "تسجيل الدخول",
      team: "Developer",
      governorate: "عمان",
      enumeratorsAffected: 15,
      assigneeId: devHazemId,
      createdAt: daysAgo(3),
      timeline: {
        create: [
          { action: "بدء المعالجة", actorId: devHazemId },
          { action: "جاهزة للاختبار", details: "تم إصلاح JWT expiry", actorId: devHazemId },
        ],
      },
    },
  });

  await prisma.issue.create({
    data: {
      number: "F-260804-0001",
      title: "GPS لا يحدّث الموقع — الزرقاء",
      status: IssueStatus.ASSIGNED,
      priority: IssuePriority.MEDIUM,
      category: "GPS",
      team: "Developer",
      governorate: "الزرقاء",
      enumeratorsAffected: 3,
      assigneeId: devHamzaId,
      createdAt: daysAgo(4),
    },
  });

  await prisma.issue.create({
    data: {
      number: "C-260803-0001",
      title: "تأخير في رد IVR — مغلقة",
      status: IssueStatus.CLOSED,
      priority: IssuePriority.LOW,
      category: "مركز الاتصال",
      team: "Integration",
      governorate: "عمان",
      enumeratorsAffected: 10,
      resolutionNote: "تم ضبط queue routing",
      closeReason: "حل نهائي",
      createdAt: daysAgo(7),
    },
  });

  // ─── Cases — every CaseStatus + realistic workflow paths ─────────────────────

  const caseIds: Record<string, string> = {};

  // OPEN — بانتظار تصنيف المنسق (3)
  const openCases = [
    {
      key: "open_sync",
      number: "F-260806-0010",
      title: "فشل مزامنة البيانات — إربد",
      description: reportSyncIrbid.description,
      sourceReportId: reportSyncIrbid.id,
      governorate: "إربد",
      affectedSystem: "إدارة العمل الميداني",
      affectedUsers: 8,
      createdById: supervisorId,
      priority: IssuePriority.HIGH,
      severity: CaseSeverity.HIGH,
      hours: 3,
    },
    {
      key: "open_login",
      number: "R-260806-0010",
      title: "تعذّر تسجيل الدخول — نظام الباحث",
      description: reportLoginAmman.description,
      sourceReportId: reportLoginAmman.id,
      governorate: "عمان",
      affectedSystem: "نظام الباحث",
      affectedUsers: 15,
      createdById: supervisorId,
      priority: IssuePriority.CRITICAL,
      severity: CaseSeverity.CRITICAL,
      hours: 5,
    },
    {
      key: "open_coordinator",
      number: "F-260806-0011",
      title: "تطبيق الميدان يتوقف عند حفظ الاستمارة",
      description: "بلاغ من منسق الدعم — 3 باحثين في الطفيلة يفقدون البيانات عند الحفظ.",
      governorate: "الطفيلة",
      affectedSystem: "إدارة العمل الميداني",
      affectedUsers: 3,
      createdById: coordinatorId,
      priority: IssuePriority.MEDIUM,
      severity: CaseSeverity.MEDIUM,
      hours: 1,
    },
  ] as const;

  for (const c of openCases) {
    const created = await prisma.case.create({
      data: {
        number: c.number,
        title: c.title,
        description: c.description,
        caseType: CaseType.QUESTION,
        status: CaseStatus.OPEN,
        priority: c.priority,
        severity: c.severity,
        sourceReportId: "sourceReportId" in c ? c.sourceReportId : undefined,
        affectedUsers: c.affectedUsers,
        affectedGovernorates: JSON.stringify([c.governorate]),
        affectedSystem: c.affectedSystem,
        governorate: c.governorate,
        createdById: c.createdById,
        createdAt: hoursAgo(c.hours),
        updatedAt: hoursAgo(c.hours),
        timeline: {
          create: [
            {
              action: "حالة جديدة من الميدان",
              details: "sourceReportId" in c ? "بلاغ ميداني" : "بلاغ منسق الدعم",
              actorId: c.createdById,
              actorName: c.createdById === coordinatorId ? "منسق الدعم" : "مشرف ميداني",
              createdAt: hoursAgo(c.hours),
            },
          ],
        },
      },
    });
    caseIds[c.key] = created.id;
  }

  // AWAITING_APPROVAL — System Bug مُصعّد للسوبر أدمن (2)
  const escalatedCases = [
    {
      key: "escalated_selfenum",
      number: "S-260806-0002",
      title: "استمارة العد الذاتي — شاشة بيضاء",
      description: reportSelfEnum.description,
      sourceReportId: reportSelfEnum.id,
      governorate: "مادبا",
      affectedSystem: "العد الذاتي",
      affectedUsers: 22,
      createdById: supervisorId,
      priority: IssuePriority.HIGH,
      severity: CaseSeverity.HIGH,
      hours: 1,
    },
    {
      key: "escalated_crash",
      number: "F-260806-0012",
      title: "تعطّل التطبيق عند فتح الخريطة — الزرقاء",
      description: "التطبيق ينهار (crash) فور فتح طبقة الخريطة في 6 أجهزة.",
      governorate: "الزرقاء",
      affectedSystem: "إدارة العمل الميداني",
      affectedUsers: 6,
      createdById: supervisorId,
      priority: IssuePriority.CRITICAL,
      severity: CaseSeverity.CRITICAL,
      hours: 4,
    },
  ];

  for (const c of escalatedCases) {
    const created = await prisma.case.create({
      data: {
        number: c.number,
        title: c.title,
        description: c.description,
        caseType: CaseType.BUG,
        status: CaseStatus.AWAITING_APPROVAL,
        priority: c.priority,
        severity: c.severity,
        sourceReportId: "sourceReportId" in c ? c.sourceReportId : undefined,
        affectedUsers: c.affectedUsers,
        affectedGovernorates: JSON.stringify([c.governorate]),
        affectedSystem: c.affectedSystem,
        suggestedTeam: "Developer",
        governorate: c.governorate,
        createdById: c.createdById,
        createdAt: hoursAgo(c.hours + 6),
        updatedAt: hoursAgo(c.hours),
        timeline: {
          create: [
            {
              action: "حالة جديدة من الميدان",
              actorId: c.createdById,
              createdAt: hoursAgo(c.hours + 6),
            },
            {
              action: "تصعيد System Bug — منسق الدعم",
              details: "تم التصنيف كخلل نظامي — بانتظار السوبر أدمن",
              actorId: coordinatorId,
              actorName: "منسق الدعم",
              createdAt: hoursAgo(c.hours),
            },
            {
              action: "تغيير الحالة",
              details: formatStatusChangeDetails(
                CaseStatus.OPEN,
                CaseStatus.AWAITING_APPROVAL,
                "تصنيف System Bug"
              ),
              actorId: coordinatorId,
              actorName: "منسق الدعم",
              createdAt: hoursAgo(c.hours),
            },
          ],
        },
        decisions: {
          create: [
            {
              decision: "ESCALATED_SYSTEM_BUG",
              reason: "System Bug — يحتاج إسناد مطور",
              decidedById: coordinatorId,
              decidedByName: "منسق الدعم",
              createdAt: hoursAgo(c.hours),
            },
          ],
        },
      },
    });
    caseIds[c.key] = created.id;
  }

  // UNDER_REVIEW — مسار قديم / حالة وسيطة (1)
  const underReview = await prisma.case.create({
    data: {
      number: "C-260805-0002",
      title: "تأخير في تحديث حالة المكالمة — مركز الاتصال",
      description: reportCallCenter.description,
      caseType: CaseType.QUESTION,
      status: CaseStatus.UNDER_REVIEW,
      priority: IssuePriority.MEDIUM,
      severity: CaseSeverity.MEDIUM,
      sourceReportId: reportCallCenter.id,
      affectedUsers: 50,
      affectedGovernorates: JSON.stringify(["عمان"]),
      affectedSystem: "مركز اتصال",
      governorate: "عمان",
      createdById: supervisorId,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(2),
      timeline: {
        create: [
          { action: "قبول الحالة", details: "بانتظار التصنيف والإسناد", actorId: adminId, actorName: "Super Admin" },
        ],
      },
    },
  });
  caseIds.under_review = underReview.id;

  // IN_PROGRESS — عند المطورين (3)
  const inProgressSync = await prisma.case.create({
    data: {
      number: "F-260805-0010",
      title: "فشل مزامنة — قيد المعالجة",
      description: "مزامنة البيانات تفشل بعد تحديث الخادم أمس.",
      caseType: CaseType.BUG,
      status: CaseStatus.IN_PROGRESS,
      priority: IssuePriority.HIGH,
      severity: CaseSeverity.HIGH,
      sourceReportId: reportSyncIrbid.id,
      linkedIssueId: issueSync.id,
      affectedUsers: 8,
      affectedGovernorates: JSON.stringify(["إربد"]),
      affectedSystem: "مزامنة البيانات",
      assignedTeam: "Database",
      assignedDeveloperId: devDbId,
      governorate: "إربد",
      createdById: adminId,
      createdAt: daysAgo(2),
      updatedAt: hoursAgo(6),
      timeline: {
        create: [
          { action: "حالة جديدة من الميدان", actorId: supervisorId, actorName: "مشرف ميداني", createdAt: daysAgo(3) },
          {
            action: "تغيير الحالة",
            details: formatStatusChangeDetails(CaseStatus.OPEN, CaseStatus.AWAITING_APPROVAL),
            actorId: coordinatorId,
            actorName: "منسق الدعم",
            createdAt: daysAgo(2.5),
          },
          {
            action: "تغيير الحالة",
            details: formatStatusChangeDetails(CaseStatus.AWAITING_APPROVAL, CaseStatus.IN_PROGRESS, "BUG"),
            actorId: adminId,
            actorName: "Super Admin",
            createdAt: daysAgo(2),
          },
          { action: "إسناد", details: "محمد الحسن — Database", actorId: adminId, actorName: "Super Admin", createdAt: daysAgo(2) },
          { action: "بدء المعالجة", actorId: devDbId, actorName: "محمد الحسن", createdAt: hoursAgo(6) },
        ],
      },
      comments: {
        create: [
          {
            content: "تم تحديد السبب في connection pool — جاري تطبيق الإصلاح",
            authorId: devDbId,
            isInternal: true,
          },
          {
            content: "نحتاج نافذة صيانة 30 دقيقة للنشر",
            authorId: devDbId,
            isInternal: false,
          },
        ],
      },
    },
  });
  caseIds.in_progress_sync = inProgressSync.id;

  await prisma.case.create({
    data: {
      number: "R-260805-0010",
      title: "JWT expired مبكراً — نظام الباحث",
      description: "جلسة الباحث تنتهي بعد 5 دقائق بدلاً من 8 ساعات.",
      caseType: CaseType.BUG,
      status: CaseStatus.IN_PROGRESS,
      priority: IssuePriority.CRITICAL,
      severity: CaseSeverity.HIGH,
      linkedIssueId: issueLogin.id,
      affectedUsers: 15,
      affectedGovernorates: JSON.stringify(["عمان"]),
      affectedSystem: "نظام الباحث",
      assignedTeam: "Developer",
      assignedDeveloperId: devHazemId,
      governorate: "عمان",
      createdById: adminId,
      createdAt: daysAgo(3),
      updatedAt: hoursAgo(12),
      timeline: {
        create: [
          { action: "إسناد", details: "محمد حازم", actorId: adminId },
          { action: "قيد المعالجة", actorId: devHazemId, actorName: "محمد حازم" },
        ],
      },
    },
  });

  await prisma.case.create({
    data: {
      number: "F-260804-0010",
      title: "GPS drift — الزرقاء",
      description: "إحداثيات GPS ت drifting 200m عن الموقع الفعلي.",
      caseType: CaseType.BUG,
      status: CaseStatus.IN_PROGRESS,
      priority: IssuePriority.MEDIUM,
      severity: CaseSeverity.MEDIUM,
      affectedUsers: 3,
      affectedGovernorates: JSON.stringify(["الزرقاء"]),
      affectedSystem: "إدارة العمل الميداني",
      assignedTeam: "Developer",
      assignedDeveloperId: devHamzaId,
      governorate: "الزرقاء",
      createdById: adminId,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(1),
    },
  });

  // WAITING_DEPLOYMENT (1)
  await prisma.case.create({
    data: {
      number: "S-260804-0002",
      title: "خطأ validation في حقل الرقم الوطني",
      description: "العد الذاتي يرفض أرقاماً وطنية صحيحة — تم الإصلاح في staging.",
      caseType: CaseType.BUG,
      status: CaseStatus.WAITING_DEPLOYMENT,
      priority: IssuePriority.HIGH,
      severity: CaseSeverity.MEDIUM,
      affectedUsers: 40,
      affectedGovernorates: JSON.stringify(["عمان", "الزرقاء"]),
      affectedSystem: "العد الذاتي",
      assignedTeam: "Developer",
      assignedDeveloperId: devBoranId,
      deploymentStatus: DeploymentStatus.QUEUED,
      resolutionNotes: "تم إصلاح regex validation — بانتظار نشر production",
      resolutionType: "إصلاح تقني — يتطلب نشر",
      solvedById: devBoranId,
      governorate: "عمان",
      createdById: adminId,
      createdAt: daysAgo(5),
      updatedAt: hoursAgo(8),
      timeline: {
        create: [
          { action: "تم الحل", details: "يتطلب نشر", actorId: devBoranId, actorName: "بوران عواد" },
        ],
      },
    },
  });

  // READY_FOR_TESTING (1)
  await prisma.case.create({
    data: {
      number: "C-260803-0010",
      title: "تأخير IVR — جاهز للاختبار",
      description: "تم تعديل queue routing — يرجى اختبار من مركز الاتصال.",
      caseType: CaseType.BUG,
      status: CaseStatus.READY_FOR_TESTING,
      priority: IssuePriority.MEDIUM,
      severity: CaseSeverity.LOW,
      affectedUsers: 50,
      affectedGovernorates: JSON.stringify(["عمان"]),
      affectedSystem: "مركز اتصال",
      assignedTeam: "Integration",
      assignedDeveloperId: devAbdullahId,
      testingStatus: TestingStatus.IN_PROGRESS,
      resolutionNotes: "تم النشر على staging — بانتظار UAT",
      solvedById: devAbdullahId,
      governorate: "عمان",
      createdById: adminId,
      createdAt: daysAgo(6),
      updatedAt: daysAgo(1),
    },
  });

  // RESOLVED — بانتظار تأكيد السوبر أدمن (2)
  const resolvedToday = await prisma.case.create({
    data: {
      number: "R-260806-0003",
      title: "إصلاح OTP — نظام الباحث",
      description: "OTP لا يصل للباحثين — تم الإصلاح ويحتاج تأكيد الإغلاق.",
      caseType: CaseType.BUG,
      status: CaseStatus.RESOLVED,
      priority: IssuePriority.HIGH,
      severity: CaseSeverity.MEDIUM,
      affectedUsers: 7,
      affectedGovernorates: JSON.stringify(["عمان"]),
      affectedSystem: "نظام الباحث",
      assignedTeam: "Developer",
      assignedDeveloperId: devHazemId,
      resolutionNotes: "تم إعادة ضبط SMS gateway credentials",
      resolutionType: "إصلاح تقني",
      solvedById: devHazemId,
      governorate: "عمان",
      createdById: adminId,
      createdAt: daysAgo(1),
      updatedAt: hoursAgo(2),
      timeline: {
        create: [
          { action: "تم الحل", details: "SMS gateway", actorId: devHazemId, actorName: "محمد حازم" },
        ],
      },
    },
  });
  caseIds.resolved_today = resolvedToday.id;

  await prisma.case.create({
    data: {
      number: "F-260805-0011",
      title: "بطء تحميل قائمة الأسر",
      description: "القائمة تأخذ 45 ثانية — تم تحسين الاستعلام.",
      caseType: CaseType.BUG,
      status: CaseStatus.RESOLVED,
      priority: IssuePriority.MEDIUM,
      severity: CaseSeverity.LOW,
      affectedUsers: 12,
      affectedGovernorates: JSON.stringify(["إربد"]),
      affectedSystem: "إدارة العمل الميداني",
      assignedTeam: "Database",
      assignedDeveloperId: devDbId,
      resolutionNotes: "index added on household table",
      solvedById: devDbId,
      governorate: "إربد",
      createdById: adminId,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
    },
  });

  // CLOSED — مسارات متنوعة (5)
  await prisma.case.create({
    data: {
      number: "F-260805-0020",
      title: "MDM — أجهزة لا تستقبل تحديثات",
      description: reportMdmKarak.description,
      caseType: CaseType.CONFIGURATION_ISSUE,
      status: CaseStatus.CLOSED,
      priority: IssuePriority.MEDIUM,
      severity: CaseSeverity.LOW,
      sourceReportId: reportMdmKarak.id,
      affectedUsers: 4,
      affectedGovernorates: JSON.stringify(["الكرk"]),
      affectedSystem: "إدارة العمل الميداني",
      resolutionType: "NOT_A_PROBLEM",
      resolutionNotes: "مشكلة MDM — تم إعادة تسجيل الأجهزة يدوياً",
      governorate: "الكرk",
      createdById: supervisorAqabaId,
      createdAt: daysAgo(1),
      updatedAt: hoursAgo(4),
      timeline: {
        create: [
          {
            action: "إغلاق — ليس System Bug",
            details: "MDM — إعادة تسجيل",
            actorId: coordinatorId,
            actorName: "منسق الدعم",
          },
        ],
      },
      decisions: {
        create: [
          {
            decision: "DISMISSED_NOT_SYSTEM",
            reason: "MDM — ليس خلل تطبيق",
            decidedById: coordinatorId,
            decidedByName: "منسق الدعم",
          },
        ],
      },
    },
  });

  await prisma.case.create({
    data: {
      number: "F-260804-0020",
      title: "شبكة ضعيفة — البيانات لا تُرفع",
      description: "الباحثون في مناطق جبلية — الشبكة ضعيفة وليست مشكلة تطبيق.",
      caseType: CaseType.CONFIGURATION_ISSUE,
      status: CaseStatus.CLOSED,
      priority: IssuePriority.LOW,
      severity: CaseSeverity.LOW,
      affectedUsers: 5,
      affectedGovernorates: JSON.stringify(["الطفيلة"]),
      affectedSystem: "إدارة العمل الميداني",
      resolutionType: "NOT_A_PROBLEM",
      resolutionNotes: "شبكة — تم توجيه المشرف لاستخدام Wi-Fi المركز",
      governorate: "الطفيلة",
      createdById: supervisorId,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(2),
      decisions: {
        create: [
          {
            decision: "DISMISSED_NOT_SYSTEM",
            reason: "شبكة",
            decidedById: coordinatorId,
            decidedByName: "منسق الدعم",
          },
        ],
      },
    },
  });

  await prisma.case.create({
    data: {
      number: "F-260803-0020",
      title: "تدريب على الاستبيان — معان",
      description: reportTrainingClosed.description,
      caseType: CaseType.TRAINING_ISSUE,
      status: CaseStatus.CLOSED,
      priority: IssuePriority.LOW,
      severity: CaseSeverity.LOW,
      sourceReportId: reportTrainingClosed.id,
      affectedUsers: 6,
      affectedGovernorates: JSON.stringify(["معان"]),
      affectedSystem: "إدارة العمل الميداني",
      resolutionType: "تدريب",
      resolutionNotes: "تم إرسال دليل PDF + فيديو 10 دقائق",
      timeSpentMinutes: 20,
      knowledgeValue: KnowledgeValue.HIGH,
      governorate: "معان",
      createdById: supervisorId,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
    },
  });

  const closedFullCycle = await prisma.case.create({
    data: {
      number: "R-260802-0010",
      title: "تسجيل الدخول — مغلقة بعد دورة كاملة",
      description: "مشكلة cache في المتصفح — حُلّت وأُغلقت.",
      caseType: CaseType.BUG,
      status: CaseStatus.CLOSED,
      priority: IssuePriority.MEDIUM,
      severity: CaseSeverity.LOW,
      affectedUsers: 2,
      affectedGovernorates: JSON.stringify(["عمان"]),
      affectedSystem: "نظام الباحث",
      assignedTeam: "Developer",
      assignedDeveloperId: devHazemId,
      resolutionNotes: "clear cache + cookie fix",
      resolutionType: "إصلاح تقني",
      solvedById: devHazemId,
      governorate: "عمان",
      createdById: supervisorId,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(8),
      timeline: {
        create: [
          { action: "إغلاق نهائي", actorId: adminId, actorName: "Super Admin" },
        ],
      },
    },
  });
  caseIds.closed_full = closedFullCycle.id;

  await prisma.case.create({
    data: {
      number: "C-260801-0010",
      title: "استفسار عن مواعيد الدوام — مغلقة",
      description: "سؤال من مشرف — تم الرد عبر الهاتف.",
      caseType: CaseType.QUESTION,
      status: CaseStatus.CLOSED,
      priority: IssuePriority.LOW,
      severity: CaseSeverity.LOW,
      affectedUsers: 1,
      affectedGovernorates: JSON.stringify(["عمان"]),
      affectedSystem: "مركز اتصال",
      resolutionNotes: "تم توضيح المواعيد",
      governorate: "عمان",
      createdById: supervisorId,
      createdAt: daysAgo(14),
      updatedAt: daysAgo(13),
    },
  });

  // MERGED — duplicate (1)
  await prisma.case.create({
    data: {
      number: "F-260806-0099",
      title: "مزامنة فاشلة — مكرر",
      description: "بلاغ مكرر لنفس مشكلة F-260806-0010",
      caseType: CaseType.BUG,
      status: CaseStatus.MERGED,
      priority: IssuePriority.MEDIUM,
      severity: CaseSeverity.MEDIUM,
      affectedUsers: 2,
      affectedGovernorates: JSON.stringify(["إربد"]),
      affectedSystem: "إدارة العمل الميداني",
      mergedIntoCaseId: caseIds.open_sync,
      governorate: "إربد",
      createdById: supervisorId,
      createdAt: hoursAgo(2),
      updatedAt: hoursAgo(1),
      timeline: {
        create: [
          {
            action: "دمج",
            details: `مُدمج في F-260806-0010`,
            actorId: coordinatorId,
            actorName: "منسق الدعم",
          },
        ],
      },
    },
  });

  // Super-admin direct BUG creation (edge case)
  await prisma.case.create({
    data: {
      number: "F-260806-0020",
      title: "حالة أنشأها السوبر أدمن مباشرة",
      description: "خلل حرج في API التعداد — أُنشئت وأسندت مباشرة من السوبر أدمن.",
      caseType: CaseType.BUG,
      status: CaseStatus.IN_PROGRESS,
      priority: IssuePriority.CRITICAL,
      severity: CaseSeverity.CRITICAL,
      affectedUsers: 100,
      affectedGovernorates: JSON.stringify(["عمان", "إربد", "الزرقاء"]),
      affectedSystem: "إدارة العمل الميداني",
      assignedTeam: "Developer",
      assignedDeveloperId: devHazemId,
      governorate: "عمان",
      createdById: adminId,
      createdAt: hoursAgo(10),
      updatedAt: hoursAgo(8),
    },
  });

  // ─── Notifications per role ─────────────────────────────────────────────────

  await prisma.notification.createMany({
    data: [
      {
        userId: coordinatorId,
        title: "بلاغ جديد — يحتاج تصنيف",
        message: "F-260806-0010 — 8 مستخدمين متأثرين (إربد)",
        type: "report_new",
        level: "warning",
        actionRequired: true,
        entityType: "Case",
        entityId: caseIds.open_sync,
        issueNumber: "F-260806-0010",
        createdAt: hoursAgo(3),
      },
      {
        userId: coordinatorId,
        title: "بلاغ جديد — يحتاج تصنيف",
        message: "R-260806-0010 — 15 مستخدم (عمان)",
        type: "report_new",
        level: "warning",
        actionRequired: true,
        entityType: "Case",
        entityId: caseIds.open_login,
        issueNumber: "R-260806-0010",
        createdAt: hoursAgo(5),
      },
      {
        userId: adminId,
        title: "System Bug — بانتظار مراجعتك",
        message: "S-260806-0002 — استمارة العد الذاتي (22 متأثر)",
        type: "case_escalated",
        level: "warning",
        actionRequired: true,
        entityType: "Case",
        entityId: caseIds.escalated_selfenum,
        issueNumber: "S-260806-0002",
        createdAt: hoursAgo(1),
      },
      {
        userId: adminId,
        title: "System Bug — بانتظار مراجعتك",
        message: "F-260806-0012 — crash الخريطة (6 أجهزة)",
        type: "case_escalated",
        level: "warning",
        actionRequired: true,
        entityType: "Case",
        entityId: caseIds.escalated_crash,
        issueNumber: "F-260806-0012",
        createdAt: hoursAgo(4),
      },
      {
        userId: adminId,
        title: "تم حل المشكلة — بانتظار تأكيدك",
        message: "R-260806-0003 — إصلاح OTP",
        type: "case_solved",
        level: "warning",
        actionRequired: true,
        entityType: "Case",
        entityId: caseIds.resolved_today,
        issueNumber: "R-260806-0003",
        createdAt: hoursAgo(2),
      },
      {
        userId: devDbId,
        title: "تم تعيينك على حالة",
        message: "F-260805-0010 — فشل مزامنة",
        type: "case_assigned",
        entityType: "Case",
        entityId: caseIds.in_progress_sync,
        issueNumber: "F-260805-0010",
        createdAt: daysAgo(2),
      },
      {
        userId: devHazemId,
        title: "تم تعيينك على حالة جديدة",
        message: "R-260805-0010 — JWT expired",
        type: "case_assigned",
        entityType: "Case",
        createdAt: daysAgo(3),
      },
      {
        userId: supervisorId,
        title: "تم إغلاق حالتك",
        message: "F-260804-0020 — شبكة ضعيفة",
        type: "case_closed",
        entityType: "Case",
        createdAt: daysAgo(2),
        isRead: true,
        readAt: daysAgo(2),
      },
      {
        userId: supervisorId,
        title: "تم إغلاق حالتك",
        message: "F-260805-0020 — MDM",
        type: "case_closed",
        entityType: "Case",
        createdAt: hoursAgo(4),
      },
    ],
  });

  // ─── Audit log samples ──────────────────────────────────────────────────────

  await prisma.auditLog.createMany({
    data: [
      {
        action: AuditAction.LOGIN,
        entityType: "User",
        entityId: coordinatorId,
        userId: coordinatorId,
        details: "تسجيل دخول منسق الدعم",
        createdAt: hoursAgo(1),
      },
      {
        action: AuditAction.STATUS_CHANGE,
        entityType: "Case",
        entityId: caseIds.escalated_selfenum,
        userId: coordinatorId,
        details: "coordinator_escalate_system_bug",
        createdAt: hoursAgo(1),
      },
      {
        action: AuditAction.ASSIGN,
        entityType: "Case",
        entityId: caseIds.in_progress_sync,
        userId: adminId,
        details: "assign: Database",
        createdAt: daysAgo(2),
      },
      {
        action: AuditAction.CLOSE,
        entityType: "Case",
        entityId: caseIds.closed_full,
        userId: adminId,
        details: "closed",
        createdAt: daysAgo(8),
      },
    ],
  });

  const caseCount = await prisma.case.count();
  const reportCount = await prisma.report.count();

  console.log(`  QA data: ${caseCount} cases, ${reportCount} reports`);
  console.log("  Status coverage: OPEN, AWAITING_APPROVAL, UNDER_REVIEW, IN_PROGRESS,");
  console.log("    WAITING_DEPLOYMENT, READY_FOR_TESTING, RESOLVED, CLOSED, MERGED");
}
