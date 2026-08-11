"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      setError("E-mail ou senha incorretos.");
      return;
    }
    router.push("/lancamento");
    router.refresh();
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-logo">
          <Image src="/logo.png" alt="AstraZeneca" height={26} width={140} style={{ height: 26, width: "auto" }} />
        </div>
        <h1>Previsão de Vendas por Conta</h1>
        <div className="sub">Entre com seu e-mail corporativo.</div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="btn accent" type="submit" disabled={pending} style={{ width: "100%" }}>
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="auth-switch">
          Não tem conta? Peça para um administrador te cadastrar em Usuários.
        </div>
      </div>
    </div>
  );
}
