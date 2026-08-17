"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { CalibracaoView } from "./CalibracaoView";

export function AdminCalibracaoPicker() {
  const [sams, setSams] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ sams: string[] }>("/api/public/sams").then((d) => setSams(d.sams));
  }, []);

  if (chosen) {
    return (
      <>
        <div className="sub" style={{ marginBottom: 16 }}>
          Calibrando como <strong>{chosen}</strong> ·{" "}
          <button
            type="button"
            className="btn ghost"
            style={{ padding: "4px 10px", fontSize: 12 }}
            onClick={() => setChosen(null)}
          >
            Trocar SAM
          </button>
        </div>
        <CalibracaoView sam={chosen} />
      </>
    );
  }

  return (
    <section>
      <h1>Calibração</h1>
      <div className="sub">Escolha o SAM cujos pedidos em casa você quer calibrar.</div>
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
