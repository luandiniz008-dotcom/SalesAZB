// Popula o banco com a planilha mestre original e a configuração padrão.
// Rodar com: npx prisma db seed

import "dotenv/config";
import { prisma } from "../lib/prisma";
import { mesAtualPadrao } from "../lib/mes";
import seedData from "./seed-data.json";

type SeedRow = {
  cnpj: string;
  sam: string;
  cliente: string;
  grupo: string;
  uf: string;
  sku: string;
  sap: string;
};

async function main() {
  const rows = seedData as SeedRow[];

  const existing = await prisma.masterRow.count();
  if (existing > 0) {
    console.log(`MasterRow já tem ${existing} linhas — pulando import da planilha mestre.`);
  } else {
    console.log(`Importando ${rows.length} linhas da planilha mestre...`);
    // createMany em lotes para não estourar o limite de parâmetros do Postgres.
    // `ordem` = índice da linha no arquivo original: é o que garante que a
    // planilha exportada saia idêntica, linha a linha, à planilha de origem.
    const chunkSize = 1000;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await prisma.masterRow.createMany({
        data: chunk.map((r, j) => ({
          ordem: i + j,
          cnpj: r.cnpj,
          sam: r.sam,
          cliente: r.cliente,
          grupo: r.grupo || "",
          uf: r.uf,
          sku: r.sku,
          sap: r.sap || "",
        })),
      });
    }
    console.log("Planilha mestre importada.");
  }

  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (!settings) {
    await prisma.appSettings.create({
      data: { id: 1, mesVigente: mesAtualPadrao(), faseAtiva: "SE" },
    });
    console.log("AppSettings padrão criado.");
  } else {
    console.log("AppSettings já existe — mantido.");
  }
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
