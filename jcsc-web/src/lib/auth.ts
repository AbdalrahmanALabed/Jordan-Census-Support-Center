import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticateUser } from "@/lib/authenticate-user";
import { logAudit } from "@/lib/audit";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      team?: string | null;
      permissions: string[];
    };
  }

  interface User {
    id: string;
    role: string;
    team?: string | null;
    permissions: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    team?: string | null;
    permissions: string[];
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await authenticateUser(credentials.email, credentials.password);
          if (!user) return null;

          await logAudit({
            action: "LOGIN",
            entityType: "User",
            entityId: user.id,
            userId: user.id,
          });

          return user;
        } catch (error) {
          console.error("[auth] authorize failed:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.team = user.team;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.team = token.team;
      session.user.permissions = token.permissions;
      return session;
    },
  },
};
