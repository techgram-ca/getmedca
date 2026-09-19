import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@getmed/ui";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_PATIENT_URL ?? "https://getmed.ca"),
  title: { default: "GetMed – Get Your Medicines Delivered", template: "%s · GetMed" },
  description:
    "Quickly order prescription medicines from nearby pharmacies and get them delivered straight to your door — safe, fast, and hassle-free.",
  openGraph: { type: "website", siteName: "GetMed", locale: "en_CA" },
};

export const viewport: Viewport = { themeColor: "#2a9d8f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
