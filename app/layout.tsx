import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KOSPI × NASDAQ Coupling Lab | 김승현",
  description: "시장 수익률, 환율과 하락 위험을 함께 비교하고 은행 상담 질문으로 연결하는 김승현의 금융시장 분석 포트폴리오"
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

