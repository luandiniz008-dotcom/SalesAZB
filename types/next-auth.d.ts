import type { DefaultSession } from "next-auth";

// Estende os tipos padrão do NextAuth para incluir role/samName/mustChangePassword,
// que usamos em toda a aplicação para autorização (admin vs SAM), para amarrar
// o usuário logado à sua linha na planilha mestre, e para forçar a troca de
// senha no primeiro login de contas criadas pelo admin.
declare module "next-auth" {
  interface User {
    role: "ADMIN" | "SAM";
    samName: string | null;
    mustChangePassword: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "SAM";
      samName: string | null;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

// "next-auth/jwt" só reexporta o tipo de "@auth/core/jwt" (não declara sua
// própria interface JWT), então o module augmentation precisa mirar o
// módulo de origem — senão o merge não é aplicado e os campos custom caem
// no índice `Record<string, unknown>` da interface base (viram `unknown`).
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "SAM";
    samName: string | null;
    mustChangePassword: boolean;
  }
}
