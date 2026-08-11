// Cria o primeiro administrador do sistema. Só funciona uma única vez —
// enquanto não existir nenhum usuário cadastrado. Depois disso, só um admin
// já logado pode criar novas contas (ver /api/admin/users).
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setupSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    return Response.json(
      { error: "O sistema já tem administrador configurado. Peça a um admin para criar sua conta." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Dados inválidos." },
      { status: 400 }
    );
  }
  const { name, email, password } = parsed.data;

  // Checagem de corrida: se dois setups chegarem juntos, só o primeiro insert vence
  // (garantida pela contagem acima + unique(email); em teoria alguém poderia colar
  // exatamente no meio, mas o efeito prático é só um segundo erro de e-mail duplicado
  // ou, na pior hipótese, um segundo admin — aceitável para esse caso de uso).
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    // O próprio admin escolheu essa senha agora — não precisa trocar de novo.
    data: { name, email, passwordHash, role: "ADMIN", samName: null, mustChangePassword: false },
    select: { id: true, role: true },
  });

  return Response.json({ ok: true, role: user.role }, { status: 201 });
}
