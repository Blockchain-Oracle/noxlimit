export type BlockRange = Readonly<{ fromBlock: bigint; toBlock: bigint }>;

export function boundedBlockRanges(
  fromBlock: bigint,
  toBlock: bigint,
  maximumSpan: bigint,
): BlockRange[] {
  if (fromBlock < 0n || toBlock < fromBlock || maximumSpan <= 0n) {
    throw new RangeError("invalid block range");
  }
  const ranges: BlockRange[] = [];
  for (let cursor = fromBlock; cursor <= toBlock; cursor += maximumSpan) {
    const end = cursor + maximumSpan - 1n;
    ranges.push({ fromBlock: cursor, toBlock: end < toBlock ? end : toBlock });
  }
  return ranges;
}

export function replayFromWithOverlap(
  lastSafeBlock: bigint | undefined,
  deploymentBlock: bigint,
  overlap: bigint,
): bigint {
  if (deploymentBlock < 0n || overlap < 0n) throw new RangeError("invalid replay boundary");
  if (lastSafeBlock === undefined || lastSafeBlock <= deploymentBlock) return deploymentBlock;
  const candidate = lastSafeBlock - overlap;
  return candidate > deploymentBlock ? candidate : deploymentBlock;
}
