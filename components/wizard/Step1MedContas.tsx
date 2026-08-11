"use client";

import { useMemo, useState } from "react";
import { mesLabel } from "@/lib/mes";
import type { Conta } from "./types";
import { RISCOS, riscoSlug, emptyLine, lineHasData, rowKeyOf, type ForecastLineValue, type Risco } from "./risco";

export function Step1MedContas({
  sam,
  mes,
  skus,
  allContas,
  rows,
  selectedSku,
  setSelectedSku,
  selectedRowKey,
  setSelectedRowKey,
  updateLine,
  freeEdit,
  faseAtiva,
  dirty,
  onSalvar,
  onNext,
}: {
  sam: string;
  mes: string;
  skus: string[];
  allContas: Conta[];
  rows: Record<string, ForecastLineValue>;
  selectedSku: string | null;
  setSelectedSku: (s: string) => void;
  selectedRowKey: string | null;
  setSelectedRowKey: (k: string | null) => void;
  updateLine: (rowKey: string, patch: Partial<ForecastLineValue>) => void;
  freeEdit: boolean;
  faseAtiva: "SE" | "MM";
  dirty: boolean;
  onSalvar: () => Promise<boolean>;
  onNext: () => void;
}) {
  const [contaSearchTerm, setContaSearchTerm] = useState("");

  const contasDoSku = useMemo(
    () => allContas.filter((c) => c.sku === selectedSku),
    [allContas, selectedSku]
  );

  const term = contaSearchTerm.trim().toLowerCase();
  const contasFiltradas = term
    ? contasDoSku.filter((c) => (c.cliente + " " + c.cnpj).toLowerCase().includes(term))
    : contasDoSku;

  const contaSelecionada = selectedRowKey
    ? contasDoSku.find((c) => rowKeyOf(c) === selectedRowKey) || null
    : null;
  const line = selectedRowKey ? rows[selectedRowKey] || emptyLine() : null;

  const phase1Editable = freeEdit || faseAtiva === "SE";
  const phase2Editable = freeEdit || faseAtiva === "MM";

  function riscoButtons(field: "riscoSE" | "riscoMM", value: Risco, editable: boolean) {
    return (
      <div className="risco-group">
        {RISCOS.map((r) => (
          <button
            key={r}
            type="button"
            className={`risco-btn ${riscoSlug(r)}${r === value ? " active" : ""}`}
            disabled={!editable}
            onClick={() => selectedRowKey && updateLine(selectedRowKey, { [field]: r } as Partial<ForecastLineValue>)}
          >
            {r}
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="top-row">
        <div>
          <h1>Lançamento de previsão</h1>
          <div className="sub">{sam} · {mesLabel(mes)}</div>
        </div>
        <div className="actions">
          <button className="btn secondary" onClick={onSalvar}>Salvar rascunho</button>
        </div>
      </div>

      <div className="med-picker">
        <div className="step-label"><span className="step-num">1</span>Selecione o medicamento</div>
        <select
          className="on-light"
          value={selectedSku || ""}
          onChange={(e) => setSelectedSku(e.target.value)}
        >
          {skus.length === 0 && <option value="">Nenhum medicamento cadastrado</option>}
          {skus.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="master-detail">
        <div>
          <div className="step-label"><span className="step-num">2</span>Selecione a conta</div>
          <input
            type="text"
            className="on-light"
            placeholder="Buscar instituição pelo nome ou CNPJ..."
            style={{ marginBottom: 10, width: "100%" }}
            value={contaSearchTerm}
            onChange={(e) => setContaSearchTerm(e.target.value)}
          />
          <div className="conta-list">
            {contasFiltradas.length === 0 && (
              <div className="empty-list">
                {term
                  ? `Nenhuma instituição encontrada para "${contaSearchTerm}".`
                  : `${sam} não possui contas cadastradas para este medicamento.`}
              </div>
            )}
            {contasFiltradas.map((c) => {
              const key = rowKeyOf(c);
              const l = rows[key];
              return (
                <div
                  key={key}
                  className={`conta-item${key === selectedRowKey ? " active" : ""}`}
                  onClick={() => setSelectedRowKey(key)}
                >
                  <span className={`fill-dot${lineHasData(l) ? " on" : ""}`} />
                  <div className="ci-name" style={{ flex: 1 }}>
                    {c.cliente}
                    <span className="cnpj">{c.cnpj}{c.sap ? ` · SAP ${c.sap}` : ""}</span>
                  </div>
                  <span className="ci-check">✓</span>
                  <span className="ci-uf">{c.uf}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="step-label">Previsão da conta selecionada</div>
          <div className="detail-panel">
            {!contaSelecionada || !line ? (
              <div className="empty-list">Selecione um medicamento e uma conta na lista ao lado para lançar a previsão.</div>
            ) : (
              <>
                <div className="detail-header">
                  <div className="dh-name">{contaSelecionada.cliente}</div>
                  <div className="dh-meta">
                    CNPJ {contaSelecionada.cnpj} · UF {contaSelecionada.uf} · SKU: {contaSelecionada.sku}
                    {contaSelecionada.sap ? ` · SAP ${contaSelecionada.sap}` : ""}
                  </div>
                </div>
                <div className="stage-block">
                  <div className="stage-title">Etapa 1 — Previsão (SE)</div>
                  <div className="detail-grid">
                    <div className="df">
                      <label>Quantidade SE</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={line.se}
                        disabled={!phase1Editable}
                        onChange={(e) => updateLine(selectedRowKey!, { se: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="df">
                      <label>Risco SE</label>
                      {riscoButtons("riscoSE", line.riscoSE, phase1Editable)}
                    </div>
                  </div>
                </div>
                <div className="stage-block">
                  <div className="stage-title">Etapa 2 — Confirmação (MM · dia 15)</div>
                  <div className="detail-grid">
                    <div className="df">
                      <label>Quantidade MM</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={line.mm}
                        disabled={!phase2Editable}
                        onChange={(e) => updateLine(selectedRowKey!, { mm: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="df">
                      <label>Risco MM</label>
                      {riscoButtons("riscoMM", line.riscoMM, phase2Editable)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="save-bar">
        <span>{dirty ? 'Alterações não salvas — clique em "Salvar previsão".' : "Nenhuma alteração pendente."}</span>
        <span>
          {faseAtiva === "SE" && !freeEdit && <span className="locked-note"><span className="dot" />MM bloqueado até dia 15</span>}
          {faseAtiva === "MM" && !freeEdit && <span className="locked-note"><span className="dot open" />Confirmação (MM) liberada</span>}
        </span>
      </div>

      <div className="footer-note">
        Faturado = SE (mesmo valor, campo espelho usado na planilha final). Risco: Alto · Médio · Baixo. MM é a confirmação feita no dia 15, podendo ajustar o valor de SE.
        O ponto dourado na lista de contas indica que já existe previsão lançada para aquele medicamento/conta.
        Se a mesma conta aparecer mais de uma vez para o mesmo medicamento, repare no código SAP mostrado abaixo do CNPJ — são materiais diferentes, cada um com previsão própria.
      </div>

      <div className="wizard-nav">
        <span />
        <button className="btn accent" onClick={onNext}>Ir para conferência →</button>
      </div>
    </>
  );
}
