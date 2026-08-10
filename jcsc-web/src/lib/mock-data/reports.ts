import type {
  FieldReport,
  RoutingRule,
  OperationsDashboard,
  SimilarReportGroup,
} from "@/lib/reports";
import type { TicketPriority } from "@/lib/types";

const hoursAgo = (h: number) =>
  new Date(Date.now() - h * 3600000).toISOString();
const daysAgo = (d: number) =>
  new Date(Date.now() - d * 86400000).toISOString();

export const mockReports: FieldReport[] = [
  {
    id: "rpt1",
    number: "RPT-2026-001",
    observation: "Enumerators cannot synchronize.",
    status: "NEW",
    governorate: "إربد",
    supervisorId: "u9",
    supervisorName: "يوسف المرعي",
    createdAt: hoursAgo(1),
    updatedAt: hoursAgo(1),
    recommendedTeam: "Database",
    recommendedPriority: "HIGH",
    similarReportIds: ["rpt4"],
    attachments: [
      {
        id: "att1",
        reportId: "rpt1",
        name: "sync-error.png",
        type: "image",
        url: "/placeholder.png",
        size: "245 KB",
        createdAt: hoursAgo(1),
      },
      {
        id: "att2",
        reportId: "rpt1",
        name: "sync-log.txt",
        type: "log",
        url: "/placeholder.log",
        size: "12 KB",
        createdAt: hoursAgo(1),
      },
    ],
  },
  {
    id: "rpt2",
    number: "RPT-2026-002",
    observation: "Login is not working.",
    status: "UNDER_REVIEW",
    governorate: "عمان",
    supervisorId: "u9",
    supervisorName: "يوسف المرعي",
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(2),
    reviewedBy: "سارة العمري",
    reviewedAt: hoursAgo(2),
    recommendedTeam: "Developer",
    recommendedPriority: "HIGH",
    attachments: [
      {
        id: "att3",
        reportId: "rpt2",
        name: "login-screen.jpg",
        type: "image",
        url: "/placeholder.png",
        size: "180 KB",
        createdAt: hoursAgo(3),
      },
    ],
  },
  {
    id: "rpt3",
    number: "RPT-2026-003",
    observation: "Runtime freezes.",
    status: "WAITING_CLASSIFICATION",
    governorate: "الزرقاء",
    supervisorId: "u9",
    supervisorName: "يوسف المرعي",
    createdAt: hoursAgo(5),
    updatedAt: hoursAgo(4),
    reviewedBy: "سارة العمري",
    recommendedTeam: "Developer",
    recommendedPriority: "MEDIUM",
    managerDecision: "CONFIRMED_PROBLEM",
    managerDecisionBy: "سارة العمري",
    managerDecisionAt: hoursAgo(4),
    classification: "BUG",
    attachments: [
      {
        id: "att4",
        reportId: "rpt3",
        name: "freeze-video.mp4",
        type: "video",
        url: "/placeholder.mp4",
        size: "2.1 MB",
        createdAt: hoursAgo(5),
      },
    ],
  },
  {
    id: "rpt4",
    number: "RPT-2026-004",
    observation: "Enumerators cannot synchronize.",
    status: "NEW",
    governorate: "إربد",
    supervisorId: "u9",
    supervisorName: "يوسف المرعي",
    createdAt: hoursAgo(0.5),
    updatedAt: hoursAgo(0.5),
    recommendedTeam: "Database",
    recommendedPriority: "HIGH",
    similarReportIds: ["rpt1"],
    attachments: [],
  },
  {
    id: "rpt5",
    number: "RPT-2026-005",
    observation: "The map is empty.",
    status: "NEW",
    governorate: "البلقاء",
    supervisorId: "u9",
    supervisorName: "يوسf المرعي",
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
    recommendedTeam: "APK",
    recommendedPriority: "MEDIUM",
    attachments: [
      {
        id: "att5",
        reportId: "rpt5",
        name: "empty-map.png",
        type: "image",
        url: "/placeholder.png",
        size: "320 KB",
        createdAt: hoursAgo(2),
      },
    ],
  },
  {
    id: "rpt6",
    number: "RPT-2026-006",
    observation: "The application crashes.",
    status: "CONVERTED_TO_TICKET",
    governorate: "الكرk",
    supervisorId: "u9",
    supervisorName: "يوسf المرعي",
    createdAt: daysAgo(1),
    updatedAt: hoursAgo(6),
    reviewedBy: "سارة العمري",
    classification: "BUG",
    convertedTicketId: "t1",
    convertedTicketNumber: "JCSC-2026-001",
    recommendedTeam: "Developer",
    recommendedPriority: "CRITICAL",
    attachments: [
      {
        id: "att6",
        reportId: "rpt6",
        name: "crash-report.pdf",
        type: "pdf",
        url: "/placeholder.pdf",
        size: "890 KB",
        createdAt: daysAgo(1),
      },
    ],
  },
  {
    id: "rpt7",
    number: "RPT-2026-007",
    observation: "المستخدمون لا يعرفون كيف يستخدمون الاستبيان",
    status: "REJECTED",
    governorate: "معان",
    supervisorId: "u9",
    supervisorName: "يوسf المرعي",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
    reviewedBy: "سارة العمري",
    classification: "TRAINING_ISSUE",
    rejectionReason: "مشكلة تدريب — تم إرسال دليل للمشرف",
    managerDecision: "NOT_A_PROBLEM",
    managerDecisionBy: "سارة العمري",
    managerDecisionAt: daysAgo(1),
    attachments: [],
  },
  {
    id: "rpt8",
    number: "RPT-2026-008",
    observation: "Login is not working.",
    status: "CLOSED",
    governorate: "جرش",
    supervisorId: "u9",
    supervisorName: "يوسf المرعي",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
    reviewedBy: "سارة العمري",
    classification: "BUG",
    convertedTicketId: "t10",
    convertedTicketNumber: "JCSC-2026-010",
    attachments: [],
  },
];

