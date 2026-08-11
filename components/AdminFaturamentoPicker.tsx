"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { FaturamentoView } from "./FaturamentoView";

export function AdminFaturamentoPicker() {
  const [sams, setSams] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ sams: string[] }>("/api/public/sams").then((d) => setSams(d.sams));
  }, []);

  if (chosen) {
    return (
      <>
        <div className="sub" style={{ marginBottom: 16 }}>
          Vendo faturamento de <strong>{chosen}</strong> ·{" "}
          <button
            type="button"
            className="btn ghost"
            style={{ padding: "4px 10px", fontSize: 12 }}
            onClick={() => setChosen(null)}
          >
            Trocar SAM
          </button>
        </div>
        <FaturamentoView sam={chosen} />
      </>
    );
  }

  return (
    <section>
      <h1>Confirmação de faturamento</h1>
      <div className="sub">Como administrador, escolha qual SAM você quer visualizar ou ajustar.</div>
      <div className="sam-grid" style={{ marginTop: 20 }}>
        {sams.map((s) => (
          <button key={s} type="button" className="sam-card" onClick={() => setChosen(s)}>
            <div className="sc-name">{s}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
