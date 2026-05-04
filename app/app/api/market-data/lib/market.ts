import yahooFinance from "yahoo-finance2";

type Point = {
  date: Date;
  close?: number;
  adjClose?: number;
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

function indexTo100(points: Point[]) {
  const sorted = points
    .filter((p) => p.close || p.adjClose)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const base = sorted[0]?.adjClose ?? sorted[0]?.close;
  if (!base) return [];

  return sorted.map((p) => {
    const price = p.adjClose ?? p.close ?? 0;
    return {
      month: p.date.toISOString().slice(0, 7),
      value: Number(((price / base) * 100).toFixed(2))
    };
  });
}

async function fetchIndex(symbol: string) {
  const result = await yahooFinance.historical(symbol, {
    period1: "2024-01-01",
    period2: new Date().toISOString().slice(0, 10),
    interval: "1mo"
  });

  return indexTo100(result as Point[]);
}

async function fetchBasket(symbols: string[]) {
  const series = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        return await fetchIndex(symbol);
      } catch {
        return [];
      }
    })
  );

  const map = new Map<string, number[]>();

  for (const item of series) {
    for (const point of item) {
      if (!map.has(point.month)) map.set(point.month, []);
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

function mergeSeries(a: any[], b: any[], aKey: string, bKey: string) {
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
  const kospi = await fetchIndex("^KS11");
  const nasdaq = await fetchIndex("^IXIC");

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
    source: "Yahoo Finance",
    indexData,
    indexCorrelation: correlation(
      indexData.map((d: any) => d.kospi),
      indexData.map((d: any) => d.nasdaq)
    ),
    sectors: sectorData
  };
}
