"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type Config = { mesVigente: string; faseAtiva: "SE" | "MM" };

const ConfigContext = createContext<{ config: Config; refresh: () => Promise<void> }>({
  config: { mesVigente: "", faseAtiva: "SE" },
  refresh: async () => {},
});

export function useConfig() {
  return useContext(ConfigContext);
}

export function ConfigProvider({
  initial,
  children,
}: {
  initial: Config;
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<Config>(initial);

  const refresh = useCallback(async () => {
    const data = await apiFetch<Config>("/api/config");
    setConfig(data);
  }, []);

  return <ConfigContext.Provider value={{ config, refresh }}>{children}</ConfigContext.Provider>;
}
