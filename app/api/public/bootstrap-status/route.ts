// Indica ao formulário de cadastro se essa vai ser a primeira conta do
// sistema (que vira administrador automaticamente). Puramente informativo —
// quem decide de verdade é a rota /api/register.
import { prisma } from "@/lib/prisma";

export async function GET() {
  const count = await prisma.user.count();
  return Response.json({ isFirstUser: count === 0 });
}
