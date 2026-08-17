"use client";

import { useCallback, useEffect, useMemo, useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/ToastProvider";
import { useConfig } from "@/components/ConfigContext";
import { mesLabel } from "@/lib/mes";
import { novoManualRowKey, type CalibracaoLinha } from "@/lib/calibracao";
import type { Conta } from "@/components/wizard/types";
import { rowKeyOf, type ForecastLineValue } from "@/components/wizard/risco";

type LinhaExibida = {
  rowKey: string;
  sku: string;
  cliente: string;
  uf: string;
  sap: string;
  manual: boolean;
  se: number;
  mm: number;
};

export function CalibracaoView({ sam }: { sam: string }) {
  const toast = useToast();
  const { config } = useConfig();
  const mes = config.mesVigente;

  const [contas, setContas] = useState<Conta[]>([]);
  const [forecast, setForecast] = useState<Record<string, ForecastLineValue>>({});
  const [skus, setSkus] = useState<string[]>([]);
  // quantidade em casa, por rowKey
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  // pedidos manuais (conta digitada, produto do catálogo)
  const [manuais, setManuais] = useState<CalibracaoLinha[]>([]);
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [novoSku, setNovoSku] = useState("");
  const [novoCliente, setNovoCliente] = useState("");
  const [novaUf, setNovaUf] = useState("");
  const [novaQtd, setNovaQtd] = useState("");

  const load = useCallback(async () => {
    if (!mes) return;
    setLoading(true);
    try {
      const [contasData, forecastData, skusData, calibData] = await Promise.all([
        apiFetch<{ contas: Conta[] }>(`/api/master/contas?sam=${encodeURIComponent(sam)}`),
        apiFetch<{ rows: Record<string, ForecastLineValue> }>(
          `/api/forecast?sam=${encodeURIComponent(sam)}&mes=${mes}`
        ),
        apiFetch<{ skus: string[] }>("/api/master/skus"),
        apiFetch<{ linhas: CalibracaoLinha[]; atualizadoEm: string | null }>(
          `/api/calibracao?sam=${encodeURIComponent(sam)}&mes=${mes}`
        ),
      ]);
      setContas(contasData.contas);
      setForecast(forecastData.rows);
      setSkus(skusData.skus);

      const qtds: Record<string, number> = {};
      for (const l of calibData.linhas) qtds[l.rowKey] = l.quantidade;
      setQuantidades(qtds);
      setManuais(calibData.linhas.filter((l) => l.manual));
      setAtualizadoEm(calibData.atualizadoEm);
      setDirty(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao carregar calibração.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sam, mes]);

  // Carga inicial: sincroniza o estado local com o servidor (sistema externo).
  // O setState real acontece depois do await, dentro da função de carga.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Linhas da planilha mestre que entram na calibração: as que têm previsão
  // lançada (SE ou MM > 0) — são os "pedidos computados".
  const linhasPrevistas: LinhaExibida[] = useMemo(
    () =>
      contas
        .map((c) => ({ c, line: forecast[rowKeyOf(c)] }))
        .filter((x) => x.line && ((x.line.se || 0) > 0 || (x.line.mm || 0) > 0))
        .map(({ c, line }) => ({
          rowKey: rowKeyOf(c),
          sku: c.sku,
          cliente: c.cliente,
          uf: c.uf,
          sap: c.sap,
          manual: false,
          se: line!.se || 0,
          mm: line!.mm || 0,
        })),
    [contas, forecast]
  );

  const linhasManuais: LinhaExibida[] = useMemo(
    () =>
      manuais.map((m) => ({
        rowKey: m.rowKey,
        sku: m.sku,
        cliente: m.cliente,
        uf: m.uf,
        sap: "",
        manual: true,
        se: 0,
        mm: 0,
      })),
    [manuais]
  );

  const todas = useMemo(
    () => [...linhasPrevistas, ...linhasManuais],
    [linhasPrevistas, linhasManuais]
  );

  function setQtd(rowKey: string, v: number) {
    setQuantidades((prev) => ({ ...prev, [rowKey]: v }));
    setDirty(true);
  }

  function adicionarManual(e: FormEvent) {
    e.preventDefault();
    if (!novoSku || !novoCliente.trim()) {
      toast("Informe a conta e escolha o produto.");
      return;
    }
    const rowKey = novoManualRowKey();
    setManuais((prev) => [
      ...prev,
      {
        rowKey,
        sku: novoSku,
        cliente: novoCliente.trim(),
        uf: novaUf.trim().toUpperCase(),
        manual: true,
        quantidade: Number(novaQtd) || 0,
      },
    ]);
    setQuantidades((prev) => ({ ...prev, [rowKey]: Number(novaQtd) || 0 }));
    setDirty(true);
    setNovoSku("");
    setNovoCliente("");
    setNovaUf("");
    setNovaQtd("");
    toast("Pedido manual adicionado — salve para gravar.");
  }

  function removerManual(rowKey: string) {
    setManuais((prev) => prev.filter((m) => m.rowKey !== rowKey));
    setQuantidades((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([k]) => k !== rowKey))
    );
    setDirty(true);
  }

  async function handleSalvar() {
    setSalvando(true);
    try {
      const linhas: CalibracaoLinha[] = todas.map((l) => ({
        rowKey: l.rowKey,
        sku: l.sku,
        cliente: l.cliente,
        uf: l.uf,
        manual: l.manual,
        quantidade: quantidades[l.rowKey] || 0,
      }));
      const r = await apiFetch<{ atualizadoEm: string }>(
        `/api/calibracao?sam=${encodeURIComponent(sam)}&mes=${mes}`,
        { method: "PUT", body: JSON.stringify({ linhas }) }
      );
      setAtualizadoEm(r.atualizadoEm);
      setDirty(false);
      toast("Calibração salva.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const totalEmCasa = useMemo(
    () => todas.reduce((a, l) => a + (quantidades[l.rowKey] || 0), 0),
    [todas, quantidades]
  );
  const totalMM = useMemo(() => linhasPrevistas.reduce((a, l) => a + l.mm, 0), [linhasPrevistas]);

  if (!mes) return <div className="empty-list">Carregando configuração...</div>;
  if (loading) return <div className="empty-list">Carregando calibração de {sam}...</div>;

  return (
    <section>
      <div className="top-row">
        <div>
          <h1>Calibração</h1>
          <div className="sub">
            {sam} · {mesLabel(mes)} — informe os pedidos que já estão <strong>em casa</strong> mas
            ainda <strong>não foram faturados</strong>. Etapa contínua: pode ser ajustada a qualquer
            momento durante o mês.
          </div>
        </div>
        <div className="actions">
          <button className="btn accent" onClick={handleSalvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar calibração"}
          </button>
        </div>
      </div>

      <div className="config-note">
        A quantidade informada aqui alimenta a coluna <strong>A faturar</strong> da aba CONSOLIDADO na
        planilha final. Não precisa de conclusão — vale o que estiver salvo no momento da geração.
      </div>

      <div className="grid-summary">
        <div className="card"><div className="k">Pedidos na calibração</div><div className="v">{todas.length}</div></div>
        <div className="card"><div className="k">Total MM previsto</div><div className="v">{totalMM}</div></div>
        <div className="card"><div className="k">Total em casa (a faturar)</div><div className="v">{totalEmCasa}</div></div>
        <div className="card">
          <div className="k">Última atualização</div>
          <div className="v" style={{ fontSize: 14 }}>
            {atualizadoEm ? new Date(atualizadoEm).toLocaleString("pt-BR") : "—"}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-title">Adicionar pedido manualmente</div>
        <div className="config-note">
          Para pedidos de contas que não estão no seu painel. O produto vem da lista da planilha
          mestre — é ele que liga o pedido ao grupo certo na planilha final.
        </div>
        <form onSubmit={adicionarManual}>
          <div className="detail-grid" style={{ marginBottom: 14 }}>
            <div className="df">
              <label>Conta (nome livre)</label>
              <input
                type="text"
                className="on-light"
                placeholder="Nome da instituição"
                value={novoCliente}
                onChange={(e) => setNovoCliente(e.target.value)}
              />
            </div>
            <div className="df">
              <label>Produto</label>
              <select className="on-light" value={novoSku} onChange={(e) => setNovoSku(e.target.value)}>
                <option value="">Selecione o medicamento...</option>
                {skus.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="df">
              <label>UF (opcional)</label>
              <input
                type="text"
                className="on-light"
                maxLength={2}
                placeholder="SP"
                value={novaUf}
                onChange={(e) => setNovaUf(e.target.value)}
              />
            </div>
            <div className="df">
              <label>Quantidade em casa</label>
              <input
                type="number"
                className="on-light"
                min={0}
                step={1}
                value={novaQtd}
                onChange={(e) => setNovaQtd(e.target.value)}
              />
            </div>
          </div>
          <button className="btn secondary" type="submit">Adicionar pedido</button>
        </form>
      </div>

      <div className="review-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Medicamento</th><th>Conta</th><th>UF</th><th>SE</th><th>MM</th>
              <th>Qtd. em casa (a faturar)</th><th></th>
            </tr>
          </thead>
          <tbody>
            {todas.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="review-empty">
                    Nenhum pedido para calibrar em {mesLabel(mes)}. Aparecem aqui as contas com previsão
                    SE ou MM lançada — e os pedidos que você adicionar manualmente acima.
                  </div>
                </td>
              </tr>
            )}
            {todas.map((l) => (
              <tr key={l.rowKey}>
                <td>{l.sku}</td>
                <td>
                  {l.cliente}
                  {l.manual ? (
                    <>
                      <br />
                      <span className="badge pending" style={{ fontSize: 10 }}>manual</span>
                    </>
                  ) : (
                    <>
                      <br />
                      <span className="cnpj">
                        {l.rowKey.split("|")[0]}{l.sap ? ` · SAP ${l.sap}` : ""}
                      </span>
                    </>
                  )}
                </td>
                <td>{l.uf ? <span className="ci-uf">{l.uf}</span> : "—"}</td>
                <td style={{ fontFamily: "var(--mono)" }}>{l.manual ? "—" : l.se}</td>
                <td style={{ fontFamily: "var(--mono)" }}>{l.manual ? "—" : l.mm}</td>
                <td>
                  <input
                    type="number"
                    className="on-light"
                    min={0}
                    step={1}
                    style={{ maxWidth: 120 }}
                    value={quantidades[l.rowKey] ?? 0}
                    onChange={(e) => setQtd(l.rowKey, Number(e.target.value) || 0)}
                  />
                </td>
                <td>
                  {l.manual && (
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ padding: "6px 12px", fontSize: 12.5 }}
                      onClick={() => removerManual(l.rowKey)}
                    >
                      Remover
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="save-bar">
        <span>{dirty ? "Alterações não salvas." : "Nenhuma alteração pendente."}</span>
        <span className="locked-note">
          <span className="dot open" />
          Etapa contínua — sem conclusão
        </span>
      </div>
    </section>
  );
}
