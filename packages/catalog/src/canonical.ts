import { keccak256, toBytes, type Hex } from "viem";

export type CanonicalJson =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalJson[]
  | { readonly [key: string]: CanonicalJson };

function serialize(value: unknown, path: string): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path} contains a non-finite number`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item, index) => serialize(item, `${path}[${index}]`)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => {
        const item = record[key];
        if (item === undefined) throw new TypeError(`${path}.${key} is undefined`);
        return `${JSON.stringify(key)}:${serialize(item, `${path}.${key}`)}`;
      });
    return `{${entries.join(",")}}`;
  }
  throw new TypeError(`${path} contains unsupported ${typeof value}`);
}

/** RFC-8785-like canonical JSON for this integer-free wire model. Object keys sort; arrays do not. */
export function canonicalJson(value: unknown): string {
  return serialize(value, "$");
}

export function hashCanonicalJson(value: unknown): Hex {
  return keccak256(toBytes(canonicalJson(value)));
}
