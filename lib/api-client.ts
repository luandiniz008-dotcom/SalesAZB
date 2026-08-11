// Pequeno helper de fetch para o client: lança um Error com a mensagem que a
// API devolveu (ou uma padrão) quando a resposta não é 2xx.
export async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Erro ${res.status} ao chamar ${url}.`);
  }
  return res.json();
}
