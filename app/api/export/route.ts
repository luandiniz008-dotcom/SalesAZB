import { prisma } from "@/lib/prisma";
import { apiUser } from "@/lib/dal";
import { filterVisibleSams } from "@/lib/hidden-sams";
import { buildRelatorioWorkbook } from "@/lib/xlsx-report";

// Relatórios oficiais SE e MM têm trava (só liberam quando TODOS os SAMs
// concluírem a respectiva etapa) e são gerados pelo administrador.
// PARCIAL é a prévia do que o time já computou — qualquer usuário pode gerar,
// a qualquer momento, sem trava.
type Tipo = "SE" | "MM" | "PARCIAL";

export async function GET(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes") || "";
  const tipoParam = searchParams.get("tipo");
  const tipo: Tipo = tipoParam === "MM" ? "MM" : tipoParam === "PARCIAL" ? "PARCIAL" : "SE";
  if (!mes) return Response.json({ error: "Parâmetro mes é obrigatório." }, { status: 400 });

  if (tipo !== "PARCIAL" && user.role !== "ADMIN") {
    return Response.json(
      { error: "Apenas administradores geram os relatórios oficiais SE e MM. Use a prévia (parcial)." },
      { status: 403 }
    );
  }

  if (tipo !== "PARCIAL") {
    const masterSams = await prisma.masterRow.findMany({ select: { sam: true }, distinct: ["sam"] });
    const sams = filterVisibleSams(masterSams).map((r) => r.sam);
    const statuses = await prisma.forecastStatus.findMany({ where: { mes, sam: { in: sams } } });
    const concluidos = statuses.filter((s) =>
      tipo === "MM" ? s.concluidoMM : s.concluidoSE
    ).length;
    if (sams.length === 0 || concluidos < sams.length) {
      const pendentes = sams.filter((sam) => {
        const st = statuses.find((s) => s.sam === sam);
        return !(tipo === "MM" ? st?.concluidoMM : st?.concluidoSE);
      });
      return Response.json(
        {
          error: `O relatório ${tipo} só pode ser gerado quando todos os SAMs concluírem a etapa ${tipo}. Pendentes (${pendentes.length}): ${pendentes.join(", ")}`,
        },
        { status: 409 }
      );
    }
  }

  // A busca da planilha mestre acontece dentro de buildRelatorioWorkbook, em
  // paralelo com os lançamentos do trimestre (e sempre ordenada por `ordem`,
  // que é o que mantém o arquivo 1:1 com a planilha original).
  const buffer = await buildRelatorioWorkbook(mes);
  const bytes = Uint8Array.from(buffer);
  const filename = `previsao_vendas_${mes}_${tipo}.xlsx`;
  const tamanhoKB = Math.round(bytes.byteLength / 1024);

  await prisma.generatedFile.upsert({
    where: { mes_tipo: { mes, tipo } },
    create: { mes, tipo, filename, data: bytes, tamanhoKB },
    update: { filename, data: bytes, tamanhoKB, geradoEm: new Date() },
  });

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
