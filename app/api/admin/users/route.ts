import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAdmin } from "@/lib/dal";
import { createUserSchema } from "@/lib/validation";
import { isHiddenSam } from "@/lib/hidden-sams";

export async function GET() {
  const { error } = await apiAdmin();
  if (error) return error;

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, samName: true, mustChangePassword: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return Response.json({ users });
}

// Admin cria uma conta diretamente (não existe auto-cadastro no sistema).
// A senha aqui é escolhida pelo admin, então a conta é criada exigindo troca
// no primeiro login.
export async function POST(req: Request) {
  const { error } = await apiAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message || "Dados inválidos." }, { status: 400 });
  }
  const { name, email, password, role, samName } = parsed.data;

  const already = await prisma.user.findUnique({ where: { email } });
  if (already) {
    return Response.json({ error: "Já existe uma conta com esse e-mail." }, { status: 409 });
  }

  if (role === "SAM") {
    if (!samName) {
      return Response.json({ error: "Selecione qual SAM da planilha mestre essa conta representa." }, { status: 400 });
    }
    const validSam = await prisma.masterRow.findFirst({ where: { sam: samName } });
    if (!validSam || isHiddenSam(samName)) {
      return Response.json({ error: "SAM inválido — escolha um nome da lista." }, { status: 400 });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      samName: role === "SAM" ? samName! : null,
      mustChangePassword: true,
    },
    select: { id: true, name: true, email: true, role: true, samName: true, mustChangePassword: true, createdAt: true },
  });

  return Response.json({ user }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["ADMIN", "SAM"]).optional(),
  samName: z.string().trim().nullable().optional(),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").optional(),
});

export async function PATCH(req: Request) {
  const { user: admin, error } = await apiAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message || "Dados inválidos." }, { status: 400 });
  }

  const { id, role, samName, password } = parsed.data;
  if (id === admin.id && role === "SAM") {
    return Response.json({ error: "Você não pode remover seu próprio acesso de administrador por aqui." }, { status: 400 });
  }

  const data: {
    role?: "ADMIN" | "SAM";
    samName?: string | null;
    passwordHash?: string;
    mustChangePassword?: boolean;
  } = {};
  if (role !== undefined) data.role = role;
  if (samName !== undefined) data.samName = samName || null;
  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10);
    // Senha foi escolhida pelo admin (reset) — exige troca no próximo login.
    data.mustChangePassword = true;
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, samName: true, mustChangePassword: true, createdAt: true },
  });
  return Response.json({ user: updated });
}
