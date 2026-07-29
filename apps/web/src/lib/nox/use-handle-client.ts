"use client";

import type { HandleClient } from "@iexec-nox/handle";
import { useQuery } from "@tanstack/react-query";
import { useWalletClient } from "wagmi";

export function useHandleClient() {
  const { data: walletClient } = useWalletClient();
  const query = useQuery<HandleClient | null>({
    queryKey: ["handle-client", walletClient?.account?.address, walletClient?.chain?.id],
    queryFn: async () => {
      if (!walletClient) return null;
      const { createViemHandleClient } = await import("@iexec-nox/handle");
      return createViemHandleClient(walletClient);
    },
    enabled: Boolean(walletClient),
    staleTime: Infinity,
    retry: false,
  });
  return {
    handleClient: query.data ?? null,
    isPending: query.isPending && Boolean(walletClient),
    error: query.error instanceof Error ? query.error.message : null,
  };
}
