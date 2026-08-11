import { z } from "zod";
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

  const linhas = await prisma.faturamentoLine.findMany({ where: { sam, mes } });
  const rows: Record<string, { status: string | null; quantidade: number }> = {};
  for (const l of linhas) rows[l.rowKey] = { status: l.status, quantidade: l.quantidade };
  return Response.json({ rows });
}

const lineSchema = z.object({
  status: z.enum(["FATURADO", "NAO_FATURADO", "FATURADO_PARCIALMENTE"]).nullable(),
  quantidade: z.number().int().min(0).default(0),
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
    return Response.json({ error: "Sem acesso ao faturamento desse SAM." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dados de faturamento inválidos." }, { status: 400 });
  }

  const entries = Object.entries(parsed.data.rows);
  await prisma.$transaction(
    entries.map(([rowKey, line]) =>
      prisma.faturamentoLine.upsert({
        where: { sam_mes_rowKey: { sam, mes, rowKey } },
        create: { sam, mes, rowKey, status: line.status, quantidade: line.quantidade },
        update: { status: line.status, quantidade: line.quantidade },
      })
    )
  );

  return Response.json({ ok: true, atualizadoEm: new Date().toISOString() });
}
