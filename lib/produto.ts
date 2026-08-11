// Mapeamento de cada SKU do dashboard para Unidade de Negócio, preço líquido em US$ e o
// "grupo" de produto usado no acompanhamento financeiro (consolida variações de dosagem/
// apresentação do mesmo medicamento em uma única linha, igual à planilha Vendas Públicas).
// Portado 1:1 do dashboard original.

export type ProdutoInfo = { bu: string; netprice: number; grupo: string };

export const PRODUTO_INFO: Record<string, ProdutoInfo> = {
  "CALQUENCE CAP 100MG BL 10X6 EA BR": { bu: "Oncologia", netprice: 3550, grupo: "Calquence" },
  "CALQUENCE TAB 100MG BL 6X10 EA BR": { bu: "Oncologia", netprice: 3550, grupo: "Calquence" },
  "TAGRISSO 40MG 3x10 CPS": { bu: "Oncologia", netprice: 4100, grupo: "Tagrisso" },
  "TAGRISSO 80MG 3x10 CPS": { bu: "Oncologia", netprice: 4100, grupo: "Tagrisso" },
  "IMFINZI 120MG/2.4ML SOL. INJ.": { bu: "Oncologia", netprice: 420, grupo: "Imfinzi 120mg" },
  "IMFINZI 500MG/10ML SOL. INJ.": { bu: "Oncologia", netprice: 1750, grupo: "Imfinzi 500mg" },
  "LYNPARZA TAB 100MG BX 7X8 EA BR": { bu: "Oncologia", netprice: 1830, grupo: "Lynparza" },
  "LYNPARZA TAB 150MG BL 7X8 EA BR": { bu: "Oncologia", netprice: 1830, grupo: "Lynparza" },
  "ZOLADEX LA 10,8MG SS DEPOT X1 (FP UK)": { bu: "Oncologia", netprice: 220, grupo: "Zoladex 10.8" },
  "ZOLADEX 3,6MG SS DEPOT CX 1 (FP UK)": { bu: "Oncologia", netprice: 86, grupo: "Zoladex 3.6" },
  "TRUQAP TAB 160MG BL 4X16 EA BR": { bu: "Oncologia", netprice: 4800, grupo: "Truqap" },
  "TRUQAP TAB 200MG BL 4X16 EA BR": { bu: "Oncologia", netprice: 4800, grupo: "Truqap" },
  "IMJUDO LQD 300MG VI 1X15ML BR": { bu: "Oncologia", netprice: 17900, grupo: "Imjudo 300g" },
  "FASENRA PEN INJ 30MG AI 1X1ML BR": { bu: "R&I", netprice: 1558, grupo: "Fasenra" },
  "FASENRA PFS 30MG/ML X 1ML": { bu: "R&I", netprice: 1558, grupo: "Fasenra" },
  "TEZSPIRE INJ 210MG AI 1X1.91ML BR": { bu: "R&I", netprice: 1042, grupo: "Tezpire" },
  "SAPHNELO LQD 300MG VI 1X2.0ML BR": { bu: "R&I", netprice: 522, grupo: "Saphnelo" },
  "FORXIGA 10MG 3X10 CPS": { bu: "CVRM", netprice: 9, grupo: "Forxiga" },
  "LOKELMA PWD 5G SCHT 1X30 EA BR": { bu: "CVRM", netprice: 200, grupo: "Lokelma" },
  "IRESSA 250MG X 30 COMP": { bu: "Não classificado", netprice: 0, grupo: "Iressa" },
  "SYNAGIS LQD 100MG/ML VI 1X0.5ML BR": { bu: "Não classificado", netprice: 0, grupo: "Synagis" },
  "SYNAGIS LQD 100MG/ML VI 1X1.0ML BR": { bu: "Não classificado", netprice: 0, grupo: "Synagis" },
};

export function produtoInfo(sku: string): ProdutoInfo {
  return PRODUTO_INFO[sku] || { bu: "Não classificado", netprice: 0, grupo: sku };
}

/** Trimestre (Q1 Jan-Mar ... Q4 Out-Dez) a partir de uma competência AAAAMM. */
export function quarterInfo(mes: string): { q: number; meses: string[] } {
  const y = mes.slice(0, 4);
  const m = parseInt(mes.slice(4, 6), 10);
  const q = Math.ceil(m / 3);
  const startMonth = (q - 1) * 3 + 1;
  const meses: string[] = [];
  for (let i = 0; i < 3; i++) meses.push(`${y}${String(startMonth + i).padStart(2, "0")}`);
  return { q, meses };
}

export function grupoSlug(grupo: string): string {
  return String(grupo).toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

/** Grupos de produto na ordem em que aparecem em PRODUTO_INFO (ordem da planilha modelo). */
export function gruposOrdenados(): string[] {
  return [...new Set(Object.values(PRODUTO_INFO).map((p) => p.grupo))];
}
