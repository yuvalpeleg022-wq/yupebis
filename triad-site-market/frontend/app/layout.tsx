import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth";
import Header from "@/components/Header";

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-display" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "TRIAD SITE MARKET - One-of-one websites",
  description: "AI-crafted, professionally reviewed websites. Each one sold exactly once.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <AuthProvider>
          <Header />
          <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
