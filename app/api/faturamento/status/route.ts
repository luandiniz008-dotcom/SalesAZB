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
    return Response.json({ error: "Sem acesso ao faturamento desse SAM." }, { status: 403 });
  }

  const st = await prisma.faturamentoStatus.findUnique({ where: { sam_mes: { sam, mes } } });
  return Response.json({ concluido: st?.concluido ?? false, em: st?.em ?? null });
}

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
    return Response.json({ error: "Sem acesso ao faturamento desse SAM." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const concluido = !!body?.concluido;
  const em = new Date();

  await prisma.faturamentoStatus.upsert({
    where: { sam_mes: { sam, mes } },
    create: { sam, mes, concluido, em },
    update: { concluido, em },
  });

  return Response.json({ ok: true, concluido, em: em.toISOString() });
}
