"use client";

import { useMemo } from "react";
import { mesLabel } from "@/lib/mes";
import type { Conta } from "./types";
import type { ForecastLineValue } from "./risco";
import type { StatusPrevisao } from "./Wizard";

export function Step3Final({
  sam,
  mes,
  linhas,
  status,
  faseAtiva,
  onBack,
  onFinalizar,
  onReabrir,
  onVoltarConsolidado,
}: {
  sam: string;
  mes: string;
  linhas: { c: Conta; line: ForecastLineValue | undefined }[];
  status: StatusPrevisao;
  faseAtiva: "SE" | "MM";
  onBack: () => void;
  onFinalizar: () => void;
  onReabrir: () => void;
  onVoltarConsolidado: () => void;
}) {
  const totalSE = useMemo(() => linhas.reduce((a, x) => a + (x.line?.se || 0), 0), [linhas]);
  const totalMM = useMemo(() => linhas.reduce((a, x) => a + (x.line?.mm || 0), 0), [linhas]);

  // A conclusão é por etapa: o SAM finaliza a etapa que o admin deixou ativa.
  const concluido = faseAtiva === "MM" ? status.concluidoMM : status.concluidoSE;
  const em = faseAtiva === "MM" ? status.emMM : status.emSE;

  return (
    <>
      <h1>Finalizar previsão do mês</h1>
      <div className="sub">
        Competência {mesLabel(mes)} · SAM {sam} · Etapa <strong>{faseAtiva}</strong>
      </div>

      <div className="grid-summary" style={{ marginTop: 20 }}>
        <div className="card"><div className="k">Contas com previsão</div><div className="v">{linhas.length}</div></div>
        <div className="card"><div className="k">Total SE</div><div className="v">{totalSE}</div></div>
        <div className="card"><div className="k">Total MM</div><div className="v">{totalMM}</div></div>
      </div>

      <div className="grid-summary">
        <div className="card">
          <div className="k">Etapa SE</div>
          <div className="v" style={{ fontSize: 15 }}>
            <span className={`badge ${status.concluidoSE ? "done" : "pending"}`}>
              {status.concluidoSE ? "Concluída" : "Pendente"}
            </span>
          </div>
        </div>
        <div className="card">
          <div className="k">Etapa MM</div>
          <div className="v" style={{ fontSize: 15 }}>
            <span className={`badge ${status.concluidoMM ? "done" : "pending"}`}>
              {status.concluidoMM ? "Concluída" : "Pendente"}
            </span>
          </div>
        </div>
      </div>

      <div className={`final-summary${concluido ? " done" : ""}`}>
        {concluido ? (
          <>
            <div className="fs-icon">✓</div>
            <div style={{ fontWeight: 800, color: "#137A45", fontSize: 16 }}>
              Etapa {faseAtiva} concluída para {mesLabel(mes)}.
            </div>
            <div style={{ color: "var(--ink-soft)", fontSize: 12.5, marginTop: 6 }}>
              Salva em {em ? new Date(em).toLocaleString("pt-BR") : "—"}.
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 600 }}>Pronto para finalizar a etapa {faseAtiva}?</div>
            <div style={{ color: "var(--ink-soft)", fontSize: 12.5, marginTop: 6 }}>
              Ao finalizar, sua previsão {faseAtiva} de {mesLabel(mes)} é marcada como concluída no painel
              consolidado. O relatório {faseAtiva} só é liberado quando todos os SAMs concluírem esta etapa.
            </div>
          </>
        )}
      </div>

      <div className="wizard-nav">
        <button className="btn ghost" onClick={onBack}>← Voltar e revisar</button>
        <div className="actions">
          {concluido ? (
            <button className="btn ghost" onClick={onReabrir}>Reabrir etapa {faseAtiva}</button>
          ) : (
            <button className="btn accent" onClick={onFinalizar}>Finalizar etapa {faseAtiva}</button>
          )}
          <button className="btn secondary" onClick={onVoltarConsolidado}>Ver painel consolidado</button>
        </div>
      </div>
    </>
  );
}
