import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import {
  AHMED_AY_PROFILE,
  applyDeveloperEscalationHierarchy,
} from "../src/lib/developers/escalation-hierarchy";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("jcsc2026", 10);

  let ahmedAy = await prisma.user.findUnique({
    where: { email: AHMED_AY_PROFILE.email },
  });

  if (!ahmedAy) {
    ahmedAy = await prisma.user.create({
      data: {
        ...AHMED_AY_PROFILE,
        role: "DEVELOPER",
        password: passwordHash,
        phone: "+962790000001",
        shift: "صباحي",
        specialtyTags: "[]",
        notifyEmail: true,
        notifyInApp: true,
      },
    });
    console.log("created:", ahmedAy.email);
  } else {
    await prisma.user.update({
      where: { id: ahmedAy.id },
      data: { name: AHMED_AY_PROFILE.name, team: AHMED_AY_PROFILE.team },
    });
    console.log("updated:", ahmedAy.email);
  }

  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true },
  });
  const emailToId = Object.fromEntries(allUsers.map((u) => [u.email, u.id]));

  await applyDeveloperEscalationHierarchy(prisma, emailToId);

  const devs = await prisma.user.findMany({
    where: { role: "DEVELOPER" },
    select: {
      name: true,
      email: true,
      directManager: { select: { name: true, email: true } },
    },
    orderBy: { name: "asc" },
  });

  console.log("\nDeveloper → Manager:");
  for (const d of devs) {
    console.log(`  ${d.name} → ${d.directManager?.name ?? "—"}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
