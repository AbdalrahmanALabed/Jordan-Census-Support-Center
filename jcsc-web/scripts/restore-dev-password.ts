/** استعادة كلمة مرور hazem@jcsc.gov.jo من production-passwords (بعد الاختبارات) */
import { hash } from "bcryptjs";
import { prisma } from "../src/lib/db";
import { normalizeEmail } from "../src/lib/email";
import { PRODUCTION_PASSWORDS } from "../prisma/production-passwords";

async function main() {
  const EMAIL = "hazem@jcsc.gov.jo";
  const plain = PRODUCTION_PASSWORDS[EMAIL];
  if (!plain) process.exit(1);
  await prisma.user.update({
    where: { email: normalizeEmail(EMAIL) },
    data: { password: await hash(plain, 10) },
  });
  console.log(`✓ restored ${EMAIL}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
