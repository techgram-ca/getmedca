import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@getmed/ui";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "GetMed Driver", template: "%s · GetMed Driver" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "GetMed Driver" },
  robots: { index: false },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};
export const viewport: Viewport = { themeColor: "#0f7a73", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-screen bg-ink-50">{children}<Toaster /><PwaRegister /></body>
    </html>
  );
}
