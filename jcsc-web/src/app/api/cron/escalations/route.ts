import { NextResponse } from "next/server";
import { processEscalations } from "@/lib/notifications/escalation";

/** Periodic escalation check — call from scheduler or manually. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await processEscalations();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("cron escalations failed:", err);
    return NextResponse.json({ error: "Escalation failed" }, { status: 500 });
  }
}
