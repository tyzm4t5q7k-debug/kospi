type IndexedPoint = {
  month: string;
  value: number;
};

const sectors = {
  semiconductor: {
    label: "반도체",
    koreaName: "삼성전자 · SK하이닉스",
    usName: "NVIDIA · AMD · Broadcom",
    korea: ["005930.KS", "000660.KS"],
    us: ["NVDA", "AMD", "AVGO"]
  },
  battery: {
    label: "2차전지",
    koreaName: "LG에너지솔루션 · 삼성SDI · 에코프로비엠",
    usName: "Tesla · Albemarle",
    korea: ["373220.KS", "006400.KS", "247540.KQ"],
    us: ["TSLA", "ALB"]
  },
  auto: {
    label: "자동차",
    koreaName: "현대차 · 기아",
    usName: "Tesla · GM · Ford",
    korea: ["005380.KS", "000270.KS"],
    us: ["TSLA", "GM", "F"]
  },
  defense: {
    label: "방산",
    koreaName: "한화에어로스페이스 · 현대로템 · LIG넥스원",
    usName: "Lockheed Martin · RTX · Northrop Grumman",
    korea: ["012450.KS", "064350.KS", "079550.KS"],
    us: ["LMT", "RTX", "NOC"]
  }
};

function unix(date: string) {
  return Math.floor(new Date(date).getTime() / 1000);
}

function dateFromUnix(timestamp: number) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

async function fetchYahooChart(symbol: string): Promise<IndexedPoint[]> {
  const period1 = unix("2024-01-01");
  const period2 = Math.floor(Date.now() / 1000);

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?period1=${period1}&period2=${period2}&interval=1d&events=history&includeAdjustedClose=true`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json"
    },
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance request failed: ${symbol} ${res.status}`);
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];

  if (!result) {
    throw new Error(`No Yahoo Finance result: ${symbol}`);
  }

  const timestamps: number[] = result.timestamp || [];
  const quote = result.indicators?.quote?.[0];
  const adjClose = result.indicators?.adjclose?.[0]?.adjclose || [];
  const close = quote?.close || [];

  const raw = timestamps
    .map((time, index) => ({
      month: dateFromUnix(time),
      price: adjClose[index] ?? close[index]
    }))
    .filter((p) => typeof p.price === "number" && Number.isFinite(p.price));

  const base = raw[0]?.price;

  if (!base) {
    throw new Error(`No valid price data: ${symbol}`);
  }

  return raw.map((p) => ({
    month: p.month,
    value: Number(((p.price / base) * 100).toFixed(2))
  }));
}

async function safeFetch(symbol: string) {
  try {
    return await fetchYahooChart(symbol);
  } catch (error) {
    console.error(symbol, error);
    return [];
  }
}

async function fetchBasket(symbols: string[]) {
  const allSeries = await Promise.all(symbols.map((symbol) => safeFetch(symbol)));

  const map = new Map<string, number[]>();

  for (const series of allSeries) {
    for (const point of series) {
      if (!map.has(point.month)) {
        map.set(point.month, []);
      }
      map.get(point.month)?.push(point.value);
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => ({
      month,
      value: Number(
        (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)
      )
    }));
}

function mergeSeries(a: IndexedPoint[], b: IndexedPoint[], aKey: string, bKey: string) {
  const bMap = new Map(b.map((p) => [p.month, p.value]));

  return a
    .filter((p) => bMap.has(p.month))
    .map((p) => ({
      month: p.month,
      [aKey]: p.value,
      [bKey]: bMap.get(p.month),
      spread: Number((p.value - Number(bMap.get(p.month))).toFixed(2))
    }));
}

function correlation(x: number[], y: number[]) {
  if (x.length !== y.length || x.length < 2) return null;

  const xMean = x.reduce((a, b) => a + b, 0) / x.length;
  const yMean = y.reduce((a, b) => a + b, 0) / y.length;

  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  for (let i = 0; i < x.length; i++) {
    const xd = x[i] - xMean;
    const yd = y[i] - yMean;

    numerator += xd * yd;
    xDenominator += xd * xd;
    yDenominator += yd * yd;
  }

  const denominator = Math.sqrt(xDenominator * yDenominator);

  if (!denominator) return null;

  return Number((numerator / denominator).toFixed(3));
}

export async function getMarketData() {
  const kospi = await fetchYahooChart("^KS11");
  const nasdaq = await fetchYahooChart("^IXIC");

  const indexData = mergeSeries(kospi, nasdaq, "kospi", "nasdaq");

  const sectorData: any = {};

  for (const [key, sector] of Object.entries(sectors)) {
    const korea = await fetchBasket(sector.korea);
    const us = await fetchBasket(sector.us);
    const data = mergeSeries(korea, us, "korea", "us");

    sectorData[key] = {
      key,
      label: sector.label,
      koreaName: sector.koreaName,
      usName: sector.usName,
      data,
      correlation: correlation(
        data.map((d: any) => d.korea),
        data.map((d: any) => d.us)
      )
    };
  }

  return {
    updatedAt: new Date().toISOString(),
    source: "Yahoo Finance Chart API - Daily Data",
    indexData,
    indexCorrelation: correlation(
      indexData.map((d: any) => d.kospi),
      indexData.map((d: any) => d.nasdaq)
    ),
    sectors: sectorData
  };
}
