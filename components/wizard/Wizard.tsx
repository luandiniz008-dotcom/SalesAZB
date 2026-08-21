"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/ToastProvider";
import { useConfig } from "@/components/ConfigContext";
import { useFreeEdit } from "@/components/FreeEditContext";
import type { Conta } from "./types";
import { type ForecastLineValue, emptyLine, rowKeyOf } from "./risco";
import { Step1MedContas } from "./Step1MedContas";
import { Step2Review } from "./Step2Review";
import { Step3Final } from "./Step3Final";

const STEP_LABELS = ["Medicamento e conta", "Conferência", "Finalizar"];

export type StatusPrevisao = {
  concluidoSE: boolean;
  emSE: string | null;
  concluidoMM: boolean;
  emMM: string | null;
};

export function Wizard({ sam, onTrocarSam }: { sam: string; onTrocarSam?: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const { config } = useConfig();
  const { freeEdit } = useFreeEdit();
  const mes = config.mesVigente;

  const [step, setStep] = useState(1);
  const [skus, setSkus] = useState<string[]>([]);
  const [allContas, setAllContas] = useState<Conta[]>([]);
  const [rows, setRows] = useState<Record<string, ForecastLineValue>>({});
  // SE e MM são concluídos de forma independente (igual ao dashboard original):
  // o que o SAM finaliza aqui é sempre a etapa que o admin deixou ativa.
  const [status, setStatus] = useState<StatusPrevisao>({
    concluidoSE: false,
    emSE: null,
    concluidoMM: false,
    emMM: null,
  });
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!mes) return;
    setLoading(true);
    try {
      const [skusData, contasData, forecastData, statusData] = await Promise.all([
        apiFetch<{ skus: string[] }>(`/api/master/skus?sam=${encodeURIComponent(sam)}`),
        apiFetch<{ contas: Conta[] }>(`/api/master/contas?sam=${encodeURIComponent(sam)}`),
        apiFetch<{ rows: Record<string, ForecastLineValue> }>(
          `/api/forecast?sam=${encodeURIComponent(sam)}&mes=${mes}`
        ),
        apiFetch<StatusPrevisao>(`/api/status?sam=${encodeURIComponent(sam)}&mes=${mes}`),
      ]);
      setSkus(skusData.skus);
      setAllContas(contasData.contas);
      setRows(forecastData.rows);
      setStatus(statusData);
      setSelectedSku((prev) => (prev && skusData.skus.includes(prev) ? prev : skusData.skus[0] || null));
      setDirty(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sam, mes]);

  // Carga inicial: sincroniza o estado local com o servidor (sistema externo).
  // O setState real acontece depois do await, dentro da função de carga.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  // Trocar de medicamento limpa a conta selecionada. Feito aqui (no evento) em
  // vez de num efeito reagindo a selectedSku, que causaria render em cascata.
  function selecionarSku(sku: string) {
    setSelectedSku(sku);
    setSelectedRowKey(null);
  }

  function updateLine(rowKey: string, patch: Partial<ForecastLineValue>) {
    setRows((prev) => ({ ...prev, [rowKey]: { ...(prev[rowKey] || emptyLine()), ...patch } }));
    setDirty(true);
  }

  async function handleSalvar(): Promise<boolean> {
    try {
      await apiFetch(`/api/forecast?sam=${encodeURIComponent(sam)}&mes=${mes}`, {
        method: "PUT",
        body: JSON.stringify({ rows }),
      });
      setDirty(false);
      toast("Previsão salva com sucesso.");
      return true;
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível salvar.");
      return false;
    }
  }

  // Conclui/reabre sempre a etapa que o admin deixou ativa (SE ou MM).
  const faseAtiva = config.faseAtiva;

  async function setFaseConcluida(concluido: boolean) {
    const data = await apiFetch<StatusPrevisao>(
      `/api/status?sam=${encodeURIComponent(sam)}&mes=${mes}`,
      { method: "PUT", body: JSON.stringify({ fase: faseAtiva, concluido }) }
    );
    setStatus(data);
  }

  async function handleFinalizar() {
    if (dirty) {
      const ok = await handleSalvar();
      if (!ok) return;
    }
    try {
      await setFaseConcluida(true);
      toast(`Previsão ${faseAtiva} finalizada e salva com sucesso!`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível finalizar.");
    }
  }

  async function handleReabrir() {
    try {
      await setFaseConcluida(false);
      setStep(1);
      toast(`Previsão ${faseAtiva} reaberta para edição.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível reabrir.");
    }
  }

  function goToStep(n: number) {
    if (dirty && n !== step) {
      // salva silenciosamente ao trocar de etapa dentro do mesmo SAM
    }
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const linhasComDados = useMemo(
    () =>
      allContas
        .map((c) => ({ c, line: rows[rowKeyOf(c)] }))
        .filter((x) => x.line && ((x.line.se || 0) > 0 || (x.line.mm || 0) > 0)),
    [allContas, rows]
  );

  if (!mes) return <div className="empty-list">Carregando configuração...</div>;
  if (loading) return <div className="empty-list">Carregando dados de {sam}...</div>;

  return (
    <section>
      <div className="stepper">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const state = n === step ? "active" : n < step ? "done" : "";
          return (
            <span key={n} style={{ display: "contents" }}>
              <button
                type="button"
                className={`step-chip ${state}`}
                onClick={() => n < step && goToStep(n)}
              >
                <span className="sc-num">{n < step ? "✓" : n}</span>
                <span className="sc-label">{label}</span>
              </button>
              {n < STEP_LABELS.length && <span className="step-connector" />}
            </span>
          );
        })}
      </div>

      {onTrocarSam && (
        <div className="sub" style={{ marginBottom: 16 }}>
          Lançando como <strong>{sam}</strong> ·{" "}
          <button type="button" className="btn ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={onTrocarSam}>
            Trocar SAM
          </button>
        </div>
      )}

      {step === 1 && (
        <Step1MedContas
          sam={sam}
          mes={mes}
          skus={skus}
          allContas={allContas}
          rows={rows}
          selectedSku={selectedSku}
          setSelectedSku={selecionarSku}
          selectedRowKey={selectedRowKey}
          setSelectedRowKey={setSelectedRowKey}
          updateLine={updateLine}
          freeEdit={freeEdit}
          faseAtiva={config.faseAtiva}
          dirty={dirty}
          onSalvar={handleSalvar}
          onNext={async () => {
            await handleSalvar();
            goToStep(2);
          }}
        />
      )}

      {step === 2 && (
        <Step2Review
          sam={sam}
          mes={mes}
          linhas={linhasComDados}
          onEditar={(sku, rowKey) => {
            setSelectedSku(sku);
            setSelectedRowKey(rowKey);
            goToStep(1);
          }}
          onBack={() => goToStep(1)}
          onNext={() => goToStep(3)}
        />
      )}

      {step === 3 && (
        <Step3Final
          sam={sam}
          mes={mes}
          linhas={linhasComDados}
          status={status}
          faseAtiva={faseAtiva}
          onBack={() => goToStep(2)}
          onFinalizar={handleFinalizar}
          onReabrir={handleReabrir}
          onVoltarConsolidado={() => router.push("/consolidado")}
        />
      )}
    </section>
  );
}
