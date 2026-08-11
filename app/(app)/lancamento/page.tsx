import { requireUser } from "@/lib/dal";
import { Wizard } from "@/components/wizard/Wizard";
import { AdminSamPicker } from "@/components/wizard/AdminSamPicker";

export default async function LancamentoPage() {
  const user = await requireUser();

  if (user.role === "ADMIN") {
    return <AdminSamPicker />;
  }

  if (!user.samName) {
    return (
      <div className="gate-warning">
        Sua conta ainda não está vinculada a um SAM da planilha mestre. Peça para um administrador
        configurar isso em Usuários.
      </div>
    );
  }

  return <Wizard sam={user.samName} />;
}