export const mockRoutingRules: RoutingRule[] = [
  {
    id: "rule1",
    keywords: ["sync", "synchronize", "مزامنة", "تزامن", "بيانات"],
    recommendedTeam: "Database",
    recommendedClassification: "BUG",
    priority: "HIGH",
    enabled: true,
  },
  {
    id: "rule2",
    keywords: ["login", "دخول", "password", "حساب", "تسجيل"],
    recommendedTeam: "Developer",
    recommendedClassification: "BUG",
    priority: "HIGH",
    enabled: true,
  },
  {
    id: "rule3",
    keywords: ["freeze", "crash", "يتوقف", "يعلق", "runtime", "application"],
    recommendedTeam: "Developer",
    recommendedClassification: "BUG",
    priority: "HIGH",
    enabled: true,
  },
  {
    id: "rule4",
    keywords: ["map", "خريطة", "empty", "فارغ", "gps", "موقع"],
    recommendedTeam: "APK",
    recommendedClassification: "BUG",
    priority: "MEDIUM",
    enabled: true,
  },
  {
    id: "rule5",
    keywords: ["training", "تدريب", "لا يعرف", "كيف يستخدم"],
    recommendedTeam: "Call Center",
    recommendedClassification: "TRAINING_ISSUE",
    priority: "LOW",
    enabled: true,
  },
];

export function buildOperationsDashboard(reports: FieldReport[]): OperationsDashboard {
  const pendingReview = reports.filter((r) => r.status === "NEW").length;
  const waitingClassification = reports.filter(
    (r) => r.status === "UNDER_REVIEW" || r.status === "WAITING_CLASSIFICATION"
  ).length;
  const majorIncidents = reports.filter(
    (r) => r.classification === "MAJOR_INCIDENT" || r.recommendedPriority === "CRITICAL"
  ).length;

  const similarGroups: SimilarReportGroup[] = [];
  const seen = new Set<string>();
  for (const r of reports) {
    if (r.similarReportIds?.length && !seen.has(r.id)) {
      const ids = [r.id, ...r.similarReportIds];
      ids.forEach((id) => seen.add(id));
      similarGroups.push({
        reportIds: ids,
        observation: r.observation,
        count: ids.length,
        similarity: 0.9,
      });
    }
  }

  const urgentReports = reports
    .filter((r) => r.status === "NEW" || r.status === "UNDER_REVIEW")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, 5);

  const teamMap: Record<string, number> = {};
  reports
    .filter((r) => ["NEW", "UNDER_REVIEW", "WAITING_CLASSIFICATION"].includes(r.status))
    .forEach((r) => {
      const team = r.recommendedTeam ?? "Unassigned";
      teamMap[team] = (teamMap[team] ?? 0) + 1;
    });

  return {
    pendingReview,
    waitingClassification,
    confirmedProblems: reports.filter((r) => r.managerDecision === "CONFIRMED_PROBLEM").length,
    notProblems: reports.filter((r) => r.managerDecision === "NOT_A_PROBLEM").length,
    majorIncidents,
    similarGroups,
    urgentReports,
    needsDecision: reports
      .filter((r) => r.status === "NEW" || r.status === "UNDER_REVIEW")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 8),
    recentConfirmed: reports
      .filter((r) => r.managerDecision === "CONFIRMED_PROBLEM")
      .slice(0, 5),
    recentNotProblem: reports
      .filter((r) => r.managerDecision === "NOT_A_PROBLEM")
      .slice(0, 5),
    teamLoad: Object.entries(teamMap).map(([team, count]) => ({ team, count })),
    todayConverted: reports.filter(
      (r) =>
        r.status === "CONVERTED_TO_TICKET" &&
        new Date(r.updatedAt).toDateString() === new Date().toDateString()
    ).length,
    todayRejected: reports.filter(
      (r) =>
        r.status === "REJECTED" &&
        new Date(r.updatedAt).toDateString() === new Date().toDateString()
    ).length,
  };
}

export function recommendRouting(observation: string): {
  team: string;
  classification: RoutingRule["recommendedClassification"];
  priority: TicketPriority;
} {
  const text = observation.toLowerCase();
  for (const rule of mockRoutingRules.filter((r) => r.enabled)) {
    if (rule.keywords.some((k) => text.includes(k.toLowerCase()))) {
      return {
        team: rule.recommendedTeam,
        classification: rule.recommendedClassification,
        priority: rule.priority,
      };
    }
  }
  return {
    team: "Call Center",
    classification: "QUESTION",
    priority: "MEDIUM",
  };
}
