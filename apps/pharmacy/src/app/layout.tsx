import type { Metadata, Viewport } from "next";
import { Toaster } from "@getmed/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "GetMed for Pharmacies", template: "%s · GetMed Pharmacy" },
  description: "Grow your independent pharmacy with prescription delivery orders from patients nearby.",
  robots: { index: false },
};
export const viewport: Viewport = { themeColor: "#0f7a73", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
