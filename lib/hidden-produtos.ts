import { normName } from "./hidden-sams";

// Produtos (SKU) que saíram do escopo do projeto: somem das listas do dashboard
// (lançamento, calibração) e das abas de agregação da planilha (RESUMO, RESUMO
// POR SAM e CONSOLIDADO).
//
// As linhas correspondentes CONTINUAM na aba de dados da planilha final — é o
// que mantém o arquivo idêntico, linha a linha, à planilha mestre importada.
// Mesma lógica já aplicada aos SAMs ocultos em hidden-sams.ts.
const HIDDEN_SKUS = [
  "CALQUENCE CAP 100MG BL 10X6 EA BR",
  "FASENRA PFS 30MG/ML X 1ML",
  "QTERN TAB 5/10MG BL 3X10 CPS",
  "SYNAGIS LQD 100MG/ML VI 1X0.5ML BR",
];

const HIDDEN_SKUS_NORM = new Set(HIDDEN_SKUS.map(normName));

export function isHiddenSku(sku: string): boolean {
  return HIDDEN_SKUS_NORM.has(normName(sku));
}

/** Remove as linhas cujo SKU saiu do escopo (uso: listas e agregações). */
export function filterVisibleSkus<T extends { sku: string }>(rows: T[]): T[] {
  return rows.filter((r) => !isHiddenSku(r.sku));
}

export { HIDDEN_SKUS };
