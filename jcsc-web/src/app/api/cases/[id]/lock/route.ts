import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  acquireOrRefreshCaseLock,
  getCaseLockInfo,
  releaseCaseLock,
} from "@/lib/cases/processing-lock";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireSession();
  if (response) return response;

  const { id } = await params;
  const lockToken = _req.nextUrl.searchParams.get("lockToken");
  const info = await getCaseLockInfo(id, lockToken);
  return NextResponse.json(info);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireSession();
  if (response) return response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const lockToken = String(body.lockToken ?? "").trim();
  if (!lockToken) {
    return NextResponse.json({ error: "lockToken مطلوب" }, { status: 400 });
  }

  const result = await acquireOrRefreshCaseLock(id, session!.user.id, lockToken);
  if (!result.ok) {
    return NextResponse.json(
      {
        locked: true,
        heldByMe: false,
        lockedByUserName: result.lockedByUserName,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    locked: true,
    heldByMe: true,
    expiresAt: result.expiresAt.toISOString(),
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireSession();
  if (response) return response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const lockToken = String(body.lockToken ?? "").trim();
  if (lockToken) {
    await releaseCaseLock(id, lockToken);
  }
  return NextResponse.json({ ok: true });
}
