// Calibração — pedidos já colocados ("em casa") que ainda não foram faturados.
// Etapa contínua: fica aberta o mês inteiro, sem conclusão e sem travar
// relatório. A soma alimenta a coluna "A faturar" da aba CONSOLIDADO.

export type CalibracaoLinha = {
  rowKey: string;
  sku: string;
  cliente: string;
  uf: string;
  manual: boolean;
  quantidade: number;
};

/** Prefixo dos pedidos manuais — não existem na planilha mestre. */
export const MANUAL_PREFIX = "manual:";

export function isManualRowKey(rowKey: string): boolean {
  return rowKey.startsWith(MANUAL_PREFIX);
}

/** Gera um rowKey único para um pedido manual novo (usado no client). */
export function novoManualRowKey(): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${MANUAL_PREFIX}${rnd}`;
}
