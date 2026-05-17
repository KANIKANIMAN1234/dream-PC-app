import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理Web（PC）",
  description: "ドリー夢 管理Web",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
