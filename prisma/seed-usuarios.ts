// Cria/atualiza as contas de acesso do dashboard e zera os pedidos, deixando
// o ambiente pronto para uso. Rodar com: npm run db:seed-usuarios
//
// A senha inicial é provisória: no primeiro login o próprio usuário define a
// senha dele (mustChangePassword).

import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

const SENHA_INICIAL = "teste";

type Conta = { nome: string; email: string; role: "ADMIN" | "SAM"; samName?: string };

const CONTAS: Conta[] = [
  { nome: "Adalberto de Souza Oliveira", email: "adalberto.oliveira@astrazeneca.com", role: "SAM", samName: "ADALBERTO DE SOUZA OLIVEIRA" },
  { nome: "Adriano da Rosa Araujo", email: "adriano.araujo@astrazeneca.com", role: "ADMIN" },
  { nome: "Fernanda Santanna", email: "fernanda.santanna@astrazeneca.com", role: "SAM", samName: "FERNANDA SANTANNA" },
  { nome: "Karla Casado", email: "karla.casado@astrazeneca.com", role: "SAM", samName: "KARLA CASADO" },
  { nome: "Lis Regina Nicodemos", email: "lisregina.nicodemos@astrazeneca.com", role: "SAM", samName: "LIS REGINA NICODEMOS" },
  { nome: "Marcus Cavalcanti", email: "marcus.cavalcanti@astrazeneca.com", role: "ADMIN" },
  { nome: "Susane Tonelli", email: "susane.tonelli@astrazeneca.com", role: "SAM", samName: "SUSANE TONELLI" },
  { nome: "Cintia Dias", email: "cintia.dias@astrazeneca.com", role: "ADMIN" },
];

async function main() {
  const passwordHash = await bcrypt.hash(SENHA_INICIAL, 10);

  for (const c of CONTAS) {
    // Confere que o SAM informado existe mesmo na planilha mestre — evita
    // criar uma conta que não conseguiria lançar nada.
    if (c.role === "SAM") {
      const existe = await prisma.masterRow.findFirst({ where: { sam: c.samName } });
      if (!existe) {
        console.warn(`  ! ${c.email}: SAM "${c.samName}" não existe na planilha mestre — conta criada sem vínculo.`);
      }
    }

    const email = c.email.trim().toLowerCase();
    await prisma.user.upsert({
      where: { email },
      create: {
        name: c.nome,
        email,
        passwordHash,
        role: c.role,
        samName: c.role === "SAM" ? c.samName! : null,
        mustChangePassword: true,
      },
      update: {
        name: c.nome,
        passwordHash,
        role: c.role,
        samName: c.role === "SAM" ? c.samName! : null,
        mustChangePassword: true,
      },
    });
    console.log(`  ${c.role === "ADMIN" ? "ADMIN" : "SAM  "}  ${email}${c.samName ? `  →  ${c.samName}` : ""}`);
  }

  console.log(`\n${CONTAS.length} contas prontas (senha inicial: "${SENHA_INICIAL}", troca obrigatória no 1º login).`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
