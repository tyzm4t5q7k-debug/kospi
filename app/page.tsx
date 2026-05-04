"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { RefreshCcw } from "lucide-react";

type MarketData = {
  updatedAt: string;
  source: string;
  indexCorrelation: number | null;
  indexData: any[];
  sectors: Record<string, any>;
};

const fallback: MarketData = {
  updatedAt: "",
  source: "",
  indexCorrelation: null,
  indexData: [],
  sectors: {}
};

const periodOptions = [
  { key: "1M", label: "1개월", days: 30 },
  { key: "3M", label: "3개월", days: 90 },
  { key: "6M", label: "6개월", days: 180 },
  { key: "1Y", label: "1년", days: 365 },
  { key: "ALL", label: "전체", days: null }
];

function filterByPeriod(rows: any[], periodKey: string) {
  const option = periodOptions.find((item) => item.key === periodKey);

  if (!option || option.days === null || rows.length === 0) {
    return rows;
  }

  const lastDate = new Date(rows[rows.length - 1].month);
  const cutoff = new Date(lastDate);
  cutoff.setDate(cutoff.getDate() - option.days);

  return rows.filter((row) => new Date(row.month) >= cutoff);
}

function rebaseRows(rows: any[], keys: string[]) {
  if (rows.length === 0) return [];

  const base = rows[0];

  return rows.map((row) => {
    const rebased: any = { month: row.month };

    for (const key of keys) {
      const baseValue = Number(base[key]);
      const currentValue = Number(row[key]);

      rebased[key] = baseValue
        ? Number(((currentValue / baseValue) * 100).toFixed(2))
        : null;
    }

    if (keys.length >= 2) {
      rebased.spread = Number(
        (Number(rebased[keys[0]]) - Number(rebased[keys[1]])).toFixed(2)
      );
    }

    return rebased;
  });
}

function calculateReturn(rows: any[], key: string) {
  if (rows.length < 2) return "-";

  const first = Number(rows[0][key]);
  const last = Number(rows[rows.length - 1][key]);

  if (!first) return "-";

  return `${(((last / first) - 1) * 100).toFixed(1)}%`;
}

