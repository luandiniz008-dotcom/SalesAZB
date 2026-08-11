// Importa uma nova planilha mestre (admin). O parsing do .xlsx acontece no
// cliente (mesma lib SheetJS); aqui só recebemos as linhas já extraídas.
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAdmin } from "@/lib/dal";

const rowSchema = z.object({
  cnpj: z.string().trim().min(1),
  sam: z.string().trim().min(1),
  cliente: z.string().trim().default(""),
  grupo: z.string().trim().default(""),
  uf: z.string().trim().default(""),
  sku: z.string().trim().default(""),
  sap: z.string().trim().default(""),
});
const bodySchema = z.object({ rows: z.array(rowSchema).min(1) });

export async function POST(req: Request) {
  const { error } = await apiAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Planilha inválida ou vazia." }, { status: 400 });
  }
  const { rows } = parsed.data;

  // `ordem` = posição da linha no arquivo importado. Nenhuma linha é removida
  // (nem duplicatas idênticas): a base precisa ter exatamente o mesmo número de
  // linhas, na mesma ordem, para a exportação sair 1:1 com a planilha original.
  await prisma.$transaction(async (tx) => {
    await tx.masterRow.deleteMany({});
    const chunkSize = 1000;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await tx.masterRow.createMany({
        data: chunk.map((r, j) => ({ ...r, ordem: i + j })),
      });
    }
  });

  const samCount = new Set(rows.map((r) => r.sam)).size;
  return Response.json({ ok: true, rowCount: rows.length, samCount });
}
