import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/email";
import { getPermissionsForUser } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  team?: string | null;
  permissions: string[];
};

export async function authenticateUser(
  emailInput: string,
  passwordInput: string
): Promise<AuthUser | null> {
  const email = normalizeEmail(emailInput);
  const password = passwordInput.trim();

  if (!email || !password) return null;

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const legacy = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM User WHERE lower(email) = ${email} LIMIT 1
    `;
    if (legacy[0]?.id) {
      user = await prisma.user.findUnique({ where: { id: legacy[0].id } });
    }
  }

  if (!user || !user.isActive) return null;

  const valid = await compare(password, user.password);
  if (!valid) return null;

  const permissions = await getPermissionsForUser(user.id, user.role as UserRole);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    team: user.team,
    permissions,
  };
}
