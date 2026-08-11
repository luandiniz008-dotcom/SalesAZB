"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { downloadFile } from "@/lib/download";
import { mesLabel } from "@/lib/mes";
import { useConfig } from "@/components/ConfigContext";
import { useToast } from "@/components/ToastProvider";

type SamStatus = {
  sam: string;
  se: number;
  mm: number;
  concluidoSE: boolean;
  concluidoMM: boolean;
  faturamentoConcluido: boolean;
};
type ConsolidadoData = {
  statuses: SamStatus[];
  totalSE: number;
  totalMM: number;
  concluidosSE: number;
  concluidosMM: number;
  confirmadosFat: number;
  totalSams: number;
  seCompleto: boolean;
  mmCompleto: boolean;
};
type Tipo = "SE" | "MM" | "PARCIAL";
type GeneratedFile = {
  id: string;
  mes: string;
  tipo: Tipo;
  filename: string;
  geradoEm: string;
  tamanhoKB: number;
};

export function ConsolidadoView({ isAdmin }: { isAdmin: boolean }) {
  const { config } = useConfig();
  const toast = useToast();
  const mes = config.mesVigente;

  const [data, setData] = useState<ConsolidadoData | null>(null);
  const [files, setFiles] = useState<GeneratedFile[] | null>(null);
  const [generating, setGenerating] = useState<Tipo | null>(null);

  const load = useCallback(async () => {
    if (!mes) return;
    const d = await apiFetch<ConsolidadoData>(`/api/consolidado?mes=${mes}`);
    setData(d);
    if (isAdmin) {
      const f = await apiFetch<{ files: GeneratedFile[] }>("/api/files");
      setFiles(f.files);
    }
  }, [mes, isAdmin]);

  // Carga inicial: sincroniza o estado local com o servidor (sistema externo).
  // O setState real acontece depois do await, dentro da função de carga.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function gerar(tipo: Tipo) {
    setGenerating(tipo);
    toast(`Gerando relatório ${tipo}, aguarde...`);
    const ok = await downloadFile(`/api/export?mes=${mes}&tipo=${tipo}`, toast);
    setGenerating(null);
    if (ok) {
      toast(`Relatório ${tipo} gerado e salvo no histórico.`);
      load();
    }
  }

  async function baixarArquivo(f: GeneratedFile) {
    await downloadFile(`/api/files/${f.id}`, toast);
  }

  async function excluirArquivo(f: GeneratedFile) {
    if (!confirm(`Excluir o relatório ${f.tipo} de ${mesLabel(f.mes)} do histórico?`)) return;
    await apiFetch(`/api/files/${f.id}`, { method: "DELETE" });
    toast("Planilha removida do histórico.");
    load();
  }

  if (!mes || !data) return <div className="empty-list">Carregando...</div>;

  const pendentesSE = data.statuses.filter((s) => !s.concluidoSE).map((s) => s.sam);
  const pendentesMM = data.statuses.filter((s) => !s.concluidoMM).map((s) => s.sam);

  return (
    <section>
      <div className="top-row">
        <div>
          <h1>Painel consolidado</h1>
          <div className="sub">Status de todos os SAMs e geração da planilha final.</div>
        </div>
        <div className="actions">
          <button className="btn secondary" onClick={load}>Atualizar</button>
        </div>
      </div>

      <div className="grid-summary">
        <div className="card"><div className="k">SAMs com SE concluído</div><div className="v">{data.concluidosSE}/{data.totalSams}</div></div>
        <div className="card"><div className="k">SAMs com MM concluído</div><div className="v">{data.concluidosMM}/{data.totalSams}</div></div>
        <div className="card"><div className="k">Total SE (previsão)</div><div className="v">{data.totalSE}</div></div>
        <div className="card"><div className="k">Total MM (ajuste)</div><div className="v">{data.totalMM}</div></div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-title">Status por SAM — competência {mesLabel(mes)}</div>
        <div>
          {data.statuses.map((s) => (
            <div className="sam-status-row" key={s.sam}>
              <div>
                {s.sam} <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>— SE: {s.se} · MM: {s.mm}</span>
              </div>
              <div className="actions">
                <span className={`badge ${s.concluidoSE ? "done" : "pending"}`}>SE {s.concluidoSE ? "✓" : "…"}</span>
                <span className={`badge ${s.concluidoMM ? "done" : "pending"}`}>MM {s.concluidoMM ? "✓" : "…"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-title">
          Confirmação de faturamento — {data.confirmadosFat}/{data.totalSams} SAMs
        </div>
        <div className="config-note">
          O faturamento confirmado alimenta as abas RESUMO e CONSOLIDADO da planilha, mas não trava a
          geração dos relatórios.
        </div>
        <div>
          {data.statuses.map((s) => (
            <div className="sam-status-row" key={s.sam}>
              <div>{s.sam}</div>
              <span className={`badge ${s.faturamentoConcluido ? "done" : "pending"}`}>
                {s.faturamentoConcluido ? "Confirmado" : "Pendente"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {isAdmin && (
        <div className="panel" style={{ marginBottom: 20 }}>
          {data.seCompleto ? (
            <div style={{ fontSize: 13, color: "#137A45", fontWeight: 700, marginBottom: 8 }}>
              Todos os SAMs concluíram a previsão SE de {mesLabel(mes)}. O relatório SE já pode ser gerado.
            </div>
          ) : (
            <div className="gate-warning" style={{ marginBottom: 8 }}>
              O relatório SE só é liberado quando todos os SAMs concluírem a previsão SE de {mesLabel(mes)}.
              <br />
              Pendentes ({pendentesSE.length}): {pendentesSE.join(", ")}
            </div>
          )}
          {data.mmCompleto ? (
            <div style={{ fontSize: 13, color: "#137A45", fontWeight: 700, marginBottom: 8 }}>
              Todos os SAMs concluíram a previsão MM de {mesLabel(mes)}. O relatório MM já pode ser gerado.
            </div>
          ) : (
            <div className="gate-warning">
              O relatório MM só é liberado quando todos os SAMs concluírem a previsão MM de {mesLabel(mes)}.
              <br />
              Pendentes ({pendentesMM.length}): {pendentesMM.join(", ")}
            </div>
          )}
          <div className="actions">
            <button className="btn accent" disabled={!data.seCompleto || generating !== null} onClick={() => gerar("SE")}>
              {generating === "SE" ? "Gerando..." : "Gerar relatório SE"}
            </button>
            <button className="btn accent" disabled={!data.mmCompleto || generating !== null} onClick={() => gerar("MM")}>
              {generating === "MM" ? "Gerando..." : "Gerar relatório MM"}
            </button>
            <button className="btn ghost" disabled={generating !== null} onClick={() => gerar("PARCIAL")}>
              {generating === "PARCIAL" ? "Gerando..." : "Gerar prévia (parcial)"}
            </button>
          </div>
          <div className="footer-note">
            Todos os relatórios saem com quatro abas: os dados linha a linha, RESUMO (por medicamento e
            estado), RESUMO POR SAM e CONSOLIDADO (visão financeira do trimestre). A prévia pode ser
            gerada a qualquer momento, sem trava.
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="panel">
          <div className="panel-title">Planilhas geradas anteriormente</div>
          <div className="config-note">
            Toda planilha gerada aqui fica salva no dashboard — dá para baixar de novo em outro momento, sem precisar gerar tudo outra vez.
          </div>
          {!files || files.length === 0 ? (
            <div className="review-empty">Nenhuma planilha gerada ainda.</div>
          ) : (
            files.map((f) => (
              <div className="sam-status-row" key={f.id}>
                <div>
                  <strong>{mesLabel(f.mes)}</strong> ({f.mes})
                  <span className={`badge ${f.tipo === "MM" ? "done" : "pending"}`} style={{ marginLeft: 8 }}>
                    Relatório {f.tipo}
                  </span>
                  <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 3 }}>
                    Gerada em {new Date(f.geradoEm).toLocaleString("pt-BR")} · {f.tamanhoKB} KB
                  </div>
                </div>
                <div className="actions">
                  <button type="button" className="btn secondary" style={{ padding: "7px 12px", fontSize: 12.5 }} onClick={() => baixarArquivo(f)}>
                    Baixar
                  </button>
                  <button type="button" className="btn ghost" style={{ padding: "7px 12px", fontSize: 12.5 }} onClick={() => excluirArquivo(f)}>
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
