import { prisma } from "@/lib/prisma";
import { apiUser } from "@/lib/dal";
import { filterVisibleSams } from "@/lib/hidden-sams";

export async function GET(req: Request) {
  const { error } = await apiUser();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes") || "";
  if (!mes) return Response.json({ error: "Parâmetro mes é obrigatório." }, { status: 400 });

  const masterSams = await prisma.masterRow.findMany({ select: { sam: true }, distinct: ["sam"] });
  const sams = filterVisibleSams(masterSams)
    .map((r) => r.sam)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  const [sums, statuses, fatStatuses] = await Promise.all([
    prisma.forecastLine.groupBy({
      by: ["sam"],
      where: { mes, sam: { in: sams } },
      _sum: { se: true, mm: true },
    }),
    prisma.forecastStatus.findMany({ where: { mes, sam: { in: sams } } }),
    prisma.faturamentoStatus.findMany({ where: { mes, sam: { in: sams } } }),
  ]);
  const sumBySam = new Map(sums.map((s) => [s.sam, s._sum]));
  const statusBySam = new Map(statuses.map((s) => [s.sam, s]));
  const fatBySam = new Map(fatStatuses.map((s) => [s.sam, s]));

  let totalSE = 0;
  let totalMM = 0;
  let concluidosSE = 0;
  let concluidosMM = 0;
  let confirmadosFat = 0;

  const result = sams.map((sam) => {
    const se = sumBySam.get(sam)?.se ?? 0;
    const mm = sumBySam.get(sam)?.mm ?? 0;
    const st = statusBySam.get(sam);
    const fat = fatBySam.get(sam);
    totalSE += se;
    totalMM += mm;
    if (st?.concluidoSE) concluidosSE++;
    if (st?.concluidoMM) concluidosMM++;
    if (fat?.concluido) confirmadosFat++;
    return {
      sam,
      se,
      mm,
      concluidoSE: st?.concluidoSE ?? false,
      concluidoMM: st?.concluidoMM ?? false,
      faturamentoConcluido: fat?.concluido ?? false,
    };
  });

  const total = sams.length;
  return Response.json({
    mes,
    statuses: result,
    totalSE,
    totalMM,
    concluidosSE,
    concluidosMM,
    confirmadosFat,
    totalSams: total,
    // Gates independentes: cada relatório oficial libera com a sua etapa completa.
    seCompleto: total > 0 && concluidosSE === total,
    mmCompleto: total > 0 && concluidosMM === total,
  });
}
