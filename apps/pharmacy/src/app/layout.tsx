import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@getmed/ui";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Grow Your Pharmacy Online — GetMed", template: "%s · GetMed Pharmacy" },
  description:
    "GetMed helps independent Ontario pharmacies compete online: free onboarding, no contracts, no commission — you pay a flat fee only when an order is delivered.",
  robots: { index: false },
};
export const viewport: Viewport = { themeColor: "#2a9d8f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
