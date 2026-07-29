export type DataResult<T> =
  | { state: "ready"; data: T; asOf: string }
  | { state: "empty"; message: string }
  | { state: "offline"; message: string }
  | { state: "unavailable"; message: string };
