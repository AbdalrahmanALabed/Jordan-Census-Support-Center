import { PrismaClient } from "@prisma/client";
import { createCaseFromReport } from "../src/lib/cases/server";

const prisma = new PrismaClient();

async function main() {
  const reports = await prisma.report.findMany({
    where: { status: "NEW" },
    include: { supervisor: true },
    orderBy: { createdAt: "asc" },
  });

  const existingCaseReportIds = new Set(
    (
      await prisma.case.findMany({
        where: { sourceReportId: { not: null } },
        select: { sourceReportId: true },
      })
    )
      .map((c) => c.sourceReportId)
      .filter(Boolean) as string[]
  );

  const orphans = reports.filter((r) => !existingCaseReportIds.has(r.id));
  console.log(`Found ${orphans.length} orphan report(s)`);

  for (const report of orphans) {
    const caseRecord = await createCaseFromReport({
      reportId: report.id,
      reportNumber: report.number,
      description: report.description,
      governorate: report.governorate,
      affectedUsers: report.enumeratorsAffected,
      createdById: report.supervisorId,
      affectedSystem: report.affectedSystem,
    });
    console.log(`Fixed: ${report.number} → ${caseRecord.number}`);
  }

  console.log("Done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
