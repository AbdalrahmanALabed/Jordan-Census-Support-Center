import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";
import { getPermissionsForUser } from "../src/lib/permissions";

const prisma = new PrismaClient();

async function main() {
  const email = "support-supervisor@jcsc.gov.jo";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log("NOT FOUND");
    return;
  }
  console.log("password ok:", await compare("jcsc2026", user.password));
  try {
    const perms = await getPermissionsForUser(user.id, user.role);
    console.log("permissions:", perms);
  } catch (e) {
    console.error("getPermissionsForUser FAILED:", e);
  }
}

main()
  .finally(() => prisma.$disconnect());
