"use client";

import { useEffect, useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function SetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/public/bootstrap-status")
      .then((r) => r.json())
      .then((d) => setIsFirstUser(!!d.isFirstUser))
      .catch(() => setIsFirstUser(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível concluir o setup.");
        setPending(false);
        return;
      }
      const signInRes = await signIn("credentials", { email, password, redirect: false });
      setPending(false);
      if (signInRes?.error) {
        router.push("/login");
        return;
      }
      router.push("/lancamento");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setPending(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-logo">
          <Image src="/logo.png" alt="AstraZeneca" height={26} width={140} style={{ height: 26, width: "auto" }} />
        </div>
        <h1>Configuração inicial</h1>
        <div className="sub">Crie a primeira conta (administradora) do sistema.</div>

        {isFirstUser === false ? (
          <>
            <div className="config-note">
              O sistema já tem um administrador configurado. Não é possível criar contas por aqui —
              peça para um administrador te cadastrar.
            </div>
            <div className="auth-switch">
              <Link href="/login">Ir para o login</Link>
            </div>
          </>
        ) : (
          <>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="name">Nome completo</label>
                <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="auth-field">
                <label htmlFor="email">E-mail corporativo</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@astrazeneca.com"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="password">Senha</label>
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
              <button className="btn accent" type="submit" disabled={pending || isFirstUser === null} style={{ width: "100%" }}>
                {pending ? "Criando conta..." : "Criar administrador"}
              </button>
            </form>
            <div className="auth-switch">
              Já tem conta? <Link href="/login">Entrar</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
