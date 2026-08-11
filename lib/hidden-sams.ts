// SAMs que ficam ocultos do dashboard (seleção, cadastro, painel consolidado
// etc.), mas cujas contas/produtos continuam aparecendo normalmente na
// planilha final exportada. Regra herdada do dashboard original.
const HIDDEN_SAMS = [
  "FELIPE MARQUES BREDERODE",
  "FERNANDO OLIVEIRA",
  "MANUELA ROCHA",
  "MARCIA TOLOTTI",
  "YURI FILGUEIRA",
];

// Faixa Unicode dos diacríticos combinantes (U+0300-U+036F), construída via
// codepoints para evitar problemas de encoding de escape em algumas toolchains.
const COMBINING_MARKS = new RegExp(
  "[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]",
  "g"
);

export function normName(s: string): string {
  return String(s).toUpperCase().trim().normalize("NFD").replace(COMBINING_MARKS, "");
}

const HIDDEN_SAMS_NORM = new Set(HIDDEN_SAMS.map(normName));

export function isHiddenSam(sam: string): boolean {
  return HIDDEN_SAMS_NORM.has(normName(sam));
}

export function filterVisibleSams<T extends { sam: string }>(rows: T[]): T[] {
  return rows.filter((r) => !isHiddenSam(r.sam));
}
