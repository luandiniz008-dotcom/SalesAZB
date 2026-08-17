"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { buildMesOptions, mesLabel } from "@/lib/mes";
import { parseMasterFile } from "@/lib/xlsx-import";
import { useConfig } from "@/components/ConfigContext";
import { useToast } from "@/components/ToastProvider";

type Counts = {
  samCount: number;
  skuCount: number;
  rowCount: number;
  totalSamsAll: number;
  totalRowsAll: number;
  hiddenPresentes: string[];
  skusOcultos: string[];
};

export function ConfigView() {
  const { config, refresh } = useConfig();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mesSelecionado, setMesSelecionado] = useState(config.mesVigente);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [importing, setImporting] = useState(false);

  async function loadCounts() {
    const c = await apiFetch<Counts>("/api/master/counts");
    setCounts(c);
  }
  // Carga inicial: sincroniza o estado local com o servidor (sistema externo).
  // O setState real acontece depois do await, dentro da função de carga.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCounts();
  }, []);

  async function salvarMesVigente() {
    const novo = await apiFetch<{ mesVigente: string }>("/api/config", {
      method: "PATCH",
      body: JSON.stringify({ mesVigente: mesSelecionado }),
    });
    await refresh();
    // Realinha o select com o que o servidor confirmou (em vez de um efeito
    // reagindo a config.mesVigente, que geraria render em cascata).
    setMesSelecionado(novo.mesVigente);
    toast(`Mês vigente definido para ${mesLabel(novo.mesVigente)}. Todos os SAMs agora previsionam este mês.`);
  }

  async function mudarFase(fase: "SE" | "MM") {
    await apiFetch("/api/config", { method: "PATCH", body: JSON.stringify({ faseAtiva: fase }) });
    await refresh();
    toast(
      fase === "SE"
        ? "Etapa SE liberada para todos os SAMs. O campo MM foi bloqueado."
        : "Etapa MM liberada para todos os SAMs (ajuste do dia 15)."
    );
  }

  async function handleImportar() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast("Selecione um arquivo .xlsx primeiro.");
      return;
    }
    setImporting(true);
    try {
      toast("Importando planilha mestre...");
      const rows = await parseMasterFile(file);
      const res = await apiFetch<{ rowCount: number; samCount: number }>("/api/master/import", {
        method: "POST",
        body: JSON.stringify({ rows }),
      });
      toast(`Planilha mestre importada: ${res.rowCount} linhas, ${res.samCount} SAMs.`);
      if (fileRef.current) fileRef.current.value = "";
      await loadCounts();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao importar planilha.");
    } finally {
      setImporting(false);
    }
  }

  const mesOptions = buildMesOptions();

  return (
    <section>
      <div className="top-row">
        <div>
          <h1>Configurações</h1>
          <div className="sub">Área do administrador: mês vigente e planilha mestre.</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-soft)", marginBottom: 10 }}>
          Mês vigente para previsão
        </div>
        <div className="config-note">
          Apenas o mês definido aqui fica disponível para os SAMs lançarem a previsão — assim ninguém previsiona o mês errado por engano. Altere quando abrir um novo ciclo.
        </div>
        <div className="import-row">
          <select className="on-light" style={{ maxWidth: 260 }} value={mesSelecionado} onChange={(e) => setMesSelecionado(e.target.value)}>
            {mesOptions.map((m) => (
              <option key={m} value={m}>{mesLabel(m)} ({m})</option>
            ))}
          </select>
          <button className="btn secondary" onClick={salvarMesVigente}>Salvar mês vigente</button>
        </div>
        <div className="footer-note">
          Mês vigente atual: {mesLabel(config.mesVigente)} ({config.mesVigente}). É o único disponível para os SAMs previsionarem agora.
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-soft)", marginBottom: 10 }}>
          Etapa da previsão que os SAMs preenchem
        </div>
        <div className="config-note">
          A cada mês o dashboard gera dois relatórios: o <strong>SE</strong> (previsão inicial) e o <strong>MM</strong> (ajuste do dia 15). Escolha aqui qual campo fica liberado para os SAMs preencherem agora.
        </div>
        <div className="import-row">
          <button
            type="button"
            className={`risco-btn fase-btn${config.faseAtiva === "SE" ? " active" : ""}`}
            style={{ flex: "none", padding: "10px 20px" }}
            onClick={() => mudarFase("SE")}
          >
            SE — Previsão inicial
          </button>
          <button
            type="button"
            className={`risco-btn fase-btn${config.faseAtiva === "MM" ? " active" : ""}`}
            style={{ flex: "none", padding: "10px 20px" }}
            onClick={() => mudarFase("MM")}
          >
            MM — Ajuste (dia 15)
          </button>
        </div>
        <div className="footer-note">
          {config.faseAtiva === "SE"
            ? "Etapa ativa agora: SE — os SAMs estão preenchendo a previsão inicial. O campo MM está bloqueado para todos."
            : "Etapa ativa agora: MM — os SAMs estão preenchendo o ajuste do dia 15. O campo SE continua liberado também."}
        </div>
      </div>

      <div className="config-note">
        A planilha mestre define quem são os SAMs e quais contas/produtos cada um previsiona. Para atualizar o cadastro, importe uma nova planilha no mesmo formato abaixo — ela substitui a planilha mestre atual por completo.
      </div>
      <div className="panel">
        <div className="grid-summary" style={{ marginBottom: 0 }}>
          <div className="card"><div className="k">SAMs cadastrados</div><div className="v">{counts?.samCount ?? "—"}</div></div>
          <div className="card"><div className="k">Produtos (SKU) distintos</div><div className="v">{counts?.skuCount ?? "—"}</div></div>
          <div className="card"><div className="k">Linhas conta × SKU</div><div className="v">{counts?.rowCount ?? "—"}</div></div>
        </div>
        <div className="import-row">
          <input ref={fileRef} type="file" accept=".xlsx" className="on-light" />
          <button className="btn secondary" disabled={importing} onClick={handleImportar}>
            {importing ? "Importando..." : "Importar planilha mestre"}
          </button>
        </div>
        <div className="footer-note">
          Formato esperado: cabeçalho com CNPJ, SAM/KAM, Cliente Conta, Grupo, UF, SKU, SAP em uma das primeiras linhas; dados nas linhas seguintes.
        </div>
        {counts && counts.totalSamsAll > counts.samCount && (
          <div className="footer-note" style={{ marginTop: 6 }}>
            A base completa tem {counts.totalSamsAll} SAMs e {counts.totalRowsAll} linhas ao todo. {counts.hiddenPresentes.length} SAM(s) ficam ocultos no dashboard ({counts.hiddenPresentes.join(", ")}), mas continuam aparecendo normalmente na planilha final gerada.
          </div>
        )}
        {counts && counts.skusOcultos?.length > 0 && (
          <div className="footer-note" style={{ marginTop: 6 }}>
            {counts.skusOcultos.length} produto(s) estão fora do escopo e não aparecem nas listas do
            dashboard nem nas abas de resumo ({counts.skusOcultos.join(", ")}). As linhas deles
            continuam na aba de dados da planilha, para o arquivo seguir idêntico à planilha mestre.
          </div>
        )}
      </div>
    </section>
  );
}
