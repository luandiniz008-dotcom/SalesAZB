"use client";

import { createContext, useContext, useState } from "react";

// "Liberar SE e MM juntos" — exceção manual do usuário logado, só na sessão
// do navegador (não persiste), assim como no dashboard original.
const FreeEditContext = createContext<{ freeEdit: boolean; setFreeEdit: (v: boolean) => void }>({
  freeEdit: false,
  setFreeEdit: () => {},
});

export function useFreeEdit() {
  return useContext(FreeEditContext);
}

export function FreeEditProvider({ children }: { children: React.ReactNode }) {
  const [freeEdit, setFreeEdit] = useState(false);
  return (
    <FreeEditContext.Provider value={{ freeEdit, setFreeEdit }}>{children}</FreeEditContext.Provider>
  );
}
