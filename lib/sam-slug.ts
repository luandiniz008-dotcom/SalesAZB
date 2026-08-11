// Normaliza o nome de um SAM para uso em nomes de arquivo (sem acento,
// espaços viram "_"). Portado do dashboard original.
export function samSlug(sam: string): string {
  return String(sam)
    .normalize("NFD")
    .replace(new RegExp("[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]", "g"), "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}
