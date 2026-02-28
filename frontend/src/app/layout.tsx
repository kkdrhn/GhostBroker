import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title:       "Ghost Broker — Autonomous Arbitrage on Monad",
  description: "Agentic Economy simulation with BrokerAgent NFTs, Ghost Market, and AI brains.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-ghost-900 text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