export default function Page() {
  const [data, setData] = useState<MarketData>(fallback);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"index" | "spread">("index");
  const [sectorKey, setSectorKey] = useState("semiconductor");
  const [periodKey, setPeriodKey] = useState("ALL");
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/market-data", { cache: "no-store" });

      if (!res.ok) {
        throw new Error("market data api error");
      }

      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로딩 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredIndexData = useMemo(() => {
    const filtered = filterByPeriod(data.indexData, periodKey);
    return rebaseRows(filtered, ["kospi", "nasdaq"]);
  }, [data.indexData, periodKey]);

  const sectorList = Object.values(data.sectors || {});
  const selectedSector = data.sectors?.[sectorKey] || sectorList[0];

  const filteredSectorData = useMemo(() => {
    if (!selectedSector?.data) return [];

    const filtered = filterByPeriod(selectedSector.data, periodKey);
    return rebaseRows(filtered, ["korea", "us"]);
  }, [selectedSector, periodKey]);

  const summary = useMemo(() => {
    return {
      kospi: calculateReturn(filteredIndexData, "kospi"),
      nasdaq: calculateReturn(filteredIndexData, "nasdaq")
    };
  }, [filteredIndexData]);

  return (
    <main style={styles.page}>
      <section style={styles.container}>
        <nav style={styles.nav}>
          <div>
            <p style={styles.subText}>Financial Market Portfolio</p>
            <h1 style={styles.title}>KOSPI × NASDAQ Coupling Lab</h1>
            <p style={styles.ownerText}>Built by Seunghyun Kim</p>
          </div>

          <button onClick={loadData} style={styles.refreshButton}>
            <RefreshCcw size={16} />
            실제 데이터 새로고침
          </button>
        </nav>

        <section style={styles.hero}>
          <div style={styles.heroMain}>
            <p style={styles.badge}>Yahoo Finance 자동 연동 · 일별 데이터</p>

            <h2 style={styles.heroTitle}>
              코스피와 나스닥, 그리고 섹터별 테마주의 연동성
            </h2>

            <p style={styles.description}>
              KOSPI와 NASDAQ 지수를 같은 기준일 100으로 환산하고,
              한국 상장 테마주와 미국 상장 테마주의 흐름을 섹터별로 비교합니다.
              기간별 수익률 흐름을 선택할 수 있도록 1개월, 3개월, 6개월, 1년,
              전체 보기 기능을 추가했습니다.
            </p>

            <div style={styles.periodBox}>
              {periodOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setPeriodKey(option.key)}
                  style={periodKey === option.key ? styles.activeButton : styles.button}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div style={styles.stats}>
              <div style={styles.statBox}>
                <p style={styles.subText}>선택 기간 KOSPI 수익률</p>
                <h3>{summary.kospi}</h3>
              </div>

              <div style={styles.statBox}>
                <p style={styles.subText}>선택 기간 NASDAQ 수익률</p>
                <h3>{summary.nasdaq}</h3>
              </div>

              <div style={styles.statBox}>
                <p style={styles.subText}>전체 기간 상관계수</p>
                <h3>{data.indexCorrelation ?? "-"}</h3>
              </div>
            </div>

            <p style={styles.notice}>
              {loading && "데이터를 불러오는 중입니다."}
              {error && `오류: ${error}`}
              {!loading && !error && data.updatedAt
                ? `마지막 업데이트: ${new Date(data.updatedAt).toLocaleString("ko-KR")}`
                : ""}
            </p>
          </div>

          <div style={styles.heroSide}>
            <div style={styles.card}>
              <p style={styles.subText}>분석 기준</p>
              <h3>선택 기간 첫날 = 100</h3>
              <p style={styles.cardText}>
                기간을 바꾸면 해당 기간의 첫 거래일을 100으로 다시 환산합니다.
              </p>
            </div>

            <div style={styles.card}>
              <p style={styles.subText}>확장 섹터</p>
              <h3>11개 테마</h3>
              <p style={styles.cardText}>
                반도체, 2차전지, 자동차, 방산, AI, 조선, 전력기기, 바이오, 금융,
                원전, 로봇을 비교합니다.
              </p>
            </div>
          </div>
        </section>

        <section style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <div>
              <p style={styles.subText}>Indexed Price Movement</p>
              <h2>KOSPI · NASDAQ 지수화 비교</h2>
            </div>

            <div style={styles.buttonGroup}>
              <button
                onClick={() => setView("index")}
                style={view === "index" ? styles.activeButton : styles.button}
              >
                지수 비교
              </button>

              <button
                onClick={() => setView("spread")}
                style={view === "spread" ? styles.activeButton : styles.button}
              >
                격차 보기
              </button>
            </div>
          </div>

          <div style={styles.chartBox}>
            <ResponsiveContainer width="100%" height="100%">
              {view === "index" ? (
                <LineChart data={filteredIndexData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#94a3b8" minTickGap={28} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="kospi"
                    name="KOSPI"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="nasdaq"
                    name="NASDAQ"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              ) : (
                <BarChart data={filteredIndexData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#94a3b8" minTickGap={28} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="spread" name="KOSPI - NASDAQ" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </section>

        <section style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <div>
              <p style={styles.subText}>Sector Theme Stocks</p>
              <h2>섹터별 한국·미국 테마주 비교</h2>
            </div>

            <div style={styles.buttonGroup}>
              {sectorList.map((sector: any) => (
                <button
                  key={sector.key}
                  onClick={() => setSectorKey(sector.key)}
                  style={sectorKey === sector.key ? styles.activeButton : styles.button}
                >
                  {sector.label}
                </button>
              ))}
            </div>
          </div>

          {selectedSector ? (
            <>
              <div style={styles.stats}>
                <div style={styles.statBox}>
                  <p style={styles.subText}>한국 대표 종목</p>
                  <h3>{selectedSector.koreaName}</h3>
                </div>

                <div style={styles.statBox}>
                  <p style={styles.subText}>미국 대표 종목</p>
                  <h3>{selectedSector.usName}</h3>
                </div>

                <div style={styles.statBox}>
                  <p style={styles.subText}>전체 기간 섹터 상관계수</p>
                  <h3>{selectedSector.correlation ?? "-"}</h3>
                </div>
              </div>

              <div style={styles.chartBox}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredSectorData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#94a3b8" minTickGap={28} />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="korea"
                      name="Korea Theme Basket"
                      strokeWidth={3}
                      fillOpacity={0.2}
                    />
                    <Area
                      type="monotone"
                      dataKey="us"
                      name="U.S. Theme Basket"
                      strokeWidth={3}
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p style={styles.notice}>섹터 데이터를 불러오는 중입니다.</p>
          )}
        </section>

        <section style={styles.aboutSection}>
          <div>
            <p style={styles.subText}>About This Project</p>
            <h2 style={styles.sectionTitle}>프로젝트 소개</h2>
            <p style={styles.profileLine}>
              김승현 | 경제통상학 전공 · 금융권 취업 포트폴리오
            </p>
            <p style={styles.aboutText}>
              이 프로젝트는 경제통상학 전공자로서 국내외 주식시장의 연동성을 데이터 기반으로
              해석하기 위해 제작한 금융시장 분석 포트폴리오입니다. 단순히 지수 수준을 비교하는
              것이 아니라, 서로 다른 가격 단위와 통화를 가진 시장을 동일 기준으로 지수화하고,
              기간별 수익률과 섹터별 테마 흐름을 함께 비교하는 데 초점을 두었습니다.
            </p>
          </div>

          <div style={styles.aboutGrid}>
            <div style={styles.aboutCard}>
              <h3>시장 이해도</h3>
              <p>
                한국 시장이 미국 기술주, 금리, 환율, 글로벌 섹터 모멘텀에 어떤 영향을 받는지
                시각적으로 확인합니다.
              </p>
            </div>

            <div style={styles.aboutCard}>
              <h3>데이터 활용 역량</h3>
              <p>
                Yahoo Finance 데이터를 자동으로 불러오고, 지수화·수익률·상관계수 계산을 통해
                분석합니다.
              </p>
            </div>

            <div style={styles.aboutCard}>
              <h3>금융권 직무 연결</h3>
              <p>
                은행·증권·자산관리 직무에서 필요한 시장 설명력, 상품 이해력, 고객 커뮤니케이션
                역량과 연결할 수 있습니다.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#020617",
    color: "#f8fafc",
    fontFamily: "Arial, sans-serif"
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: 32
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 32
  },
  title: {
    margin: 0,
    fontSize: 28
  },
  subText: {
    color: "#94a3b8",
    margin: 0,
    fontSize: 14
  },
  ownerText: {
    color: "#cbd5e1",
    margin: "6px 0 0 0",
    fontSize: 14
  },
  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: 0,
    borderRadius: 16,
    padding: "12px 16px",
    background: "#ffffff",
    color: "#020617",
    fontWeight: 700
  },
  hero: {
    display: "grid",
    gridTemplateColumns: "1.4fr 0.6fr",
    gap: 24,
    marginBottom: 24
  },
  heroMain: {
    border: "1px solid #1e293b",
    background: "#0f172a",
    borderRadius: 28,
    padding: 32
  },
  heroSide: {
    display: "grid",
    gap: 16
  },
  badge: {
    display: "inline-block",
    padding: "8px 12px",
    border: "1px solid #334155",
    borderRadius: 999,
    color: "#cbd5e1",
    marginBottom: 16
  },
  heroTitle: {
    fontSize: 44,
    lineHeight: 1.15,
    margin: "0 0 16px 0"
  },
  description: {
    color: "#cbd5e1",
    lineHeight: 1.7,
    fontSize: 17
  },
  periodBox: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 20
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    marginTop: 20,
    marginBottom: 20
  },
  statBox: {
    background: "#1e293b",
    borderRadius: 18,
    padding: 16
  },
  card: {
    border: "1px solid #1e293b",
    background: "#0f172a",
    borderRadius: 24,
    padding: 24
  },
  cardText: {
    color: "#94a3b8",
    lineHeight: 1.6
  },
  notice: {
    color: "#94a3b8"
  },
  chartCard: {
    border: "1px solid #1e293b",
    background: "#0f172a",
    borderRadius: 28,
    padding: 28,
    marginBottom: 24
  },
  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 24
  },
  buttonGroup: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap"
  },
  button: {
    border: 0,
    borderRadius: 14,
    padding: "10px 14px",
    background: "#1e293b",
    color: "#e2e8f0",
    fontWeight: 700
  },
  activeButton: {
    border: 0,
    borderRadius: 14,
    padding: "10px 14px",
    background: "#ffffff",
    color: "#020617",
    fontWeight: 700
  },
  chartBox: {
    height: 360
  },
  aboutSection: {
    border: "1px solid #1e293b",
    background: "#0f172a",
    borderRadius: 28,
    padding: 32,
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 28,
    margin: "8px 0 8px 0"
  },
  profileLine: {
    color: "#e2e8f0",
    margin: "0 0 14px 0",
    fontSize: 15,
    fontWeight: 700
  },
  aboutText: {
    color: "#cbd5e1",
    lineHeight: 1.8,
    fontSize: 16
  },
  aboutGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
    marginTop: 20
  },
  aboutCard: {
    background: "#1e293b",
    borderRadius: 18,
    padding: 18,
    color: "#cbd5e1",
    lineHeight: 1.6
  }
};
