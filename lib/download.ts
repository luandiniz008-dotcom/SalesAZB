// Baixa uma URL como arquivo via Blob, mostrando o erro (via toast) em vez de
// navegar para uma página de erro quando a resposta não é 2xx (ex.: gate do
// relatório MM).
export async function downloadFile(url: string, onError: (msg: string) => void): Promise<boolean> {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    onError(data?.error || `Erro ${res.status} ao gerar o arquivo.`);
    return false;
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const match = /filename="(.+?)"/.exec(cd);
  const filename = match ? match[1] : "relatorio.xlsx";

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return true;
}
