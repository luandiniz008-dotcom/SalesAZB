"use client";

import { useState, FormEvent } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível trocar a senha.");
        setPending(false);
        return;
      }
      // Atualiza a sessão (JWT) sem precisar deslogar/logar de novo.
      await update({ mustChangePassword: false });
      router.push("/lancamento");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setPending(false);
    }
  }

  const isFirstLogin = session?.user ? !!(session.user as { mustChangePassword?: boolean }).mustChangePassword : true;

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-logo">
          <Image src="/logo.png" alt="AstraZeneca" height={26} width={140} style={{ height: 26, width: "auto" }} />
        </div>
        <h1>Defina sua senha</h1>
        <div className="sub">
          {isFirstLogin
            ? "Sua conta foi criada por um administrador com uma senha provisória. Escolha agora a senha que você vai usar daqui pra frente."
            : "Escolha uma nova senha."}
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="password">Nova senha</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="confirm">Confirmar nova senha</label>
            <input
              id="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <button className="btn accent" type="submit" disabled={pending} style={{ width: "100%" }}>
            {pending ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>

        <div className="auth-switch">
          <button
            type="button"
            className="btn ghost"
            style={{ padding: "6px 12px", fontSize: 12.5 }}
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
