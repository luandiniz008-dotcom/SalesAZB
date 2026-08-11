import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "ADMIN" | "SAM";
  samName: string | null;
  mustChangePassword: boolean;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  return (session?.user as SessionUser | undefined) ?? null;
}

/** Para Server Components/Pages: redireciona para /login se não autenticado. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Para Server Components/Pages: exige role ADMIN, senão manda para o lançamento. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/lancamento");
  return user;
}

/**
 * Para Route Handlers: retorna o usuário autenticado ou uma Response de
 * erro pronta para devolver (401/403). Uso:
 *   const { user, error } = await apiUser();
 *   if (error) return error;
 */
export async function apiUser(): Promise<
  { user: SessionUser; error: null } | { user: null; error: Response }
> {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, error: Response.json({ error: "Não autenticado." }, { status: 401 }) };
  }
  return { user, error: null };
}

export async function apiAdmin(): Promise<
  { user: SessionUser; error: null } | { user: null; error: Response }
> {
  const { user, error } = await apiUser();
  if (error) return { user: null, error };
  if (user.role !== "ADMIN") {
    return { user: null, error: Response.json({ error: "Apenas administradores." }, { status: 403 }) };
  }
  return { user, error: null };
}
