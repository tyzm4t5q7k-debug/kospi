export type SeriesRow = { month: string; [key: string]: number | string | null };
export type Point = { month: string; value: number };

export const periodOptions = [
  { key: "1M", label: "1개월", days: 30 },
  { key: "3M", label: "3개월", days: 90 },
  { key: "6M", label: "6개월", days: 180 },
  { key: "1Y", label: "1년", days: 365 },
  { key: "ALL", label: "전체", days: null }
];

export function positive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function filterByPeriod<T extends { month: string }>(rows: T[], key: string, anchor?: string): T[] {
  const days = periodOptions.find((option) => option.key === key)?.days;
  if (!rows.length) return rows;
  if (days == null) return anchor ? rows.filter((row) => row.month <= anchor) : rows;
  const end = anchor || rows[rows.length - 1].month;
  const cutoff = new Date(end + "T00:00:00Z");
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const start = cutoff.toISOString().slice(0, 10);
  return rows.filter((row) => row.month >= start && row.month <= end);
}

export function rebaseRows(rows: SeriesRow[], keys: string[]): SeriesRow[] {
  const valid = rows.filter((row) => keys.every((key) => positive(row[key])));
  if (!valid.length) return [];
  return valid.map((row) => {
    const result: SeriesRow = { month: row.month };
    for (const key of keys) result[key] = Number(row[key]) / Number(valid[0][key]) * 100;
    if (keys.length > 1) result.spread = Number(result[keys[0]]) - Number(result[keys[1]]);
    return result;
  });
}

export function calculateReturn(rows: SeriesRow[], key: string): number | null {
  if (rows.length < 2 || rows.some((row) => !positive(row[key]))) return null;
  return (Number(rows[rows.length - 1][key]) / Number(rows[0][key]) - 1) * 100;
}

export function pearson(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 2 || [...x, ...y].some((v) => !Number.isFinite(v))) return null;
  const mx = x.reduce((a, b) => a + b, 0) / x.length;
  const my = y.reduce((a, b) => a + b, 0) / y.length;
  let xy = 0, xx = 0, yy = 0;
  for (let i = 0; i < x.length; i++) {
    xy += (x[i] - mx) * (y[i] - my);
    xx += (x[i] - mx) ** 2;
    yy += (y[i] - my) ** 2;
  }
  if (xx < 1e-20 || yy < 1e-20) return null;
  return Math.max(-1, Math.min(1, xy / Math.sqrt(xx * yy)));
}

// Calculate returns AFTER date alignment: every pair spans the same dates.
export function pairedReturns(rows: SeriesRow[], a: string, b: string) {
  const result: { month: string; a: number; b: number }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const previous = rows[i - 1], current = rows[i];
    if (![previous[a], previous[b], current[a], current[b]].every(positive)) continue;
    result.push({ month: current.month, a: Number(current[a]) / Number(previous[a]) - 1, b: Number(current[b]) / Number(previous[b]) - 1 });
  }
  return result;
}

export function returnCorrelation(rows: SeriesRow[], a: string, b: string): number | null {
  const returns = pairedReturns(rows, a, b);
  return pearson(returns.map((row) => row.a), returns.map((row) => row.b));
}

export function rollingCorrelation(rows: SeriesRow[], a: string, b: string, window = 20): SeriesRow[] {
  if (!Number.isInteger(window) || window < 2) return [];
  const returns = pairedReturns(rows, a, b);
  return returns.slice(window - 1).map((row, index) => {
    const sample = returns.slice(index, index + window);
    return { month: row.month, correlation: pearson(sample.map((p) => p.a), sample.map((p) => p.b)) };
  });
}

export function maxDrawdown(rows: SeriesRow[], key: string): number | null {
  if (rows.length < 2 || rows.some((row) => !positive(row[key]))) return null;
  let peak = Number(rows[0][key]), worst = 0;
  for (const row of rows) {
    peak = Math.max(peak, Number(row[key]));
    worst = Math.min(worst, (Number(row[key]) / peak - 1) * 100);
  }
  return worst;
}

export function alignSeries(a: Point[], b: Point[], aKey: string, bKey: string): SeriesRow[] {
  const other = new Map(b.filter((p) => positive(p.value)).map((p) => [p.month, p.value]));
  return a.filter((p) => positive(p.value) && other.has(p.month))
    .map((p) => ({ month: p.month, [aKey]: p.value, [bKey]: other.get(p.month)! }))
    .sort((x, y) => x.month.localeCompare(y.month));
}

export function convertToKrw(rows: SeriesRow[], fx: Point[], usKey: string): SeriesRow[] {
  const rates = new Map(fx.filter((p) => positive(p.value)).map((p) => [p.month, p.value]));
  return rows.filter((row) => rates.has(row.month) && positive(row[usKey]))
    .map((row) => ({ ...row, [usKey]: Number(row[usKey]) * rates.get(row.month)! }));
}

// Fixed constituents, equal initial investment, buy and hold from a shared base.
export function equalWeightBasket(series: Point[][]): Point[] {
  if (!series.length || series.some((rows) => !rows.length)) return [];
  const maps = series.map((rows) => new Map(rows.filter((p) => positive(p.value)).map((p) => [p.month, p.value])));
  const dates = [...maps[0].keys()].filter((date) => maps.every((map) => map.has(date))).sort();
  if (!dates.length) return [];
  return dates.map((month) => ({ month, value: maps.reduce((sum, map) => sum + map.get(month)! / map.get(dates[0])! * 100, 0) / maps.length }));
}

export function formatReturn(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function formatCorrelation(value: number | null): string {
  return value == null ? "—" : value.toFixed(3);
}
