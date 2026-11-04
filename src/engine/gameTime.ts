/** Fictional, deterministic session ticks. These values are never derived from the device clock. */
export function nextGameTick(lastTick = 0): number {
  return lastTick + 1;
}

export function formatGameTick(tick: number | string): string {
  const numeric = typeof tick === 'number' ? tick : Number(tick.replace(/^T\+/, ''));
  if (!Number.isFinite(numeric) || numeric > 1_000_000_000) return 'ARCHIVED SESSION';
  return `T+${String(Math.max(0, numeric)).padStart(4, '0')}`;
}

export function recordedGameTick(lastTick = 0): string {
  return formatGameTick(nextGameTick(lastTick));
}
