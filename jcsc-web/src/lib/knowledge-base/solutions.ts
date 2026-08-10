export type SolutionSystemId =
  | "RESEARCHER_SYSTEM"
  | "FIELD_OPERATIONS"
  | "CALL_CENTER"
  | "DASHBOARD";

export interface SolutionSystem {
  id: SolutionSystemId;
  label: string;
  icon: string;
  /** لون تمييز قسم النظام */
  accent: "emerald" | "amber" | "violet" | "sky";
}

export interface SolutionItem {
  id: string;
  systemId: SolutionSystemId;
  title: string;
  /** ملصقات تصنيف المشكلة */
  tags: string[];
  steps: string[];
}

export const SOLUTION_SYSTEMS: SolutionSystem[] = [
  { id: "RESEARCHER_SYSTEM", label: "نظام الباحث", icon: "📱", accent: "emerald" },
  { id: "FIELD_OPERATIONS", label: "إدارة العمل الميداني", icon: "🗺️", accent: "amber" },
  { id: "CALL_CENTER", label: "مركز الاتصال", icon: "☎️", accent: "violet" },
  { id: "DASHBOARD", label: "لوحة المؤشرات", icon: "📊", accent: "sky" },
];

export const SOLUTION_ITEMS: SolutionItem[] = [
  // ── نظام الباحث ──
  {
    id: "rs-login",
    systemId: "RESEARCHER_SYSTEM",
    title: "لا يمكن تسجيل الدخول",
    tags: ["تسجيل الدخول", "حساب", "شبكة"],
    steps: [
      "التأكد من صحة اسم المستخدم وكلمة المرور.",
      "التأكد من وجود اتصال بالإنترنت.",
      "تجربة الاتصال بشبكة أخرى (Wi-Fi أو بيانات).",
      "إعادة تشغيل التطبيق.",
      "إعادة تشغيل الجهاز إذا استمرت المشكلة.",
    ],
  },
  {
    id: "rs-sync",
    systemId: "RESEARCHER_SYSTEM",
    title: "لا يمكن المزامنة (Sync)",
    tags: ["مزامنة", "شبكة", "تخزين"],
    steps: [
      "وجود اتصال بالإنترنت.",
      "قوة إشارة الشبكة.",
      "تجربة شبكة أخرى.",
      "التأكد من وجود مساحة تخزين كافية.",
      "إغلاق التطبيق وفتحه مرة أخرى.",
      "إذا استمرت المشكلة، أرفق لقطة شاشة ورسالة الخطأ.",
    ],
  },
  {
    id: "rs-gps",
    systemId: "RESEARCHER_SYSTEM",
    title: "GPS لا يعمل",
    tags: ["GPS", "موقع", "صلاحيات"],
    steps: [
      "تفعيل خدمة الموقع (Location).",
      "منح التطبيق صلاحية الوصول للموقع.",
      "ضبط دقة الموقع على «عالية».",
      "الخروج إلى مكان مفتوح.",
      "التأكد من عدم وجود تشويش أو ضعف إشارة GPS.",
      "إعادة تشغيل خدمة الموقع أو الجهاز.",
    ],
  },
  {
    id: "rs-map",
    systemId: "RESEARCHER_SYSTEM",
    title: "الخريطة لا تظهر",
    tags: ["خريطة", "تحميل", "إنترنت"],
    steps: [
      "وجود اتصال بالإنترنت.",
      "التأكد من تنزيل الخرائط المطلوبة.",
      "إعادة تحميل الخريطة.",
      "تكبير أو تصغير الخريطة.",
    ],
  },
  {
    id: "rs-open-building",
    systemId: "RESEARCHER_SYSTEM",
    title: "لا يمكن فتح المبنى",
    tags: ["مبنى", "GPS", "مسافة"],
    steps: [
      "وجود الباحث داخل المسافة المسموح بها.",
      "التأكد من تفعيل GPS.",
      "التأكد من عدم وجود مشكلة بالموقع الجغرافي.",
      "إجراء مزامنة ثم المحاولة مرة أخرى.",
    ],
  },
  {
    id: "rs-delete-building",
    systemId: "RESEARCHER_SYSTEM",
    title: "لا يمكن حذف المبنى",
    tags: ["مبنى", "حذف", "صلاحية"],
    steps: [
      "وجود الباحث داخل المسافة المسموح بها.",
      "التأكد من أن المبنى لا يحتوي على بيانات.",
      "التأكد من وجود صلاحية الحذف.",
      "إجراء مزامنة ثم إعادة المحاولة.",
    ],
  },
  {
    id: "rs-move-building",
    systemId: "RESEARCHER_SYSTEM",
    title: "لا يمكن إزاحة المبنى",
    tags: ["مبنى", "إزاحة", "GPS"],
    steps: [
      "وجود الباحث داخل المسافة المسموح بها.",
      "تفعيل GPS.",
      "انتظار تحديث الموقع.",
      "إعادة المحاولة بعد المزامنة.",
    ],
  },
  {
    id: "rs-form-missing",
    systemId: "RESEARCHER_SYSTEM",
    title: "لا تظهر الاستمارة",
    tags: ["استمارة", "إسناد", "تحميل"],
    steps: [
      "التأكد من الإسناد من المشرف.",
      "التأكد من الاتصال بالإنترنت.",
      "قم بعمل إعادة تحميل.",
    ],
  },

  // ── إدارة العمل الميداني ──
  {
    id: "fo-login",
    systemId: "FIELD_OPERATIONS",
    title: "لا يمكن تسجيل الدخول",
    tags: ["تسجيل الدخول", "حساب"],
    steps: [
      "التأكد من اسم المستخدم وكلمة المرور.",
      "التأكد من الاتصال بالإنترنت.",
      "التأكد من أن الحساب مفعّل.",
    ],
  },
  {
    id: "fo-progress",
    systemId: "FIELD_OPERATIONS",
    title: "الإنجاز لا يظهر للباحث",
    tags: ["إنجاز", "باحث", "إسناد"],
    steps: [
      "التأكد من إسناد الباحث للمنطقة.",
      "التأكد من قيام الباحث بالمزامنة.",
      "تحديث الصفحة.",
      "التحقق من تاريخ العمل.",
    ],
  },
  {
    id: "fo-close-block",
    systemId: "FIELD_OPERATIONS",
    title: "لا يمكن إغلاق البلوك",
    tags: ["بلوك", "إغلاق", "إنجاز"],
    steps: [
      "التأكد أن الإنجاز 100%.",
      "التأكد من عدم وجود استمارات غير مكتملة.",
      "التأكد من مزامنة الباحث.",
    ],
  },
  {
    id: "fo-assign-block",
    systemId: "FIELD_OPERATIONS",
    title: "لا يمكن إسناد بلوك",
    tags: ["بلوك", "إسناد", "مزامنة"],
    steps: [
      "التأكد أن البلوك غير مسند.",
      "التأكد من أن الباحث قام بالمزامنة بعد فك الإسناد.",
      "التأكد من أن الباحث قام بالمزامنة بعد الإسناد الجديد.",
    ],
  },
  {
    id: "fo-unassign-block",
    systemId: "FIELD_OPERATIONS",
    title: "لا يمكن فك الإسناد",
    tags: ["إسناد", "فك الإسناد", "مزامنة"],
    steps: [
      "التأكد من عدم وجود عمليات مفتوحة.",
      "التأكد من مزامنة الباحث.",
      "إعادة تحديث الصفحة.",
    ],
  },
  {
    id: "fo-active-user",
    systemId: "FIELD_OPERATIONS",
    title: "الباحث لا يظهر من ضمن المستخدمين النشطين",
    tags: ["باحث", "نشط", "مزامنة"],
    steps: [
      "التأكد من عمل الباحث.",
      "التأكد من آخر مزامنة للباحث.",
      "تحديث الصفحة.",
    ],
  },
  {
    id: "fo-area-missing",
    systemId: "FIELD_OPERATIONS",
    title: "المنطقة لا تظهر",
    tags: ["منطقة", "صلاحية", "بيانات"],
    steps: [
      "التأكد من وجود صلاحية.",
      "تحديث الصفحة.",
      "التأكد من وجود بيانات المنطقة.",
    ],
  },

  // ── مركز الاتصال ──
  {
    id: "cc-login",
    systemId: "CALL_CENTER",
    title: "لا يمكن تسجيل الدخول",
    tags: ["تسجيل الدخول", "حساب"],
    steps: [
      "التأكد من اسم المستخدم وكلمة المرور.",
      "التأكد من الاتصال بالإنترنت.",
      "التأكد من تفعيل الحساب.",
    ],
  },
  {
    id: "cc-self-enum-form",
    systemId: "CALL_CENTER",
    title: "لا تظهر استمارة العد الذاتي",
    tags: ["عد ذاتي", "استمارة", "مواطن"],
    steps: [
      "التأكد من رقم الهاتف أو الرقم الوطني.",
      "التأكد من أن المواطن سجّل في العد الذاتي.",
      "تحديث الصفحة.",
    ],
  },
  {
    id: "cc-save-form",
    systemId: "CALL_CENTER",
    title: "لا يمكن حفظ الاستمارة",
    tags: ["استمارة", "حفظ", "حقول"],
    steps: [
      "التأكد من تعبئة جميع الحقول الإلزامية.",
      "التأكد من الإنترنت.",
      "إعادة المحاولة.",
    ],
  },
  {
    id: "cc-search-citizen",
    systemId: "CALL_CENTER",
    title: "لا يمكن البحث عن المواطن",
    tags: ["بحث", "مواطن", "رقم وطني"],
    steps: [
      "التأكد من صحة الرقم الوطني أو رقم الهاتف.",
      "إزالة المسافات والأحرف غير الصحيحة.",
      "إعادة البحث.",
    ],
  },
  {
    id: "cc-send-form",
    systemId: "CALL_CENTER",
    title: "لا يمكن إرسال الاستمارة",
    tags: ["استمارة", "إرسال", "إنترنت"],
    steps: [
      "التأكد من اكتمال البيانات.",
      "التأكد من الإنترنت.",
      "إعادة المحاولة بعد دقيقة.",
    ],
  },

  // ── لوحة المؤشرات ──
  {
    id: "db-indicators",
    systemId: "DASHBOARD",
    title: "المؤشرات لا تظهر",
    tags: ["مؤشرات", "عرض", "صلاحية"],
    steps: [
      "تحديث الصفحة.",
      "التأكد من وجود إنترنت.",
      "التأكد من اختيار الفترة الزمنية الصحيحة.",
      "التأكد من وجود صلاحية.",
    ],
  },
  {
    id: "db-stale-data",
    systemId: "DASHBOARD",
    title: "البيانات غير محدثة",
    tags: ["بيانات", "تحديث", "مزامنة"],
    steps: [
      "تحديث الصفحة.",
      "الانتظار حتى انتهاء المزامنة.",
      "إعادة تسجيل الدخول.",
    ],
  },
];

export function getSystemById(id: SolutionSystemId): SolutionSystem {
  return SOLUTION_SYSTEMS.find((s) => s.id === id)!;
}

/** بحث LIKE — يطابق جزءاً من العنوان أو الخطوات أو اسم النظام */
export function searchSolutions(query: string, systemFilter?: SolutionSystemId | "ALL") {
  const q = query.trim();
  let items = SOLUTION_ITEMS;

  if (systemFilter && systemFilter !== "ALL") {
    items = items.filter((item) => item.systemId === systemFilter);
  }

  if (!q) return items;

  return items.filter((item) => {
    const system = getSystemById(item.systemId);
    const haystack = [item.title, system.label, ...item.tags, ...item.steps].join(" ");
    return haystack.includes(q);
  });
}

export function groupSolutionsBySystem(items: SolutionItem[]) {
  return SOLUTION_SYSTEMS.map((system) => ({
    system,
    items: items.filter((i) => i.systemId === system.id),
  })).filter((g) => g.items.length > 0);
}
