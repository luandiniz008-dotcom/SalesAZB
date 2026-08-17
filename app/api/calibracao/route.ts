import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiUser } from "@/lib/dal";
import { isManualRowKey } from "@/lib/calibracao";

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
    return Response.json({ error: "Sem acesso à calibração desse SAM." }, { status: 403 });
  }

  const linhas = await prisma.calibracaoLine.findMany({
    where: { sam, mes },
    select: {
      rowKey: true,
      sku: true,
      cliente: true,
      uf: true,
      manual: true,
      quantidade: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "asc" },
  });

  const atualizadoEm = linhas.reduce<string | null>((acc, l) => {
    const iso = l.updatedAt.toISOString();
    return !acc || iso > acc ? iso : acc;
  }, null);

  return Response.json({
    linhas: linhas.map((l) => ({
      rowKey: l.rowKey,
      sku: l.sku,
      cliente: l.cliente,
      uf: l.uf,
      manual: l.manual,
      quantidade: l.quantidade,
    })),
    atualizadoEm,
  });
}

const linhaSchema = z.object({
  rowKey: z.string().min(1),
  sku: z.string().trim().min(1),
  cliente: z.string().trim().default(""),
  uf: z.string().trim().default(""),
  manual: z.boolean().default(false),
  quantidade: z.number().int().min(0).default(0),
});
const putSchema = z.object({ linhas: z.array(linhaSchema) });

/**
 * Substitui o conjunto de linhas de calibração do SAM no mês. Diferente das
 * outras etapas (que só fazem upsert), aqui a remoção importa: o SAM pode
 * apagar um pedido manual que adicionou por engano.
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
    return Response.json({ error: "Sem acesso à calibração desse SAM." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Dados de calibração inválidos." },
      { status: 400 }
    );
  }

  // Um pedido manual precisa de conta e produto; um pedido da planilha mestre
  // só é gravado se tiver quantidade (senão vira lixo de linha zerada).
  const linhas = parsed.data.linhas.filter((l) => {
    const manual = l.manual || isManualRowKey(l.rowKey);
    if (manual) return !!l.cliente && !!l.sku;
    return l.quantidade > 0;
  });

  for (const l of linhas) {
    if ((l.manual || isManualRowKey(l.rowKey)) && !isManualRowKey(l.rowKey)) {
      return Response.json(
        { error: "Pedido manual precisa usar um identificador manual." },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction([
    prisma.calibracaoLine.deleteMany({ where: { sam, mes } }),
    ...(linhas.length
      ? [
          prisma.calibracaoLine.createMany({
            data: linhas.map((l) => ({
              sam,
              mes,
              rowKey: l.rowKey,
              sku: l.sku,
              cliente: l.cliente,
              uf: l.uf,
              manual: l.manual || isManualRowKey(l.rowKey),
              quantidade: l.quantidade,
            })),
          }),
        ]
      : []),
  ]);

  return Response.json({ ok: true, gravadas: linhas.length, atualizadoEm: new Date().toISOString() });
}
