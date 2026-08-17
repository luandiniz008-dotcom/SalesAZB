// Contadores para o painel de Configurações (admin).
import { prisma } from "@/lib/prisma";
import { apiAdmin } from "@/lib/dal";
import { filterVisibleSams, isHiddenSam } from "@/lib/hidden-sams";
import { filterVisibleSkus, isHiddenSku } from "@/lib/hidden-produtos";

export async function GET() {
  const { error } = await apiAdmin();
  if (error) return error;

  const all = await prisma.masterRow.findMany({ select: { sam: true, sku: true } });
  // O dashboard só enxerga SAMs e produtos dentro do escopo.
  const visible = filterVisibleSkus(filterVisibleSams(all));

  const samCount = new Set(visible.map((r) => r.sam)).size;
  const skuCount = new Set(visible.map((r) => r.sku)).size;
  const rowCount = visible.length;

  const totalSamsAll = new Set(all.map((r) => r.sam)).size;
  const totalRowsAll = all.length;
  const hiddenPresentes = [...new Set(all.map((r) => r.sam))].filter((s) => isHiddenSam(s));
  const skusOcultos = [...new Set(all.map((r) => r.sku))].filter((s) => isHiddenSku(s));

  return Response.json({
    samCount,
    skuCount,
    rowCount,
    totalSamsAll,
    totalRowsAll,
    hiddenPresentes,
    skusOcultos,
  });
}
