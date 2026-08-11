"use client";

import { useEffect, useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/ToastProvider";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SAM";
  samName: string | null;
  mustChangePassword: boolean;
  createdAt: string;
};

export function AdminUsersView({ currentUserId }: { currentUserId: string }) {
  const toast = useToast();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [sams, setSams] = useState<string[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "SAM">("SAM");
  const [newSam, setNewSam] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    const [u, s] = await Promise.all([
      apiFetch<{ users: UserRow[] }>("/api/admin/users"),
      apiFetch<{ sams: string[] }>("/api/public/sams"),
    ]);
    setUsers(u.users);
    setSams(s.sams);
  }
  // Carga inicial: sincroniza o estado local com o servidor (sistema externo).
  // O setState real acontece depois do await, dentro da função de carga.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  function patchLocal(id: string, patch: Partial<UserRow>) {
    setUsers((prev) => prev && prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  async function salvar(u: UserRow) {
    setSaving(u.id);
    try {
      await apiFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ id: u.id, role: u.role, samName: u.samName }),
      });
      toast(`Usuário ${u.name} atualizado.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao salvar usuário.");
    } finally {
      setSaving(null);
    }
  }

  async function salvarNovaSenha(id: string) {
    if (resetPassword.length < 8) {
      toast("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setSaving(id);
    try {
      await apiFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ id, password: resetPassword }),
      });
      toast("Senha redefinida com sucesso.");
      setResetId(null);
      setResetPassword("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao redefinir senha.");
    } finally {
      setSaving(null);
    }
  }

  async function criarUsuario(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
          samName: newRole === "SAM" ? newSam : undefined,
        }),
      });
      toast(`Conta criada para ${newName}.`);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("SAM");
      setNewSam("");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao criar usuário.");
    } finally {
      setCreating(false);
    }
  }

  if (!users) return <div className="empty-list">Carregando...</div>;

  return (
    <section>
      <div className="top-row">
        <div>
          <h1>Usuários</h1>
          <div className="sub">Não existe auto-cadastro — só um administrador cria contas por aqui.</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-soft)", marginBottom: 10 }}>
          Criar novo usuário
        </div>
        <form onSubmit={criarUsuario}>
          <div className="detail-grid" style={{ marginBottom: 14 }}>
            <div className="df">
              <label>Nome completo</label>
              <input
                type="text"
                className="on-light"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="df">
              <label>E-mail corporativo</label>
              <input
                type="email"
                className="on-light"
                required
                placeholder="nome@astrazeneca.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="df">
              <label>Senha inicial</label>
              <input
                type="text"
                className="on-light"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="df">
              <label>Perfil</label>
              <select className="on-light" value={newRole} onChange={(e) => setNewRole(e.target.value as "ADMIN" | "SAM")}>
                <option value="SAM">SAM</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            {newRole === "SAM" && (
              <div className="df">
                <label>SAM vinculado</label>
                <select className="on-light" required value={newSam} onChange={(e) => setNewSam(e.target.value)}>
                  <option value="">Selecione...</option>
                  {sams.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button className="btn accent" type="submit" disabled={creating}>
            {creating ? "Criando..." : "Criar usuário"}
          </button>
        </form>
      </div>

      <div className="review-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th><th>E-mail</th><th>Status</th><th>Perfil</th><th>SAM vinculado</th><th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${u.mustChangePassword ? "pending" : "done"}`}>
                    {u.mustChangePassword ? "Aguardando 1º login" : "Ativo"}
                  </span>
                </td>
                <td>
                  <select
                    className="on-light"
                    value={u.role}
                    disabled={u.id === currentUserId}
                    onChange={(e) => patchLocal(u.id, { role: e.target.value as "ADMIN" | "SAM" })}
                  >
                    <option value="SAM">SAM</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </td>
                <td>
                  {u.role === "SAM" ? (
                    <select
                      className="on-light"
                      value={u.samName || ""}
                      onChange={(e) => patchLocal(u.id, { samName: e.target.value || null })}
                    >
                      <option value="">— não vinculado —</option>
                      {sams.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ color: "var(--ink-soft)" }}>—</span>
                  )}
                </td>
                <td>
                  <div className="actions">
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ padding: "6px 12px", fontSize: 12.5 }}
                      disabled={saving === u.id}
                      onClick={() => salvar(u)}
                    >
                      {saving === u.id ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ padding: "6px 12px", fontSize: 12.5 }}
                      onClick={() => {
                        setResetId(resetId === u.id ? null : u.id);
                        setResetPassword("");
                      }}
                    >
                      {resetId === u.id ? "Cancelar" : "Redefinir senha"}
                    </button>
                  </div>
                  {resetId === u.id && (
                    <div className="import-row" style={{ marginTop: 8 }}>
                      <input
                        type="text"
                        className="on-light"
                        placeholder="Nova senha (mín. 8 caracteres)"
                        style={{ maxWidth: 220 }}
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn secondary"
                        style={{ padding: "6px 12px", fontSize: 12.5 }}
                        disabled={saving === u.id}
                        onClick={() => salvarNovaSenha(u.id)}
                      >
                        Salvar senha
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
