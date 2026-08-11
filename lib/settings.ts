import "server-only";
import { prisma } from "@/lib/prisma";
import { mesAtualPadrao } from "@/lib/mes";

export async function getOrCreateSettings() {
  const existing = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.appSettings.create({ data: { id: 1, mesVigente: mesAtualPadrao(), faseAtiva: "SE" } });
}
