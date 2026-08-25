import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "LekHub",
  description: "LekHub Activity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body><Script src="https://static.line-scdn.net/liff/edge/2/sdk.js" strategy="beforeInteractive" />{children}</body>
    </html>
  );
}
