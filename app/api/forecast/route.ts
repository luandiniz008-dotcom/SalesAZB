import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiUser } from "@/lib/dal";
import { getOrCreateSettings } from "@/lib/settings";

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
    return Response.json({ error: "Sem acesso à previsão desse SAM." }, { status: 403 });
  }

  const lines = await prisma.forecastLine.findMany({ where: { sam, mes } });
  const rows: Record<string, { se: number; riscoSE: string; mm: number; riscoMM: string }> = {};
  let atualizadoEm: string | null = null;
  for (const l of lines) {
    rows[l.rowKey] = { se: l.se, riscoSE: l.riscoSE, mm: l.mm, riscoMM: l.riscoMM };
    if (!atualizadoEm || l.updatedAt.toISOString() > atualizadoEm) atualizadoEm = l.updatedAt.toISOString();
  }
  return Response.json({ rows, atualizadoEm });
}

const lineSchema = z.object({
  se: z.number().int().min(0).default(0),
  riscoSE: z.enum(["Baixo", "Médio", "Alto"]).default("Médio"),
  mm: z.number().int().min(0).default(0),
  riscoMM: z.enum(["Baixo", "Médio", "Alto"]).default("Médio"),
});
const putSchema = z.object({ rows: z.record(z.string(), lineSchema) });

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
    return Response.json({ error: "Sem acesso à previsão desse SAM." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dados de previsão inválidos." }, { status: 400 });
  }

  // O SAM só escreve na etapa que o admin liberou — quem destrava SE e MM ao
  // mesmo tempo é o administrador. Na etapa SE, os campos de MM enviados pelo
  // cliente são ignorados (preserva o que já está gravado) em vez de recusar o
  // salvamento inteiro, já que o cliente sempre envia a linha completa.
  const settings = await getOrCreateSettings();
  const somenteSE = user.role !== "ADMIN" && settings.faseAtiva === "SE";

  const entries = Object.entries(parsed.data.rows);
  await prisma.$transaction(
    entries.map(([rowKey, line]) => {
      const dados = somenteSE
        ? { se: line.se, riscoSE: line.riscoSE }
        : { se: line.se, riscoSE: line.riscoSE, mm: line.mm, riscoMM: line.riscoMM };
      return prisma.forecastLine.upsert({
        where: { sam_mes_rowKey: { sam, mes, rowKey } },
        create: { sam, mes, rowKey, ...dados },
        update: dados,
      });
    })
  );

  return Response.json({ ok: true, atualizadoEm: new Date().toISOString() });
}
