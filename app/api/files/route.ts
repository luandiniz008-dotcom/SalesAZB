import { prisma } from "@/lib/prisma";
import { apiAdmin } from "@/lib/dal";

export async function GET() {
  const { error } = await apiAdmin();
  if (error) return error;

  const files = await prisma.generatedFile.findMany({
    select: { id: true, mes: true, tipo: true, filename: true, geradoEm: true, tamanhoKB: true },
    orderBy: [{ mes: "desc" }, { tipo: "asc" }],
  });
  return Response.json({ files });
}
