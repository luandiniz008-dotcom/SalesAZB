// Planilha preliminar: só a previsão do próprio SAM (ou de um SAM escolhido
// pelo admin), sem gate e sem entrar no histórico do painel consolidado.
import { prisma } from "@/lib/prisma";
import { apiUser } from "@/lib/dal";
import { buildPreliminarWorkbook } from "@/lib/xlsx-report";
import { samSlug } from "@/lib/sam-slug";

export async function GET(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes") || "";
  const samParam = searchParams.get("sam") || "";
  const sam = user.role === "ADMIN" ? samParam || user.samName || "" : user.samName || "";
  if (!mes || !sam) {
    return Response.json({ error: "Parâmetros mes e sam são obrigatórios." }, { status: 400 });
  }
  if (user.role !== "ADMIN" && sam !== user.samName) {
    return Response.json({ error: "Sem acesso à previsão desse SAM." }, { status: 403 });
  }

  // Mesma regra do relatório final: ordem original da planilha mestre.
  const masterRows = await prisma.masterRow.findMany({
    where: { sam },
    orderBy: { ordem: "asc" },
  });
  const buffer = await buildPreliminarWorkbook(mes, masterRows);
  const filename = `previsao_preliminar_${samSlug(sam).toLowerCase()}_${mes}.xlsx`;

  return new Response(Uint8Array.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
