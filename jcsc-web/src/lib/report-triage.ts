import type { TriageResult } from "@/lib/operations";
import { SLA_HOURS } from "@/lib/operations";
import { GOVERNORATES, type TicketPriority } from "@/lib/types";

function detectGovernorate(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const g of GOVERNORATES) {
    if (lower.includes(g.toLowerCase())) return g;
  }
  return undefined;
}

function routeByKeywords(text: string): {
  category: string;
  issueType: string;
  priority: TicketPriority;
  team: string;
  suggestedSolution: string;
} {
  const lower = text.toLowerCase();

  if (/login|دخول|password|كلمة|حساب|تسجيل/.test(lower)) {
    return {
      category: "تسجيل الدخول",
      issueType: "Authentication",
      priority: "HIGH",
      team: "Developer",
      suggestedSolution: "تحقق من صحة بيانات الدخول وأعد المحاولة. إن استمرت المشكلة، أبلغ فريق الدعم.",
    };
  }
  if (/sync|مزامn|تزامn|بيانات|database|قاعدة/.test(lower)) {
    return {
      category: "مزامنة البيانات",
      issueType: "Data Sync",
      priority: "HIGH",
      team: "Database",
      suggestedSolution: "تأكد من اتصال الإنترنت وأعد المزامنة. إن لم تُحل، سيتابع فريق البيانات.",
    };
  }
  if (/gps|خريطة|map|موقع/.test(lower)) {
    return {
      category: "GPS والموقع",
      issueType: "Field App",
      priority: "MEDIUM",
      team: "Developer",
      suggestedSolution: "فعّل خدمات الموقع للتطبيق وأعد تشغيله.",
    };
  }
  if (/crash|يتوقf|تطبيق|error|خطأ/.test(lower)) {
    return {
      category: "تطبيق الميدان",
      issueType: "Field App",
      priority: "HIGH",
      team: "Developer",
      suggestedSolution: "أغلق التطبيق وأعد فتحه. إن تكررت المشكلة، أرفق لقطة شاشة إن أمكن.",
    };
  }

  return {
    category: "استفسار عام",
    issueType: "General",
    priority: "MEDIUM",
    team: "Call Center",
    suggestedSolution: "سيتواصل معك فريق الدعم لمراجعة التفاصيل.",
  };
}

/** Keyword-based report triage — no AI. */
export async function triageDescription(
  description: string,
  knownGovernorate?: string
): Promise<TriageResult> {
  const trimmed = description.trim();
  const detectedGov = knownGovernorate ?? detectGovernorate(trimmed);
  const route = routeByKeywords(trimmed);

  if (!detectedGov && !knownGovernorate) {
    return {
      title: trimmed.slice(0, 80),
      category: route.category,
      issueType: route.issueType,
      priority: route.priority,
      team: route.team,
      governorate: detectedGov,
      slaHours: SLA_HOURS[route.priority],
      suggestedSolution: route.suggestedSolution,
      checklist: [],
      similarKeywords: [],
      confidence: 1,
      clarifyingQuestion: "في أي محافظة حدثت المشكلة؟ (مثال: عمان، إربد، الزرقاء)",
    };
  }

  return {
    title: trimmed.slice(0, 80),
    category: route.category,
    issueType: route.issueType,
    priority: route.priority,
    team: route.team,
    governorate: detectedGov ?? knownGovernorate,
    slaHours: SLA_HOURS[route.priority],
    suggestedSolution: route.suggestedSolution,
    checklist: [],
    similarKeywords: [],
    confidence: 1,
  };
}
