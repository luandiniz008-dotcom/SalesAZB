// Confirmação de faturamento — regras portadas do dashboard original.

export type FaturaStatus = "FATURADO" | "NAO_FATURADO" | "FATURADO_PARCIALMENTE";

export type FaturaLineValue = { status: FaturaStatus | null; quantidade: number };

/** Rótulos exibidos ao usuário (os mesmos textos do dashboard original). */
export const FATURA_STATUS_LABEL: Record<FaturaStatus, string> = {
  FATURADO: "Faturado",
  NAO_FATURADO: "Não faturado",
  FATURADO_PARCIALMENTE: "Faturado parcialmente",
};

export const FATURA_STATUS_ORDER: FaturaStatus[] = [
  "FATURADO",
  "NAO_FATURADO",
  "FATURADO_PARCIALMENTE",
];

export function emptyFaturaLine(): FaturaLineValue {
  return { status: null, quantidade: 0 };
}

/**
 * Quantidade considerada "faturada" para uma linha, conforme o status escolhido:
 * Faturado = todo o MM previsto, Não faturado = 0, Parcialmente = a quantidade informada.
 */
export function quantidadeFaturada(
  fatLine: FaturaLineValue | undefined | null,
  mmPrevisto: number
): number {
  if (!fatLine || !fatLine.status) return 0;
  if (fatLine.status === "FATURADO") return mmPrevisto;
  if (fatLine.status === "NAO_FATURADO") return 0;
  return Number(fatLine.quantidade) || 0; // FATURADO_PARCIALMENTE
}
