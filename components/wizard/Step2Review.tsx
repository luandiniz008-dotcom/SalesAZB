"use client";

import { useMemo, useState } from "react";
import type { Conta } from "./types";
import type { ForecastLineValue } from "./risco";
import { downloadFile } from "@/lib/download";
import { useToast } from "@/components/ToastProvider";

export function Step2Review({
  sam,
  mes,
  linhas,
  onEditar,
  onBack,
  onNext,
}: {
  sam: string;
  mes: string;
  linhas: { c: Conta; line: ForecastLineValue | undefined }[];
  onEditar: (sku: string, rowKey: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const toast = useToast();
  const [reviewSearchTerm, setReviewSearchTerm] = useState("");
  const term = reviewSearchTerm.trim().toLowerCase();

  const filtradas = useMemo(
    () =>
      term
        ? linhas.filter(({ c }) => (c.cliente + " " + c.cnpj + " " + c.sku).toLowerCase().includes(term))
        : linhas,
    [linhas, term]
  );

  return (
    <>
      <div className="top-row">
        <div>
          <h1>Confira a previsão de {sam}</h1>
          <div className="sub">Revise os valores lançados. Se algo estiver errado, volte e ajuste antes de finalizar.</div>
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              toast("Gerando planilha preliminar, aguarde...");
              downloadFile(`/api/export/preliminar?mes=${mes}`, toast);
            }}
          >
            Baixar planilha preliminar (.xlsx)
          </button>
        </div>
      </div>

      <input
        type="text"
        className="on-light"
        placeholder="Buscar instituição pelo nome ou CNPJ..."
        style={{ marginTop: 14, width: "100%", maxWidth: 420 }}
        value={reviewSearchTerm}
        onChange={(e) => setReviewSearchTerm(e.target.value)}
      />

      <div className="review-table-wrap" style={{ marginTop: 14 }}>
        <table>
          <thead>
            <tr>
              <th>Medicamento</th><th>Conta</th><th>UF</th><th>SE</th><th>Risco SE</th><th>MM</th><th>Risco MM</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="review-empty">
                    {linhas.length === 0
                      ? "Nenhuma previsão lançada ainda. Volte à etapa anterior para preencher pelo menos uma conta."
                      : `Nenhuma instituição encontrada para "${reviewSearchTerm}".`}
                  </div>
                </td>
              </tr>
            )}
            {filtradas.map(({ c, line }) => {
              if (!line) return null;
              const rowKey = `${c.cnpj}|${c.sku}|${c.sap || ""}`;
              return (
                <tr key={rowKey}>
                  <td>{c.sku}</td>
                  <td>{c.cliente}<br /><span className="cnpj">{c.cnpj}{c.sap ? ` · SAP ${c.sap}` : ""}</span></td>
                  <td><span className="ci-uf">{c.uf}</span></td>
                  <td>{line.se}</td>
                  <td>{line.riscoSE}</td>
                  <td>{line.mm}</td>
                  <td>{line.riscoMM}</td>
                  <td>
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ padding: "5px 10px", fontSize: 12 }}
                      onClick={() => onEditar(c.sku, rowKey)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="footer-note">
        A planilha preliminar traz só a sua previsão atual (mesmo que ainda não esteja concluída) — útil para conferir ou guardar antes de finalizar.
      </div>

      <div className="wizard-nav">
        <button className="btn ghost" onClick={onBack}>← Voltar e ajustar</button>
        <button className="btn accent" onClick={onNext}>Confirmar previsão →</button>
      </div>
    </>
  );
}
