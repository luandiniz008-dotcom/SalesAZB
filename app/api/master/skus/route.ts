// Lista de medicamentos (SKU) distintos da planilha mestre, visível no dashboard.
import { prisma } from "@/lib/prisma";
import { apiUser } from "@/lib/dal";
import { filterVisibleSams } from "@/lib/hidden-sams";
import { filterVisibleSkus } from "@/lib/hidden-produtos";

export async function GET() {
  const { error } = await apiUser();
  if (error) return error;

  const rows = await prisma.masterRow.findMany({ select: { sam: true, sku: true } });
  const visiveis = filterVisibleSkus(filterVisibleSams(rows));
  const skus = [...new Set(visiveis.map((r) => r.sku))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  return Response.json({ skus });
}
