import { z } from "zod";

export const allowedEmailDomain = (process.env.ALLOWED_EMAIL_DOMAIN || "astrazeneca.com")
  .trim()
  .toLowerCase();

export function isAllowedEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${allowedEmailDomain}`);
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("E-mail inválido.")
  .refine(isAllowedEmail, `Use um e-mail @${allowedEmailDomain}.`);

export const passwordSchema = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.");

// Setup inicial (só roda uma vez, quando ainda não existe nenhum usuário) —
// cria o primeiro administrador. Não tem samName: admin não representa um SAM.
export const setupSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome completo."),
  email: emailSchema,
  password: passwordSchema,
});
export type SetupInput = z.infer<typeof setupSchema>;

// Criação de usuário pelo admin, na tela de Usuários.
export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome completo."),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["ADMIN", "SAM"]).default("SAM"),
  samName: z.string().trim().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;
