import { requireUser } from "@/lib/dal";
import { ConsolidadoView } from "@/components/ConsolidadoView";

export default async function ConsolidadoPage() {
  const user = await requireUser();
  return <ConsolidadoView isAdmin={user.role === "ADMIN"} />;
}
