"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { mesLabel } from "@/lib/mes";
import { apiFetch } from "@/lib/api-client";
import { useConfig } from "@/components/ConfigContext";
import { useFreeEdit } from "@/components/FreeEditContext";
import type { SessionUser } from "@/lib/dal";

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const { config } = useConfig();
  const { freeEdit, setFreeEdit } = useFreeEdit();
  const [status, setStatus] = useState<{ concluidoSE: boolean; concluidoMM: boolean } | null>(null);

  useEffect(() => {
    if (user.role !== "SAM" || !user.samName || !config.mesVigente) return;
    apiFetch<{ concluidoSE: boolean; concluidoMM: boolean }>(
      `/api/status?sam=${encodeURIComponent(user.samName)}&mes=${config.mesVigente}`
    )
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [user.role, user.samName, config.mesVigente, pathname]);

  // O pill mostra a etapa que o admin deixou ativa (é a que o SAM precisa concluir agora).
  const faseConcluida =
    status && (config.faseAtiva === "MM" ? status.concluidoMM : status.concluidoSE);

  const phaseLabel = config.faseAtiva === "SE" ? "Etapa ativa: SE" : "Etapa ativa: MM";
  const phaseDesc =
    config.faseAtiva === "SE"
      ? "O administrador liberou o preenchimento da previsão inicial (SE). O campo MM fica bloqueado até o admin liberar a etapa de ajuste."
      : "O administrador liberou o ajuste da previsão (MM · dia 15). O campo SE continua editável também.";

  return (
    <aside className="sidebar">
      <div className="brand-logo">
        <Image src="/logo.png" alt="AstraZeneca" height={26} width={140} style={{ height: 26, width: "auto" }} />
      </div>
      <div className="brand-title">Previsão de Vendas<br />por Conta</div>

      <div className="field">
        <label>Usuário</label>
        <div style={{ fontSize: 13.5, color: "#fff" }}>{user.name}</div>
        <div style={{ fontSize: 11.5, color: "#D9A6BC", marginTop: 2 }}>
          {user.role === "ADMIN" ? "Administrador" : user.samName}
        </div>
      </div>

      {config.mesVigente && (
        <div className="lote-stamp">
          <div className="n">{config.mesVigente}</div>
          <div className="l">Competência — {mesLabel(config.mesVigente)}</div>
        </div>
      )}

      <div className="phase-box">
        <div className="ph">{phaseLabel}</div>
        <div className="desc">{phaseDesc}{freeEdit ? " Edição livre ativada — todos os campos estão liberados." : ""}</div>
        {user.role === "SAM" && (
          <div className="toggle-row">
            <input
              type="checkbox"
              id="freeEdit"
              checked={freeEdit}
              onChange={(e) => setFreeEdit(e.target.checked)}
            />
            <label htmlFor="freeEdit" style={{ margin: 0, textTransform: "none", letterSpacing: 0, color: "#F0D2DF" }}>
              Liberar SE e MM juntos (exceção)
            </label>
          </div>
        )}
        {user.role === "SAM" && status && (
          <div className={`status-pill${faseConcluida ? " done" : ""}`}>
            <span className="dot" />
            <span>
              {faseConcluida
                ? `${config.faseAtiva} concluída`
                : `${config.faseAtiva} pendente`}
            </span>
          </div>
        )}
      </div>

      <nav className="nav">
        <Link href="/lancamento" className={pathname?.startsWith("/lancamento") ? "active" : ""}>
          Lançamento por conta
        </Link>
        <Link href="/faturamento" className={pathname?.startsWith("/faturamento") ? "active" : ""}>
          Confirmação de faturamento
        </Link>
        <Link href="/calibracao" className={pathname?.startsWith("/calibracao") ? "active" : ""}>
          Calibração
        </Link>
        <Link href="/consolidado" className={pathname?.startsWith("/consolidado") ? "active" : ""}>
          Painel consolidado
        </Link>
        {user.role === "ADMIN" && (
          <>
            <Link href="/config" className={pathname?.startsWith("/config") ? "active" : ""}>
              Configurações / importar
            </Link>
            <Link href="/admin/usuarios" className={pathname?.startsWith("/admin/usuarios") ? "active" : ""}>
              Usuários
            </Link>
          </>
        )}
      </nav>

      <div className="user-box">
        {user.email}
        <br />
        <button onClick={() => signOut({ callbackUrl: "/login" })}>Sair</button>
      </div>
    </aside>
  );
}
