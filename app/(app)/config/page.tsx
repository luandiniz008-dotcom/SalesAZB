import { requireAdmin } from "@/lib/dal";
import { ConfigView } from "@/components/ConfigView";

export default async function ConfigPage() {
  await requireAdmin();
  return <ConfigView />;
}
