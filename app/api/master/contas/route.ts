// Contas (linhas cnpj x sku) de um SAM para um medicamento específico.
import { prisma } from "@/lib/prisma";
import { apiUser } from "@/lib/dal";
import { filterVisibleSkus } from "@/lib/hidden-produtos";

export async function GET(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const sam = searchParams.get("sam") || "";
  // sku é opcional: sem ele, devolve todas as contas do SAM (todos os medicamentos) —
  // usado para montar a etapa de conferência sem precisar buscar sku por sku.
  const sku = searchParams.get("sku") || undefined;
  if (!sam) {
    return Response.json({ error: "Parâmetro sam é obrigatório." }, { status: 400 });
  }
  if (user.role !== "ADMIN" && sam !== user.samName) {
    return Response.json({ error: "Você só pode ver as contas do seu próprio SAM." }, { status: 403 });
  }

  // Ordem da planilha mestre — igual ao dashboard antigo, que listava as
  // contas na sequência do arquivo (samContasForSku não reordenava nada).
  const contas = await prisma.masterRow.findMany({
    where: { sam, ...(sku ? { sku } : {}) },
    select: { cnpj: true, cliente: true, grupo: true, uf: true, sku: true, sap: true },
    orderBy: { ordem: "asc" },
  });
  // Produtos fora do escopo não aparecem em nenhuma tela do dashboard.
  return Response.json({ contas: filterVisibleSkus(contas) });
}
