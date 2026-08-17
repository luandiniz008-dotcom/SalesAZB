// Geração da planilha final — portada do dashboard publicado, que produz
// QUATRO abas com ExcelJS:
//   1. <AAAAMM>        — dados linha a linha, na ordem exata da planilha mestre
//   2. RESUMO          — consolidado por SKU (geral e por estado)
//   3. RESUMO POR SAM  — o mesmo, quebrado por SAM
//   4. CONSOLIDADO     — visão financeira trimestral estilizada (Vendas Públicas)
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { rowKey as buildRowKey, mesLabel } from "@/lib/mes";
import { PRODUTO_INFO, gruposOrdenados, quarterInfo, produtoInfo } from "@/lib/produto";
import { quantidadeFaturada, type FaturaLineValue } from "@/lib/faturamento";

export type MasterRowLite = {
  cnpj: string;
  sam: string;
  cliente: string;
  grupo: string;
  uf: string;
  sku: string;
  sap: string;
};

export type ForecastLineValue = { se: number; riscoSE: string; mm: number; riscoMM: string };

const EMPTY_LINE: ForecastLineValue = { se: 0, riscoSE: "Médio", mm: 0, riscoMM: "Médio" };

export type MesData = {
  forecast: Map<string, Map<string, ForecastLineValue>>;
  faturamento: Map<string, Map<string, FaturaLineValue>>;
  // "A faturar" (calibração) agregado por GRUPO de produto. Vem por grupo, e não
  // por linha da planilha mestre, porque a calibração aceita pedidos manuais —
  // contas que não existem na mestre. O elo com o grupo é sempre o SKU.
  aFaturarPorGrupo: Map<string, number>;
};

/**
 * Carrega previsão + confirmação de faturamento de um mês, para todos os SAMs.
 * O original fazia uma chamada por SAM (com sleep para não estourar o limite do
 * storage do Claude); aqui é uma query só por tabela, então some a lentidão.
 */
export async function loadMesData(mes: string): Promise<MesData> {
  const [linhas, faturas, calibracoes] = await Promise.all([
    prisma.forecastLine.findMany({ where: { mes } }),
    prisma.faturamentoLine.findMany({ where: { mes } }),
    prisma.calibracaoLine.findMany({ where: { mes }, select: { sku: true, quantidade: true } }),
  ]);

  const forecast = new Map<string, Map<string, ForecastLineValue>>();
  for (const l of linhas) {
    if (!forecast.has(l.sam)) forecast.set(l.sam, new Map());
    forecast.get(l.sam)!.set(l.rowKey, {
      se: l.se,
      riscoSE: l.riscoSE,
      mm: l.mm,
      riscoMM: l.riscoMM,
    });
  }

  const faturamento = new Map<string, Map<string, FaturaLineValue>>();
  for (const f of faturas) {
    if (!faturamento.has(f.sam)) faturamento.set(f.sam, new Map());
    faturamento.get(f.sam)!.set(f.rowKey, { status: f.status, quantidade: f.quantidade });
  }

  const aFaturarPorGrupo = new Map<string, number>();
  for (const c of calibracoes) {
    const grupo = produtoInfo(c.sku).grupo;
    aFaturarPorGrupo.set(grupo, (aFaturarPorGrupo.get(grupo) ?? 0) + (c.quantidade || 0));
  }

  return { forecast, faturamento, aFaturarPorGrupo };
}

function lineOf(data: MesData, r: MasterRowLite): ForecastLineValue {
  return data.forecast.get(r.sam)?.get(buildRowKey(r)) ?? EMPTY_LINE;
}
function fatOf(data: MesData, r: MasterRowLite): FaturaLineValue | undefined {
  return data.faturamento.get(r.sam)?.get(buildRowKey(r));
}

/** Soma SE / MM / FATURADO (em unidades) para um conjunto de linhas da planilha. */
function totais(rows: MasterRowLite[], data: MesData) {
  let se = 0,
    mm = 0,
    fat = 0;
  for (const r of rows) {
    const line = lineOf(data, r);
    se += line.se || 0;
    mm += line.mm || 0;
    fat += quantidadeFaturada(fatOf(data, r), line.mm || 0);
  }
  return { se, mm, fat };
}

/* ---------------- ABA 1: DADOS ---------------- */

