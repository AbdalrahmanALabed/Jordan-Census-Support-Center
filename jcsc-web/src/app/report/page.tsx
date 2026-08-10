import { redirect } from "next/navigation";

/** @deprecated استخدم /cases/create — مسار موحّد لإنشاء البلاغ */
export default function ReportPage() {
  redirect("/cases/create");
}
