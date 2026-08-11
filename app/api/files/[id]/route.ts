import { prisma } from "@/lib/prisma";
import { apiAdmin } from "@/lib/dal";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await apiAdmin();
  if (error) return error;

  const { id } = await params;
  const file = await prisma.generatedFile.findUnique({ where: { id } });
  if (!file) return Response.json({ error: "Arquivo não encontrado." }, { status: 404 });

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await apiAdmin();
  if (error) return error;

  const { id } = await params;
  await prisma.generatedFile.delete({ where: { id } }).catch(() => null);
  return Response.json({ ok: true });
}
