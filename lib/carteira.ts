// Quais produtos cada SAM realmente atende.
//
// Na maioria dos casos isso já vem da própria planilha mestre: o SAM só enxerga
// os medicamentos que existem na carteira dele. Susane e Régis se encaixam aqui,
// porque a carteira dos dois foi de fato dividida na planilha.
//
// Fernanda e Adriano são diferentes: a carteira deles na planilha tem todos os
// produtos, mas na prática cada um trabalha só uma linha —  a Fernanda a mesma
// da Susane (R&I/CVRM) e o Adriano a mesma do Régis (oncologia e demais). Para
// esses, a restrição precisa ser explícita.
//
// Isto é um filtro de EXIBIÇÃO: nenhuma linha sai da planilha mestre, e a aba de
// dados continua com as 3629 linhas na ordem original. As linhas de produtos que
// o SAM não atende simplesmente saem zeradas.

/** Linha de produtos da Susane (a mesma que a Fernanda atende). */
const PRODUTOS_LINHA_SUSANE = ["FASENRA", "FORXIGA", "LOKELMA", "SAPHNELO", "TEZSPIRE"];

export function ehProdutoLinhaSusane(sku: string): boolean {
  const s = sku.toUpperCase();
  return PRODUTOS_LINHA_SUSANE.some((p) => s.startsWith(p));
}

type Linha = "LINHA_SUSANE" | "LINHA_REGIS";

/**
 * SAMs cuja carteira na planilha mestre é mais ampla do que a linha que eles
 * atendem. Quem não estiver aqui trabalha com tudo o que houver na carteira.
 */
const RESTRICAO_POR_SAM: Record<string, Linha> = {
  "FERNANDA SANTANNA": "LINHA_SUSANE",
  "ADRIANO DA ROSA ARAUJO": "LINHA_REGIS",
};

/** O SAM atende esse produto? */
export function samAtendeProduto(sam: string, sku: string): boolean {
  const linha = RESTRICAO_POR_SAM[sam];
  if (!linha) return true;
  return linha === "LINHA_SUSANE" ? ehProdutoLinhaSusane(sku) : !ehProdutoLinhaSusane(sku);
}

/** Filtra uma lista de linhas da mestre pelos produtos que o SAM atende. */
export function filtrarProdutosDoSam<T extends { sku: string }>(sam: string, rows: T[]): T[] {
  if (!RESTRICAO_POR_SAM[sam]) return rows;
  return rows.filter((r) => samAtendeProduto(sam, r.sku));
}
