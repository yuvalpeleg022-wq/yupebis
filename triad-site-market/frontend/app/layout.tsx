import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth";
import Header from "@/components/Header";

const FONTS = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600;700&display=swap";

export const metadata: Metadata = {
  title: "TRIAD SITE MARKET - One-of-one websites",
  description: "AI-crafted, professionally reviewed websites. Each one sold exactly once.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Loaded at runtime so the build needs no network access to Google Fonts. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>
        <AuthProvider>
          <Header />
          <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
