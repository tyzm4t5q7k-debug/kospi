import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KOSPI × NASDAQ Coupling Lab | 김승현",
  description: "시장 동조화, 해외투자의 환율 효과, 기업 현금흐름을 세 가지 사례로 분석하는 김승현의 금융 포트폴리오. 대표 분석 보고서와 최신 시장 비교 도구를 제공합니다."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, background: "#020617" }}>
        {children}
      </body>
    </html>
  );
}
