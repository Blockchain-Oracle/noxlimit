"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const OnlineContext = createContext(true);

export function OnlineStatusProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return <OnlineContext.Provider value={online}>{children}</OnlineContext.Provider>;
}

export function useOnlineStatus() {
  return useContext(OnlineContext);
}
