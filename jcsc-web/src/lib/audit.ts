import type { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function logAudit(params: {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  details?: string;
  userId?: string;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({ data: params });
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}
