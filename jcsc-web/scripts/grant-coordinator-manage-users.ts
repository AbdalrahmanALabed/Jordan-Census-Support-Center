import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const permission = await prisma.permission.findUnique({
    where: { key: "manage_users" },
  });

  if (!permission) {
    throw new Error("manage_users permission not found — run npm run db:seed first");
  }

  await prisma.rolePermission.upsert({
    where: {
      role_permissionId: {
        role: "SUPPORT_COORDINATOR",
        permissionId: permission.id,
      },
    },
    create: {
      role: "SUPPORT_COORDINATOR",
      permissionId: permission.id,
      granted: true,
    },
    update: { granted: true },
  });

  console.log("Granted manage_users to SUPPORT_COORDINATOR");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
