import { requireUser } from "@/lib/dal";
import { FaturamentoView } from "@/components/FaturamentoView";
import { AdminFaturamentoPicker } from "@/components/AdminFaturamentoPicker";

export default async function FaturamentoPage() {
  const user = await requireUser();

  if (user.role === "ADMIN") {
    return <AdminFaturamentoPicker />;
  }

  if (!user.samName) {
    return (
      <div className="gate-warning">
        Sua conta ainda não está vinculada a um SAM da planilha mestre. Peça para um administrador
        configurar isso em Usuários.
      </div>
    );
  }

  return <FaturamentoView sam={user.samName} />;
}
