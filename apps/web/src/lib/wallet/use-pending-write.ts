"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import type { PublicClient } from "viem";
import type { ReceiptProgress } from "./transaction";

export type PendingWrite<Kind extends string> = Readonly<{
  kind: Kind;
  hash: `0x${string}`;
}>;

function validHash(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);
}

export function usePendingWrite<Kind extends string>(input: {
  storageKey: string;
  kinds: readonly Kind[];
  publicClient: PublicClient | undefined;
  poll: boolean;
}) {
  const [pending, setPending] = useState<PendingWrite<Kind> | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const kindsKey = input.kinds.join("|");

  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(input.storageKey) ?? "null") as Partial<PendingWrite<Kind>> | null;
      if (value && input.kinds.includes(value.kind as Kind) && validHash(value.hash)) setPending({ kind: value.kind as Kind, hash: value.hash });
      else localStorage.removeItem(input.storageKey);
    } catch { localStorage.removeItem(input.storageKey); }
    setHydrated(true);
  }, [input.storageKey, kindsKey]);

  const record = useCallback((kind: Kind, progress: ReceiptProgress) => {
    if (progress.state !== "SUBMITTED" && progress.state !== "REPLACED") return;
    const value = { kind, hash: progress.hash } as const;
    localStorage.setItem(input.storageKey, JSON.stringify(value));
    setPending(value);
  }, [input.storageKey]);

  const clear = useCallback(() => {
    localStorage.removeItem(input.storageKey);
    setPending(null);
  }, [input.storageKey]);

  const receipt = useQuery({
    queryKey: ["pending-wallet-write", input.storageKey, pending?.hash],
    enabled: Boolean(input.publicClient && pending && input.poll),
    retry: false,
    refetchInterval: (entry) => entry.state.data ? false : 3_000,
    queryFn: async () => {
      if (!input.publicClient || !pending) return null;
      try { return await input.publicClient.getTransactionReceipt({ hash: pending.hash }); }
      catch { return null; }
    },
  });

  return { pending, hydrated, record, clear, receipt };
}
