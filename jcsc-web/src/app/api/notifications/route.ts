import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import {
  isEscalationType,
  mapNotificationToClient,
} from "@/lib/notifications/server";
import { processEscalations } from "@/lib/notifications/escalation";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  try {
    await processEscalations();
  } catch (err) {
    console.error("processEscalations failed:", err);
  }

  const kind = req.nextUrl.searchParams.get("kind");
  const userId = session!.user.id;

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      channel: "IN_APP",
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let mapped = notifications.map(mapNotificationToClient);

  if (kind === "escalation") {
    mapped = mapped.filter((n) => isEscalationType(n.type));
  } else if (kind === "general") {
    mapped = mapped.filter((n) => !isEscalationType(n.type));
  }

  const unreadCount = mapped.filter((n) => !n.isRead).length;

  return NextResponse.json({ notifications: mapped, unreadCount });
}

export async function PATCH(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const body = await req.json();
  const now = new Date();

  if (body.action === "mark_all_read") {
    await prisma.notification.updateMany({
      where: { userId: session!.user.id, isRead: false, channel: "IN_APP" },
      data: { isRead: true, readAt: now },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
