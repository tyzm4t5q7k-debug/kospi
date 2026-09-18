// Public hypothetical example only. No contest observations or aggregates.
export function experimentRange(fixedCost: number) {
  if (!Number.isSafeInteger(fixedCost) || fixedCost < 0 || fixedCost > 1000000) return null;
  const lower = Math.max(1, Math.floor(fixedCost / 200) + 1);
  const upper = Math.min(2000, Math.floor((500000 - fixedCost) / 300));
  return { lower, upper, feasible: lower <= upper,
    downsideAt1000: -300000 - fixedCost, upsideAt1000: 200000 - fixedCost };
}
