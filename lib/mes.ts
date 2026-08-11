// Helpers de competência (mês YYYYMM), portados do dashboard original.

export function mesLabel(yyyymm: string): string {
  const y = yyyymm.slice(0, 4);
  const m = parseInt(yyyymm.slice(4, 6), 10);
  const nomes = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${nomes[m - 1]}/${y}`;
}

// Gera as opções de mês disponíveis: do mês anterior até 11 meses à frente
// do mês calendário atual (índice 1 = mês atual).
export function buildMesOptions(): string[] {
  const opts: string[] = [];
  const now = new Date();
  for (let i = -1; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    opts.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return opts;
}

export function mesAtualPadrao(): string {
  return buildMesOptions()[1];
}

export function rowKey(r: { cnpj: string; sku: string; sap?: string | null }): string {
  return `${r.cnpj}|${r.sku}|${r.sap || ""}`;
}
