import type { Metadata, Viewport } from "next";
import { Toaster } from "@getmed/ui";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_PATIENT_URL ?? "https://getmed.ca"),
  title: { default: "GetMed — Prescription delivery from local pharmacies", template: "%s · GetMed" },
  description:
    "Send your prescription to a nearby independent pharmacy and have it delivered to your door. Transfers and pharmacist consultations too. Ontario only.",
  openGraph: { type: "website", siteName: "GetMed", locale: "en_CA" },
};

export const viewport: Viewport = { themeColor: "#0f7a73", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Toaster />
      </body>
    </html>
  );
}
