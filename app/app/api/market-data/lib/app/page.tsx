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

export default function Page() {
  const [data, setData] = useState<MarketData>(fallback);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"index" | "spread">("index");
  const [sectorKey, setSectorKey] = useState("semiconductor");
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/market-data", { cache: "no-store" });
      if (!res.ok) throw new Error("market data api error");
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

  const latest = data.indexData[data.indexData.length - 1];

  const summary = useMemo(() => {
    if (!latest) {
      return { kospi: "-", nasdaq: "-" };
    }

    return {
      kospi: `${(latest.kospi - 100).toFixed(1)}%`,
      nasdaq: `${(latest.nasdaq - 100).toFixed(1)}%`
    };
  }, [latest]);

  const sectorList = Object.values(data.sectors || {});
  const selectedSector = data.sectors?.[sectorKey] || sectorList[0];

  return (
    <main style={styles.page}>
      <section style={styles.container}>
        <nav style={styles.nav}>
          <div>
            <p style={styles.subText}>Financial Market Portfolio</p>
            <h1 style={styles.title}>KOSPI × NASDAQ Coupling Lab</h1>
          </div>

          <button onClick={loadData} style={styles.refreshButton}>
            <RefreshCcw size={16} />
            실제 데이터 새로고침
          </button>
        </nav>

        <section style={styles.hero}>
          <div style={styles.heroMain}>
            <p style={styles.badge}>Yahoo Finance 자동 연동</p>
            <h2 style={styles.heroTitle}>
              코스피와 나스닥, 그리고 섹터별 테마주의 연동성
            </h2>
            <p style={styles.description}>
              KOSPI와 NASDAQ 지수를 같은 기준일 100으로 환산하고,
              한국 상장 테마주와 미국 상장 테마주의 흐름을 섹터별로 비교합니다.
            </p>

            <div style={styles.stats}>
              <div style={styles.statBox}>
                <p style={styles.subText}>KOSPI 누적수익률</p>
                <h3>{summary.kospi}</h3>
              </div>
              <div style={styles.statBox}>
                <p style={styles.subText}>NASDAQ 누적수익률</p>
                <h3>{summary.nasdaq}</h3>
              </div>
              <div style={styles.statBox}>
                <p style={styles.subText}>상관계수</p>
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
              <h3>2024.01 = 100</h3>
              <p style={styles.cardText}>
                가격 단위가 다른 한국·미국 주식을 동일 기준으로 비교합니다.
              </p>
            </div>

            <div style={styles.card}>
              <p style={styles.subText}>핵심 기능</p>
              <h3>섹터별 테마 비교</h3>
              <p style={styles.cardText}>
                반도체, 2차전지, 자동차, 방산 섹터를 비교합니다.
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
                <LineChart data={data.indexData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="kospi" name="KOSPI" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="nasdaq" name="NASDAQ" strokeWidth={3} dot={false} />
                </LineChart>
              ) : (
                <BarChart data={data.indexData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
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
                  <p style={styles.subText}>섹터 상관계수</p>
                  <h3>{selectedSector.correlation ?? "-"}</h3>
                </div>
              </div>

              <div style={styles.chartBox}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedSector.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="korea" name="Korea Theme Basket" strokeWidth={3} fillOpacity={0.2} />
                    <Area type="monotone" dataKey="us" name="U.S. Theme Basket" strokeWidth={3} fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p style={styles.notice}>섹터 데이터를 불러오는 중입니다.</p>
          )}
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
  }
};
