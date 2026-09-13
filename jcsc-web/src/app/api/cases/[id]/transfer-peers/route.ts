import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getCaseById } from "@/lib/cases/server";
import { canViewItemByFieldOpsRules } from "@/lib/field-ops-visibility";
import {
  formatTransferPeerLabel,
  isLeadTransferRole,
  listCoordinatorTransferPeers,
} from "@/lib/coordinator-transfer";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireSession();
  if (response) return response;

  if (!isLeadTransferRole(session!.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const caseItem = await getCaseById(id);
  if (!caseItem) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (caseItem.status !== "OPEN") {
    return NextResponse.json({ peers: [] });
  }

  if (
    !canViewItemByFieldOpsRules(
      {
        affectedSystem: caseItem.affectedSystem,
        researcherIssueType: caseItem.researcherIssueType,
      },
      session!.user.role
    )
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const peers = await listCoordinatorTransferPeers(
    {
      governorate: caseItem.governorate,
      affectedSystem: caseItem.affectedSystem,
      researcherIssueType: caseItem.researcherIssueType,
      assignedCoordinatorId: caseItem.assignedCoordinatorId,
      status: caseItem.status,
    },
    session!.user.id
  );

  return NextResponse.json({
    peers: peers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleLabel: ROLE_LABELS[user.role as UserRole] ?? user.role,
      label: formatTransferPeerLabel(user),
      team: user.team,
      governorate: user.governorate,
    })),
  });
}
