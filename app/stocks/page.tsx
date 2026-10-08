import type { Metadata } from "next";
import { StockLab } from "./stock-lab";
export const metadata: Metadata = {
  title: "국내 주식 분석 | 김승현",
  description:
    "국내 주식 캔들 차트, 기술적 지표, 수급과 근거 기반 매수 검토 후보를 확인합니다.",
};
export default function StocksPage() {
  return <StockLab />;
}
