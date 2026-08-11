"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Wizard } from "./Wizard";

export function AdminSamPicker() {
  const [sams, setSams] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ sams: string[] }>("/api/public/sams").then((d) => setSams(d.sams));
  }, []);

  if (chosen) {
    return <Wizard sam={chosen} onTrocarSam={() => setChosen(null)} />;
  }

  return (
    <section>
      <h1>Lançar previsão em nome de um SAM</h1>
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
