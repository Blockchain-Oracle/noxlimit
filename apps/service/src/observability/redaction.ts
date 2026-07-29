const PRIVATE_KEYS = new Set([
  "maxprice",
  "maxaverageprice",
  "minout",
  "privatelimit",
  "plaintext",
  "candidatevalue",
  "candidate",
  "candidatehandle",
  "resulthandle",
  "encryptedinput",
  "decryptionproof",
  "inputproof",
  "ciphertext",
  "signature",
  "authorization",
  "secret",
  "privatekey",
]);

const REDACTED = "[REDACTED]";

export function redactSensitive(value: unknown): unknown {
  return redact(value, new WeakSet<object>());
}

export function safeErrorSummary(error: unknown): Readonly<{
  name: string;
  statusCode?: number;
}> {
  if (!(error instanceof Error)) return { name: "UnknownError" };
  const statusCode = "statusCode" in error &&
    typeof (error as { statusCode?: unknown }).statusCode === "number"
    ? (error as { statusCode: number }).statusCode
    : undefined;
  return {
    name: error.name || "Error",
    ...(statusCode !== undefined ? { statusCode } : {}),
  };
}

function redact(value: unknown, seen: WeakSet<object>): unknown {
  if (value instanceof Error) return safeErrorSummary(value);
  if (Array.isArray(value)) return value.map((nested) => redact(nested, seen));
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.replaceAll(/[^a-zA-Z]/g, "").toLowerCase();
    output[key] = PRIVATE_KEYS.has(normalized) ? REDACTED : redact(nested, seen);
  }
  return output;
}

export const serviceLoggerRedactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.query.maxPrice",
  "req.query.maxAveragePrice",
  "req.query.minOut",
  "req.query.ciphertext",
  "req.body.maxPrice",
  "req.body.maxAveragePrice",
  "req.body.minOut",
  "req.body.signature",
  "req.body.candidate",
  "req.body.candidateHandle",
  "req.body.resultHandle",
  "req.body.encryptedInput",
  "req.body.inputProof",
  "req.body.decryptionProof",
  "req.body.ciphertext",
  "err.message",
  "err.cause",
  "privateKey",
] as const;
