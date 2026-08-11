import { requireAdmin } from "@/lib/dal";
import { AdminUsersView } from "@/components/AdminUsersView";

export default async function AdminUsuariosPage() {
  const user = await requireAdmin();
  return <AdminUsersView currentUserId={user.id} />;
}