export function buildDadosRows(masterRows: MasterRowLite[], mes: string, data: MesData) {
  const rows: (string | number)[][] = [];
  rows.push(["CNPJ", "SAM/KAM", "Cliente Conta", "Grupo", "UF", "SKU", "SAP", "Faturado", "SE", "Risco SE", "MM", "Risco MM"]);
  rows.push([
    "", "", "", "", "", "", "",
    `Faturado_${mes}`, `SE_${mes}`, `Risco SE_${mes}`, `MM_${mes}`, `Risco MM_${mes}`,
  ]);

  for (const r of masterRows) {
    const line = lineOf(data, r);
    rows.push([
      r.cnpj, r.sam, r.cliente, r.grupo || "", r.uf, r.sku, r.sap,
      line.se, line.se, line.riscoSE, line.mm, line.riscoMM,
    ]);
  }
  return rows;
}

/* ---------------- ABA 2: RESUMO ---------------- */

export function buildResumoRows(masterRows: MasterRowLite[], mes: string, data: MesData) {
  const skus = [...new Set(masterRows.map((r) => r.sku))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const ufs = [...new Set(masterRows.map((r) => r.uf))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  const out: (string | number)[][] = [];
  out.push(["FORECAST POR ESTADO", "", "", ""]);
  out.push([`Competência: ${mesLabel(mes)} (${mes})`, "", "", ""]);
  out.push(["", "", "", ""]);
  out.push(["Estado:", "Todos", "", ""]);
  out.push(["", "", "", ""]);
  out.push(["CONSOLIDADO GERAL — TODOS OS ESTADOS", "", "", ""]);
  out.push(["SKU", "SE (previsão inicial)", "MM (ajuste dia 15)", "FATURADO (confirmado)"]);
  for (const sku of skus) {
    const t = totais(masterRows.filter((r) => r.sku === sku), data);
    out.push([sku, t.se, t.mm, t.fat]);
  }
  out.push(["", "", "", ""]);
  out.push(["CONSOLIDADO POR ESTADO", "", "", ""]);
  out.push(["SKU", "UF", "SE (previsão inicial)", "MM (ajuste dia 15)", "FATURADO (confirmado)"]);
  for (const sku of skus) {
    for (const uf of ufs) {
      // estado sem conta cadastrada para o SKU sai zerado (igual ao original)
      const t = totais(masterRows.filter((r) => r.sku === sku && r.uf === uf), data);
      out.push([sku, uf, t.se, t.mm, t.fat]);
    }
  }
  return out;
}

/* ---------------- ABA 3: RESUMO POR SAM ---------------- */

export function buildResumoPorSamRows(masterRows: MasterRowLite[], mes: string, data: MesData) {
  const samsOrdenados = [...new Set(masterRows.map((r) => r.sam))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  const out: (string | number)[][] = [];
  out.push(["RESUMO POR SAM", "", "", "", "", ""]);
  out.push([`Competência: ${mesLabel(mes)} (${mes})`, "", "", "", "", ""]);
  out.push(["", "", "", "", "", ""]);
  out.push(["SAM", "SKU", "UF", "SE (previsão inicial)", "MM (ajuste dia 15)", "FATURADO (confirmado)"]);

  for (const sam of samsOrdenados) {
    const rowsDoSam = masterRows.filter((r) => r.sam === sam);
    const skusDoSam = [...new Set(rowsDoSam.map((r) => r.sku))].sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
    for (const sku of skusDoSam) {
      const ufsDoSkuSam = [...new Set(rowsDoSam.filter((r) => r.sku === sku).map((r) => r.uf))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
      for (const uf of ufsDoSkuSam) {
        const t = totais(rowsDoSam.filter((r) => r.sku === sku && r.uf === uf), data);
        out.push([sam, sku, uf, t.se, t.mm, t.fat]);
      }
    }
  }
  return out;
}

/* ---------------- ABA 4: CONSOLIDADO (estilizada) ---------------- */

/** Soma SE / MM / FATURADO de um grupo de produto (que agrega várias SKUs). */
function totaisGrupo(grupo: string, masterRows: MasterRowLite[], data: MesData) {
  const skusDoGrupo = Object.keys(PRODUTO_INFO).filter((sku) => PRODUTO_INFO[sku].grupo === grupo);
  return totais(masterRows.filter((r) => skusDoGrupo.includes(r.sku)), data);
}

/** Converte número de coluna (1-based) na letra do Excel (1->A, 27->AA...). */
function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const COR = {
  bu: "FFC3C9CF", netprice: "FFD1D1D1", produto: "FFDCEDD5",
  budget: "FFE7E9EC", rbu2: "FFE7E9EC", se: "FFD1D1D1", mm: "FFECD5E9",
  totalEmCasa: "FFDCEDD5", aFaturar: "FFDCEDD5", faturado: "FFDCEDD5",
  amarelo: "FFFFFF00", branco: "FFFFFFFF", editavel: "FFFFFDE7",
};
const FONTE_BASE = { name: "Aptos Narrow", size: 11 };
const NUMFMT = '_-* #,##0_-;\\-* #,##0_-;_-* "-"??_-;_-@_-';
const FINA = { style: "thin" as const, color: { argb: "FFBFBFBF" } };
const BORDA = { top: FINA, left: FINA, bottom: FINA, right: FINA };

type CellOpts = {
  font?: Partial<ExcelJS.Font>;
  fill?: string;
  alignment?: Partial<ExcelJS.Alignment>;
  numFmt?: string;
  noBorder?: boolean;
};

/**
 * Escreve a aba CONSOLIDADO replicando cores, fonte e formatação de número da
 * planilha "Vendas Públicas": Budget/RBU2 em azul-acinzentado claro, Previsão SE
 * em cinza, Previsão MM em rosa claro, Total em casa/A faturar/Faturado em verde
 * claro, cabeçalho do mês e linha de TOTAL em amarelo.
 *
 * Budget, RBU2 e "A faturar" ficam em branco (fundo amarelo claro) para o time
 * preencher manualmente no Excel; as colunas U$ e "Total em casa" são fórmulas.
 */
export function writeConsolidadoSheet(
  workbook: ExcelJS.Workbook,
  mesReferencia: string,
  masterRows: MasterRowLite[],
  dadosPorMes: Record<string, MesData>
) {
  const { q, meses } = quarterInfo(mesReferencia);
  const grupos = gruposOrdenados();
  const ws = workbook.addWorksheet("CONSOLIDADO");

  function setCell(row: number, col: number, value: ExcelJS.CellValue, opts: CellOpts = {}) {
    const cell = ws.getCell(row, col);
    cell.value = value;
    cell.font = Object.assign({}, FONTE_BASE, opts.font);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fill || COR.branco } };
    cell.alignment = Object.assign({ vertical: "middle", horizontal: "center" }, opts.alignment);
    if (!opts.noBorder) cell.border = BORDA;
    if (opts.numFmt) cell.numFmt = opts.numFmt;
    return cell;
  }

  const metaCols = 3; // BU, NETPRICE, Produtos
  const metrics = [
    { key: "budget", label: "Budget", color: COR.budget, manual: true },
    { key: "rbu2", label: "RBU2", color: COR.rbu2, manual: true },
    { key: "se", label: "Previsão SE", color: COR.se, manual: false },
    { key: "mm", label: "Previsão MM", color: COR.mm, manual: false },
    { key: "totalEmCasa", label: "Total em casa", color: COR.totalEmCasa, manual: false, formula: true },
    // "A faturar" vem da etapa de Calibração (pedidos em casa ainda não
    // faturados) — deixou de ser preenchimento manual na planilha.
    { key: "aFaturar", label: "A faturar", color: COR.aFaturar, manual: false },
    { key: "faturado", label: "Faturado", color: COR.faturado, manual: false },
  ] as const;

  setCell(1, 1, "CONSOLIDADO", {
    font: { name: "Aptos Narrow", size: 14, bold: true },
    alignment: { horizontal: "left" },
    fill: COR.branco,
  });
  setCell(2, 1, `Trimestre: Q${q} — ${meses.map((m) => mesLabel(m)).join(" / ")}`, {
    font: { bold: true },
    alignment: { horizontal: "left" },
    fill: COR.branco,
  });

  const HR1 = 4, HR2 = 5, HR3 = 6, DATA0 = 7;
  const nomesMeses: Record<number, string> = {
    1: "JANEIRO", 2: "FEVEREIRO", 3: "MARÇO", 4: "ABRIL", 5: "MAIO", 6: "JUNHO",
    7: "JULHO", 8: "AGOSTO", 9: "SETEMBRO", 10: "OUTUBRO", 11: "NOVEMBRO", 12: "DEZEMBRO",
  };

  ws.mergeCells(HR1, 1, HR3, 1);
  setCell(HR1, 1, "BU", { fill: COR.bu, font: { bold: true } });
  ws.mergeCells(HR1, 2, HR3, 2);
  setCell(HR1, 2, "NETPRICE U$", { fill: COR.netprice, font: { bold: true } });
  ws.mergeCells(HR1, 3, HR3, 3);
  setCell(HR1, 3, "Produtos", { fill: COR.produto, font: { bold: true } });

  let col = metaCols + 1;
  for (const mes of meses) {
    const mNum = parseInt(mes.slice(4, 6), 10);
    const inicioMes = col;
    for (const m of metrics) {
      ws.mergeCells(HR2, col, HR2, col + 1);
      setCell(HR2, col, m.label + (m.manual ? " (manual)" : ""), { fill: m.color, font: { bold: true } });
      setCell(HR3, col, "Und", { fill: m.color, font: { bold: true } });
      setCell(HR3, col + 1, "U$", { fill: m.color, font: { bold: true } });
      col += 2;
    }
    ws.mergeCells(HR2, col, HR3, col);
    setCell(HR2, col, "Comentários", { fill: COR.branco, font: { bold: true } });
    col += 1;
    ws.mergeCells(HR1, inicioMes, HR1, col - 1);
    setCell(HR1, inicioMes, nomesMeses[mNum], { fill: COR.amarelo, font: { bold: true, size: 12 } });
  }

  let r = DATA0;
  for (const grupo of grupos) {
    const skuRef = Object.keys(PRODUTO_INFO).find((sku) => PRODUTO_INFO[sku].grupo === grupo);
    const info = (skuRef && PRODUTO_INFO[skuRef]) || { bu: "Não classificado", netprice: 0 };
    const preco = info.netprice || 0;
    const precoAddr = `$${colLetter(2)}$${r}`;
    setCell(r, 1, info.bu, { fill: COR.branco, alignment: { horizontal: "left" } });
    setCell(r, 2, preco, { fill: COR.branco, numFmt: "#,##0" });
    setCell(r, 3, grupo, { fill: COR.branco, alignment: { horizontal: "left" }, font: { bold: true } });

    let c = metaCols + 1;

    for (const mes of meses) {
      const data = dadosPorMes[mes];
      const t = totaisGrupo(grupo, masterRows, data);
      const autoValores: Record<string, number> = {
        se: t.se,
        mm: t.mm,
        faturado: t.fat,
        aFaturar: data.aFaturarPorGrupo.get(grupo) ?? 0,
      };

      // Endereços das células "Und" deste mês, calculados ANTES de escrever as
      // células. O dashboard original resolvia isso dentro do próprio laço, mas
      // "Total em casa" vem antes de "A faturar"/"Faturado" na ordem das métricas
      // — então a fórmula saía como `=null+null` (erro #NAME? no Excel) no 1º mês
      // e apontando para o mês anterior nos demais. Aqui ela sempre referencia as
      // células corretas do mesmo mês.
      const undAddrDe = (key: string) => {
        const idx = metrics.findIndex((m) => m.key === key);
        return `${colLetter(c + idx * 2)}${r}`;
      };
      const aFaturarUndAddr = undAddrDe("aFaturar");
      const faturadoUndAddr = undAddrDe("faturado");

      for (const m of metrics) {
        const undAddr = `${colLetter(c)}${r}`;

        if (m.manual) {
          // Budget / RBU2 / A faturar: em branco para preenchimento manual;
          // a coluna U$ calcula sozinha quando alguém digitar a quantidade.
          setCell(r, c, null, { fill: COR.editavel, numFmt: NUMFMT });
          setCell(r, c + 1, { formula: `${undAddr}*${precoAddr}` }, { fill: m.color, numFmt: NUMFMT });
        } else if (m.key === "totalEmCasa") {
          // Total em casa = A faturar + Faturado (fórmula, sempre atualizada)
          setCell(r, c, { formula: `${aFaturarUndAddr}+${faturadoUndAddr}` }, { fill: m.color, numFmt: NUMFMT });
          setCell(r, c + 1, { formula: `${undAddr}*${precoAddr}` }, { fill: m.color, numFmt: NUMFMT });
        } else {
          setCell(r, c, autoValores[m.key], { fill: m.color, numFmt: NUMFMT });
          setCell(r, c + 1, { formula: `${undAddr}*${precoAddr}` }, { fill: m.color, numFmt: NUMFMT });
        }
        c += 2;
      }
      setCell(r, c, "", { fill: COR.editavel, alignment: { horizontal: "left" } });
      c += 1;
    }
    r++;
  }
  const lastDataRow = r - 1;

  setCell(r, 1, "TOTAL", { fill: COR.amarelo, font: { bold: true } });
  setCell(r, 2, null, { fill: COR.amarelo });
  setCell(r, 3, null, { fill: COR.amarelo });
  let c = metaCols + 1;
  for (const _mes of meses) {
    void _mes;
    for (const _m of metrics) {
      void _m;
      setCell(r, c, null, { fill: COR.amarelo });
      const colU = colLetter(c + 1);
      setCell(r, c + 1, { formula: `SUM(${colU}${DATA0}:${colU}${lastDataRow})` }, {
        fill: COR.amarelo,
        numFmt: NUMFMT,
        font: { bold: true },
      });
      c += 2;
    }
    setCell(r, c, null, { fill: COR.amarelo });
    c += 1;
  }
  r += 2;
  setCell(
    r,
    1,
    "Budget e RBU2 (fundo amarelo claro) são preenchidos manualmente aqui na planilha. SE, MM, A faturar e Faturado vêm do dashboard: SE/MM da previsão dos SAMs, A faturar da calibração (pedidos em casa ainda não faturados) e Faturado da confirmação de faturamento. Total em casa e as colunas U$ calculam sozinhas por fórmula.",
    { fill: COR.branco, font: { italic: true, size: 9 }, alignment: { horizontal: "left" }, noBorder: true }
  );

  ws.getColumn(1).width = 16;
  ws.getColumn(2).width = 13;
  ws.getColumn(3).width = 20;
  for (let cc = metaCols + 1; cc < col; cc++) ws.getColumn(cc).width = 12;

  return ws;
}

/* ---------------- MONTAGEM DO ARQUIVO ---------------- */

/** Aba "simples" (sem estilo especial), usada para dados/RESUMO/RESUMO POR SAM. */
function addPlainSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  rows: (string | number)[][],
  colWidths?: number[]
) {
  const ws = workbook.addWorksheet(name.substring(0, 31));
  rows.forEach((r) => ws.addRow(r));
  if (colWidths) ws.columns = colWidths.map((w) => ({ width: w }));
  ws.getRow(1).font = { bold: true };
  return ws;
}

/** Monta o workbook completo (4 abas) do relatório do mês. */
export async function buildRelatorioWorkbook(
  mes: string,
  masterRows: MasterRowLite[]
): Promise<Buffer> {
  const { meses } = quarterInfo(mes);

  // O CONSOLIDADO precisa dos 3 meses do trimestre; o mês vigente é reaproveitado.
  const dadosPorMes: Record<string, MesData> = {};
  const mesesNecessarios = [...new Set([mes, ...meses])];
  await Promise.all(
    mesesNecessarios.map(async (m) => {
      dadosPorMes[m] = await loadMesData(m);
    })
  );
  const data = dadosPorMes[mes];

  const workbook = new ExcelJS.Workbook();

  addPlainSheet(workbook, mes.slice(0, 31), buildDadosRows(masterRows, mes, data), [18, 26, 34, 10, 6, 32, 20, 11, 11, 11, 11, 11]);
  addPlainSheet(workbook, "RESUMO", buildResumoRows(masterRows, mes, data), [34, 8, 20, 20, 20]);
  addPlainSheet(workbook, "RESUMO POR SAM", buildResumoPorSamRows(masterRows, mes, data), [26, 34, 8, 20, 20, 20]);
  writeConsolidadoSheet(workbook, mes, masterRows, dadosPorMes);

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/** Planilha preliminar de um SAM: só a aba de dados das linhas dele. */
export async function buildPreliminarWorkbook(
  mes: string,
  masterRows: MasterRowLite[]
): Promise<Buffer> {
  const data = await loadMesData(mes);
  const workbook = new ExcelJS.Workbook();
  addPlainSheet(workbook, mes.slice(0, 31), buildDadosRows(masterRows, mes, data), [18, 26, 34, 10, 6, 32, 20, 11, 11, 11, 11, 11]);
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
