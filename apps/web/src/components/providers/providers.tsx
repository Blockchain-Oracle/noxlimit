"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { type State, WagmiProvider } from "wagmi";
import { OnlineStatusProvider } from "./online-status";
import { getConfig } from "@/lib/wallet/config";

export function Providers({ children, initialState }: { children: ReactNode; initialState?: State }) {
  const [config] = useState(() => getConfig());
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  }));
  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <OnlineStatusProvider>{children}</OnlineStatusProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
