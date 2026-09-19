import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@getmed/ui";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = { title: { default: "GetMed Admin", template: "%s · GetMed Admin" }, robots: { index: false } };
export const viewport: Viewport = { themeColor: "#0d1f1c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-screen">{children}<Toaster /></body>
    </html>
  );
}
