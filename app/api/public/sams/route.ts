// Lista de nomes de SAM (só o nome, sem CNPJ/cliente) usada no formulário de
// cadastro para o usuário indicar quem ele é. Não exige login: é necessária
// antes de existir uma sessão.
import { prisma } from "@/lib/prisma";
import { filterVisibleSams } from "@/lib/hidden-sams";

export async function GET() {
  const rows = await prisma.masterRow.findMany({
    select: { sam: true },
    distinct: ["sam"],
    orderBy: { sam: "asc" },
  });
  return Response.json({ sams: filterVisibleSams(rows).map((r) => r.sam) });
}
