// Divide a carteira de SUSANE TONELLI entre ela e RÉGIS GOMES.
//
// As contas são as MESMAS (mesmos 30 clientes) — o que separa os dois é o
// produto: a Susane lança a previsão de Fasenra, Lokelma, Saphnelo, Tezspire e
// Forxiga; todo o restante passa a ser do Régis.
//
// Só o campo `sam` das linhas muda. A coluna `ordem` é preservada, então a aba
// de dados da planilha final continua idêntica, linha a linha, à mestre.
//
// Idempotente: depois da primeira execução a Susane já só tem os produtos dela,
// então rodar de novo não altera nada.
//
// Rodar com: npm run db:dividir-carteira

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";

const SUSANE = "SUSANE TONELLI";
const REGIS = "RÉGIS GOMES";

/** Produtos que continuam com a Susane (comparado pelo início do nome do SKU). */
const PRODUTOS_SUSANE = ["FASENRA", "LOKELMA", "SAPHNELO", "TEZSPIRE", "FORXIGA"];

function ficaComSusane(sku: string): boolean {
  const s = sku.toUpperCase();
  return PRODUTOS_SUSANE.some((p) => s.startsWith(p));
}

type SeedRow = { cnpj: string; sam: string; cliente: string; grupo: string; uf: string; sku: string; sap: string };

function atualizarSeed(): { movidas: number; total: number } {
  const arquivo = path.join(process.cwd(), "prisma", "seed-data.json");
  const dados: SeedRow[] = JSON.parse(fs.readFileSync(arquivo, "utf8"));
  let movidas = 0;
  for (const r of dados) {
    if (r.sam === SUSANE && !ficaComSusane(r.sku)) {
      r.sam = REGIS;
      movidas++;
    }
  }
  if (movidas) fs.writeFileSync(arquivo, JSON.stringify(dados), "utf8");
  return { movidas, total: dados.length };
}

async function main() {
  // 1) seed-data.json — para que uma instalação nova já nasça com a divisão
  const seed = atualizarSeed();
  console.log(`seed-data.json: ${seed.movidas} linhas movidas para ${REGIS} (de ${seed.total})`);

  // 2) banco em uso
  const daSusane = await prisma.masterRow.findMany({
    where: { sam: SUSANE },
    select: { id: true, sku: true },
  });
  const mover = daSusane.filter((r) => !ficaComSusane(r.sku)).map((r) => r.id);

  if (mover.length) {
    // em lotes, para não estourar o limite de parâmetros do Postgres
    const lote = 500;
    for (let i = 0; i < mover.length; i += lote) {
      await prisma.masterRow.updateMany({
        where: { id: { in: mover.slice(i, i + lote) } },
        data: { sam: REGIS },
      });
    }
  }
  console.log(`banco: ${mover.length} linhas movidas para ${REGIS}`);

  const [nSusane, nRegis] = await Promise.all([
    prisma.masterRow.count({ where: { sam: SUSANE } }),
    prisma.masterRow.count({ where: { sam: REGIS } }),
  ]);
  console.log(`\nResultado — ${SUSANE}: ${nSusane} linhas | ${REGIS}: ${nRegis} linhas`);
  console.log(`Total da planilha mestre: ${await prisma.masterRow.count()} (deve continuar 3629)`);
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
