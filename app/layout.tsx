import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "김승현 | 금융·데이터 분석 포트폴리오",
  description: "소비 변화 분해를 통한 상권 마케팅 실험 설계와 시장·환율·현금흐름 분석. 분석 방법, 서비스 기획, 가상 시연 및 최신 시장 비교 도구를 소개합니다."
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
