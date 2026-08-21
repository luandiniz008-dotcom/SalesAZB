// Lista de medicamentos (SKU) da planilha mestre, visível no dashboard.
//
// Sem o parâmetro `sam`, devolve o catálogo completo — é o que o formulário de
// pedido manual da calibração usa, onde o SAM pode escolher qualquer produto.
// Com `sam`, devolve só os medicamentos que aquele SAM atende, que é o que o
// wizard de previsão usa.
import { prisma } from "@/lib/prisma";
import { apiUser } from "@/lib/dal";
import { filterVisibleSams } from "@/lib/hidden-sams";
import { filterVisibleSkus } from "@/lib/hidden-produtos";
import { filtrarProdutosDoSam } from "@/lib/carteira";

export async function GET(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;

  const sam = new URL(req.url).searchParams.get("sam");
  if (sam && user.role !== "ADMIN" && sam !== user.samName) {
    return Response.json(
      { error: "Você só pode ver os medicamentos do seu próprio SAM." },
      { status: 403 }
    );
  }

  const rows = await prisma.masterRow.findMany({
    where: sam ? { sam } : undefined,
    select: { sam: true, sku: true },
  });

  let visiveis = filterVisibleSkus(filterVisibleSams(rows));
  if (sam) visiveis = filtrarProdutosDoSam(sam, visiveis);

  const skus = [...new Set(visiveis.map((r) => r.sku))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  return Response.json({ skus });
}
