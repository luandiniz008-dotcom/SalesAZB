import { prisma } from "@/lib/prisma";
import { apiUser } from "@/lib/dal";

function canAccessSam(user: { role: string; samName: string | null }, sam: string) {
  return user.role === "ADMIN" || user.samName === sam;
}

export async function GET(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const sam = searchParams.get("sam") || "";
  const mes = searchParams.get("mes") || "";
  if (!sam || !mes) {
    return Response.json({ error: "Parâmetros sam e mes são obrigatórios." }, { status: 400 });
  }
  if (!canAccessSam(user, sam)) {
    return Response.json({ error: "Sem acesso ao status desse SAM." }, { status: 403 });
  }

  const status = await prisma.forecastStatus.findUnique({ where: { sam_mes: { sam, mes } } });
  return Response.json({
    concluidoSE: status?.concluidoSE ?? false,
    emSE: status?.emSE ?? null,
    concluidoMM: status?.concluidoMM ?? false,
    emMM: status?.emMM ?? null,
  });
}

/**
 * Conclui/reabre a etapa informada. `fase` = "SE" | "MM" — as duas são
 * independentes, igual ao dashboard original (o relatório SE libera com todos
 * os SEs concluídos; o MM, com todos os MMs).
 */
export async function PUT(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const sam = searchParams.get("sam") || "";
  const mes = searchParams.get("mes") || "";
  if (!sam || !mes) {
    return Response.json({ error: "Parâmetros sam e mes são obrigatórios." }, { status: 400 });
  }
  if (!canAccessSam(user, sam)) {
    return Response.json({ error: "Sem acesso ao status desse SAM." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const fase = body?.fase === "MM" ? "MM" : "SE";
  const concluido = !!body?.concluido;
  const agora = new Date();

  const data =
    fase === "MM"
      ? { concluidoMM: concluido, emMM: agora }
      : { concluidoSE: concluido, emSE: agora };

  const status = await prisma.forecastStatus.upsert({
    where: { sam_mes: { sam, mes } },
    create: { sam, mes, ...data },
    update: data,
  });

  return Response.json({
    concluidoSE: status.concluidoSE,
    emSE: status.emSE,
    concluidoMM: status.concluidoMM,
    emMM: status.emMM,
  });
}
