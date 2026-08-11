// Troca a própria senha (usuário logado, qualquer role). Usado tanto na
// troca obrigatória de primeiro login quanto numa troca voluntária depois.
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiUser } from "@/lib/dal";
import { passwordSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = passwordSchema.safeParse(body?.password);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Senha inválida." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  return Response.json({ ok: true });
}
