"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/ToastProvider";
import { useConfig } from "@/components/ConfigContext";
import { mesLabel } from "@/lib/mes";
import {
  FATURA_STATUS_ORDER,
  FATURA_STATUS_LABEL,
  emptyFaturaLine,
  quantidadeFaturada,
  type FaturaLineValue,
  type FaturaStatus,
} from "@/lib/faturamento";
import type { Conta } from "@/components/wizard/types";
import { rowKeyOf, type ForecastLineValue } from "@/components/wizard/risco";

export function FaturamentoView({ sam }: { sam: string }) {
  const toast = useToast();
  const { config } = useConfig();
  const mes = config.mesVigente;

  const [contas, setContas] = useState<Conta[]>([]);
  const [forecast, setForecast] = useState<Record<string, ForecastLineValue>>({});
  const [rows, setRows] = useState<Record<string, FaturaLineValue>>({});
  const [status, setStatus] = useState<{ concluido: boolean; em: string | null }>({
    concluido: false,
    em: null,
  });
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!mes) return;
    setLoading(true);
    try {
      const [contasData, forecastData, fatData, statusData] = await Promise.all([
        apiFetch<{ contas: Conta[] }>(`/api/master/contas?sam=${encodeURIComponent(sam)}`),
        apiFetch<{ rows: Record<string, ForecastLineValue> }>(
          `/api/forecast?sam=${encodeURIComponent(sam)}&mes=${mes}`
        ),
        apiFetch<{ rows: Record<string, FaturaLineValue> }>(
          `/api/faturamento?sam=${encodeURIComponent(sam)}&mes=${mes}`
        ),
        apiFetch<{ concluido: boolean; em: string | null }>(
          `/api/faturamento/status?sam=${encodeURIComponent(sam)}&mes=${mes}`
        ),
      ]);
      setContas(contasData.contas);
      setForecast(forecastData.rows);
      setRows(fatData.rows);
      setStatus(statusData);
      setDirty(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao carregar faturamento.");
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

  // Itens elegíveis: contas do SAM com previsão MM > 0 — é o que precisa ser confirmado.
  const linhas = useMemo(
    () =>
      contas
        .map((c) => ({ c, mmLine: forecast[rowKeyOf(c)] }))
        .filter((x) => x.mmLine && (x.mmLine.mm || 0) > 0),
    [contas, forecast]
  );

  function setLinha(rowKey: string, patch: Partial<FaturaLineValue>) {
    setRows((prev) => ({ ...prev, [rowKey]: { ...(prev[rowKey] || emptyFaturaLine()), ...patch } }));
    setDirty(true);
  }

  function escolherStatus(rowKey: string, s: FaturaStatus, mm: number) {
    // "Faturado" preenche o MM inteiro, "Não faturado" zera; só o parcial fica editável.
    const quantidade = s === "FATURADO" ? mm : s === "NAO_FATURADO" ? 0 : rows[rowKey]?.quantidade || 0;
    setLinha(rowKey, { status: s, quantidade });
  }

  async function handleSalvar(): Promise<boolean> {
    try {
      await apiFetch(`/api/faturamento?sam=${encodeURIComponent(sam)}&mes=${mes}`, {
        method: "PUT",
        body: JSON.stringify({ rows }),
      });
      setDirty(false);
      toast("Confirmação de faturamento salva.");
      return true;
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível salvar.");
      return false;
    }
  }

  async function setConcluido(concluido: boolean) {
    if (concluido && dirty) {
      const ok = await handleSalvar();
      if (!ok) return;
    }
    try {
      const data = await apiFetch<{ concluido: boolean; em: string }>(
        `/api/faturamento/status?sam=${encodeURIComponent(sam)}&mes=${mes}`,
        { method: "PUT", body: JSON.stringify({ concluido }) }
      );
      setStatus(data);
      toast(concluido ? "Confirmação de faturamento finalizada." : "Confirmação reaberta para edição.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível atualizar o status.");
    }
  }

  const totalMM = useMemo(() => linhas.reduce((a, x) => a + (x.mmLine!.mm || 0), 0), [linhas]);
  const totalConfirmado = useMemo(
    () => linhas.reduce((a, x) => a + quantidadeFaturada(rows[rowKeyOf(x.c)], x.mmLine!.mm || 0), 0),
    [linhas, rows]
  );
  const pendentes = useMemo(
    () => linhas.filter((x) => !rows[rowKeyOf(x.c)]?.status).length,
    [linhas, rows]
  );

  if (!mes) return <div className="empty-list">Carregando configuração...</div>;
  if (loading) return <div className="empty-list">Carregando faturamento de {sam}...</div>;

  return (
    <section>
      <div className="top-row">
        <div>
          <h1>Confirmação de faturamento</h1>
          <div className="sub">
            {sam} · {mesLabel(mes)} — confirme o que foi efetivamente faturado das quantidades previstas em MM.
          </div>
        </div>
        <div className="actions">
          <button className="btn secondary" onClick={handleSalvar} disabled={!linhas.length}>
            Salvar
          </button>
        </div>
      </div>

      <div className="grid-summary">
        <div className="card"><div className="k">Itens a confirmar</div><div className="v">{linhas.length}</div></div>
        <div className="card"><div className="k">Total MM previsto</div><div className="v">{totalMM}</div></div>
        <div className="card"><div className="k">Total confirmado</div><div className="v">{totalConfirmado}</div></div>
        <div className="card"><div className="k">Itens pendentes</div><div className="v">{pendentes}</div></div>
      </div>

      <div className="review-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Medicamento</th><th>Conta</th><th>UF</th><th>MM previsto</th><th>Status</th><th>Qtd. faturada</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="review-empty">
                    Este SAM não tem itens com previsão MM lançada em {mesLabel(mes)} para confirmar.
                  </div>
                </td>
              </tr>
            )}
            {linhas.map(({ c, mmLine }) => {
              const key = rowKeyOf(c);
              const fat = rows[key] || emptyFaturaLine();
              const mm = mmLine!.mm || 0;
              const parcial = fat.status === "FATURADO_PARCIALMENTE";
              return (
                <tr key={key}>
                  <td>{c.sku}</td>
                  <td>
                    {c.cliente}
                    <br />
                    <span className="cnpj">{c.cnpj}{c.sap ? ` · SAP ${c.sap}` : ""}</span>
                  </td>
                  <td><span className="ci-uf">{c.uf}</span></td>
                  <td style={{ fontFamily: "var(--mono)" }}>{mm}</td>
                  <td>
                    <div className="risco-group" style={{ maxWidth: 340 }}>
                      {FATURA_STATUS_ORDER.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`risco-btn${fat.status === s ? " active fat-active" : ""}`}
                          onClick={() => escolherStatus(key, s, mm)}
                        >
                          {FATURA_STATUS_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="on-light"
                      min={0}
                      max={mm}
                      step={1}
                      style={{ maxWidth: 110 }}
                      disabled={!parcial}
                      value={fat.status ? (parcial ? fat.quantidade : quantidadeFaturada(fat, mm)) : ""}
                      onChange={(e) => setLinha(key, { quantidade: Number(e.target.value) || 0 })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="save-bar">
        <span>{dirty ? "Alterações não salvas." : "Nenhuma alteração pendente."}</span>
        <span>
          <span className={`badge ${status.concluido ? "done" : "pending"}`}>
            {status.concluido ? "Faturamento confirmado" : "Confirmação pendente"}
          </span>
        </span>
      </div>

      <div className="wizard-nav">
        <span />
        <div className="actions">
          {status.concluido ? (
            <button className="btn ghost" onClick={() => setConcluido(false)}>Reabrir para editar</button>
          ) : (
            <button className="btn accent" disabled={!linhas.length} onClick={() => setConcluido(true)}>
              Finalizar confirmação de faturamento
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
