export const RISCOS = ["Baixo", "Médio", "Alto"] as const;
export type Risco = (typeof RISCOS)[number];

// Nome de classe CSS seguro (sem acento) para o valor de risco selecionado.
export function riscoSlug(v: string): string {
  return v === "Médio" ? "Medio" : v;
}

export type ForecastLineValue = { se: number; riscoSE: Risco; mm: number; riscoMM: Risco };

export function emptyLine(): ForecastLineValue {
  return { se: 0, riscoSE: "Médio", mm: 0, riscoMM: "Médio" };
}

export function lineHasData(line: ForecastLineValue | undefined): boolean {
  return !!line && ((line.se || 0) > 0 || (line.mm || 0) > 0);
}

export function rowKeyOf(c: { cnpj: string; sku: string; sap?: string | null }): string {
  return `${c.cnpj}|${c.sku}|${c.sap || ""}`;
}
