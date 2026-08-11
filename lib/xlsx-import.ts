// Parsing da planilha mestre no client (mesma lib SheetJS usada no dashboard
// original) — só o parsing roda no navegador; a gravação acontece via API.
import * as XLSX from "xlsx";

export type ImportedRow = {
  cnpj: string;
  sam: string;
  cliente: string;
  grupo: string;
  uf: string;
  sku: string;
  sap: string;
};

function findHeaderRow(aoa: unknown[][]): number {
  for (let i = 0; i < Math.min(aoa.length, 15); i++) {
    const row = (aoa[i] || []).map((v) => String(v ?? "").trim().toUpperCase());
    if (row.includes("CNPJ") && row.some((v) => v.startsWith("SAM"))) return i;
  }
  return -1;
}

export async function parseMasterFile(file: File): Promise<ImportedRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as unknown[][];

  const headerIdx = findHeaderRow(aoa);
  if (headerIdx === -1) {
    throw new Error("Não encontrei o cabeçalho (CNPJ / SAM). Verifique o arquivo.");
  }
  const header = (aoa[headerIdx] as unknown[]).map((v) => String(v ?? "").trim().toUpperCase());
  const idx = {
    cnpj: header.indexOf("CNPJ"),
    sam: header.findIndex((v) => v.startsWith("SAM")),
    cliente: header.findIndex((v) => v.startsWith("CLIENTE")),
    grupo: header.indexOf("GRUPO"),
    uf: header.indexOf("UF"),
    sku: header.indexOf("SKU"),
    sap: header.indexOf("SAP"),
  };

  const rows: ImportedRow[] = [];
  for (let i = headerIdx + 1; i < aoa.length; i++) {
    const row = aoa[i] as unknown[];
    if (!row || !row[idx.cnpj] || !row[idx.sam]) continue;
    rows.push({
      cnpj: String(row[idx.cnpj]).trim(),
      sam: String(row[idx.sam]).trim(),
      cliente: idx.cliente > -1 ? String(row[idx.cliente] ?? "").trim() : "",
      grupo: idx.grupo > -1 ? String(row[idx.grupo] ?? "").trim() : "",
      uf: idx.uf > -1 ? String(row[idx.uf] ?? "").trim() : "",
      sku: idx.sku > -1 ? String(row[idx.sku] ?? "").trim() : "",
      sap: idx.sap > -1 ? String(row[idx.sap] ?? "").trim() : "",
    });
  }
  if (!rows.length) throw new Error("Nenhuma linha válida encontrada.");
  return rows;
}
