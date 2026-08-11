// Contadores para o painel de Configurações (admin).
import { prisma } from "@/lib/prisma";
import { apiAdmin } from "@/lib/dal";
import { filterVisibleSams, isHiddenSam } from "@/lib/hidden-sams";

export async function GET() {
  const { error } = await apiAdmin();
  if (error) return error;

  const all = await prisma.masterRow.findMany({ select: { sam: true, sku: true } });
  const visible = filterVisibleSams(all);

  const samCount = new Set(visible.map((r) => r.sam)).size;
  const skuCount = new Set(visible.map((r) => r.sku)).size;
  const rowCount = visible.length;

  const totalSamsAll = new Set(all.map((r) => r.sam)).size;
  const totalRowsAll = all.length;
  const hiddenPresentes = [...new Set(all.map((r) => r.sam))].filter((s) => isHiddenSam(s));

  return Response.json({ samCount, skuCount, rowCount, totalSamsAll, totalRowsAll, hiddenPresentes });
}
