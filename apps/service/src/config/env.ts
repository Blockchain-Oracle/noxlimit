import { isAbsolute } from "node:path";

import { z } from "zod";
import type { Address, Hex } from "viem";

const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/).transform(
  (value): Address => value.toLowerCase() as Address,
);
const privateKey = z.string().regex(/^0x[0-9a-fA-F]{64}$/).transform(
  (value): Hex => value as Hex,
);

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(8787),
    WEB_ORIGIN: z.string().url().transform((value) => new URL(value).origin)
      .default("http://127.0.0.1:3000"),
    SEPOLIA_RPC_URL: z.string().url(),
    CATALOG_MANIFEST_PATH: z.string().min(1).default("packages/catalog/sepolia/markets.json"),
    CATALOG_RELOAD_POINTER_PATH: z.string().min(1).refine(
      isAbsolute,
      "CATALOG_RELOAD_POINTER_PATH must be absolute",
    ).optional(),
    WORKER_PRIVATE_KEY: privateKey.optional(),
    FUNDING_TREASURY_ADDRESS: address.optional(),
    NOX_COMPUTE_ADDRESS: address.optional(),
    NOX_GATEWAY_URL: z.string().url().optional(),
    NOX_SUBGRAPH_URL: z.string().url().optional(),
    POLL_INTERVAL_MS: z.coerce.number().int().min(1_000).max(60_000).default(5_000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  })
  .strict();

const SERVICE_ENVIRONMENT_KEYS = [
  "NODE_ENV",
  "HOST",
  "PORT",
  "WEB_ORIGIN",
  "SEPOLIA_RPC_URL",
  "CATALOG_MANIFEST_PATH",
  "CATALOG_RELOAD_POINTER_PATH",
  "WORKER_PRIVATE_KEY",
  "FUNDING_TREASURY_ADDRESS",
  "NOX_COMPUTE_ADDRESS",
  "NOX_GATEWAY_URL",
  "NOX_SUBGRAPH_URL",
  "POLL_INTERVAL_MS",
  "LOG_LEVEL",
] as const;

export type ServiceConfig = z.infer<typeof environmentSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): ServiceConfig {
  const selected = Object.fromEntries(
    SERVICE_ENVIRONMENT_KEYS.flatMap((key) => {
      const value = environment[key];
      return value === undefined ? [] : [[key, value] as const];
    }),
  );
  return environmentSchema.parse(selected);
}
