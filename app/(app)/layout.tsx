import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { getOrCreateSettings } from "@/lib/settings";
import { ToastProvider } from "@/components/ToastProvider";
import { ConfigProvider } from "@/components/ConfigContext";
import { FreeEditProvider } from "@/components/FreeEditContext";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Conta criada pelo admin com senha provisória — obrigado a trocar antes
  // de usar qualquer coisa (checagem redundante com o proxy.ts, de propósito).
  if (user.mustChangePassword) redirect("/change-password");
  const settings = await getOrCreateSettings();

  return (
    <ConfigProvider initial={{ mesVigente: settings.mesVigente, faseAtiva: settings.faseAtiva }}>
      <FreeEditProvider>
        <ToastProvider>
          <div className="app">
            <Sidebar user={user} />
            <main>{children}</main>
          </div>
        </ToastProvider>
      </FreeEditProvider>
    </ConfigProvider>
  );
}
