import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KOSPI NASDAQ Portfolio",
  description: "KOSPI, NASDAQ, and sector theme stock analysis portfolio"
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
