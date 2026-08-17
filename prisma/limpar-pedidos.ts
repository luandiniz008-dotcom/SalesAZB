// Zera todos os lançamentos do dashboard (previsões, status, faturamento,
// calibração e planilhas geradas), deixando o ambiente pronto para uso.
//
// NÃO toca na planilha mestre, nas configurações nem nos usuários.
// Rodar com: npm run db:limpar-pedidos

import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const [forecast, status, fatura, faturaStatus, calibracao, arquivos] = await prisma.$transaction([
    prisma.forecastLine.deleteMany({}),
    prisma.forecastStatus.deleteMany({}),
    prisma.faturamentoLine.deleteMany({}),
    prisma.faturamentoStatus.deleteMany({}),
    prisma.calibracaoLine.deleteMany({}),
    prisma.generatedFile.deleteMany({}),
  ]);

  console.log("Removidos:");
  console.log(`  previsões (SE/MM):        ${forecast.count}`);
  console.log(`  status de previsão:       ${status.count}`);
  console.log(`  faturamento:              ${fatura.count}`);
  console.log(`  status de faturamento:    ${faturaStatus.count}`);
  console.log(`  calibração:               ${calibracao.count}`);
  console.log(`  planilhas geradas:        ${arquivos.count}`);

  console.log("\nPreservado:");
  console.log(`  linhas da planilha mestre: ${await prisma.masterRow.count()}`);
  console.log(`  usuários:                  ${await prisma.user.count()}`);
  const cfg = await prisma.appSettings.findUnique({ where: { id: 1 } });
  console.log(`  configuração:              mês ${cfg?.mesVigente ?? "—"}, etapa ${cfg?.faseAtiva ?? "—"}`);
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
