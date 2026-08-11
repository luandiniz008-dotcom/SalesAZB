import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "").trim().toLowerCase();
        const password = String(credentials?.password || "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          samName: user.samName,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // `user` aqui é uma união com AdapterUser (que tem index signature),
        // então o TS não consegue estreitar os campos custom sem esse cast.
        const u = user as {
          id: string;
          role: "ADMIN" | "SAM";
          samName: string | null;
          mustChangePassword: boolean;
        };
        token.id = u.id;
        token.role = u.role;
        token.samName = u.samName;
        token.mustChangePassword = u.mustChangePassword;
      }
      // Atualização disparada pelo client (useSession().update(...)) depois
      // que o usuário troca a própria senha — evita exigir novo login.
      if (trigger === "update" && session && typeof session === "object" && "mustChangePassword" in session) {
        token.mustChangePassword = Boolean((session as { mustChangePassword?: boolean }).mustChangePassword);
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.samName = token.samName;
      session.user.mustChangePassword = token.mustChangePassword;
      return session;
    },
  },
});
