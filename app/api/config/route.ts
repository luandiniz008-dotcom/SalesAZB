import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiUser, apiAdmin } from "@/lib/dal";
import { getOrCreateSettings } from "@/lib/settings";

export async function GET() {
  const { error } = await apiUser();
  if (error) return error;

  const settings = await getOrCreateSettings();
  return Response.json({ mesVigente: settings.mesVigente, faseAtiva: settings.faseAtiva });
}

const patchSchema = z.object({
  mesVigente: z.string().regex(/^\d{6}$/).optional(),
  faseAtiva: z.enum(["SE", "MM"]).optional(),
});

export async function PATCH(req: Request) {
  const { error } = await apiAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success || (!parsed.data.mesVigente && !parsed.data.faseAtiva)) {
    return Response.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  await getOrCreateSettings();
  const settings = await prisma.appSettings.update({ where: { id: 1 }, data: parsed.data });
  return Response.json({ mesVigente: settings.mesVigente, faseAtiva: settings.faseAtiva });
}
