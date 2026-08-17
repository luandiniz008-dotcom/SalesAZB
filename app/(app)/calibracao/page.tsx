import { requireUser } from "@/lib/dal";
import { CalibracaoView } from "@/components/CalibracaoView";
import { AdminCalibracaoPicker } from "@/components/AdminCalibracaoPicker";

export default async function CalibracaoPage() {
  const user = await requireUser();

  if (user.role === "ADMIN") {
    return <AdminCalibracaoPicker />;
  }

  if (!user.samName) {
    return (
      <div className="gate-warning">
        Sua conta ainda não está vinculada a um SAM da planilha mestre. Peça para um administrador
        configurar isso em Usuários.
      </div>
    );
  }

  return <CalibracaoView sam={user.samName} />;
}
