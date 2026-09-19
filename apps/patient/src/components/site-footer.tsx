import Link from "next/link";
import { Logo } from "@getmed/ui";

const LINKS = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Consultations", href: "/consultation" },
  { label: "FAQs", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 bg-brand-50 px-6 py-10">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-5">
        <Link href="/" className="no-underline"><Logo /></Link>

        <ul className="flex list-none flex-wrap gap-6">
          {LINKS.map(({ label, href }) => (
            <li key={href}>
              <Link href={href} className="text-sm text-ink-500 no-underline transition-colors hover:text-ink-950">{label}</Link>
            </li>
          ))}
          <li>
            <a href={process.env.NEXT_PUBLIC_PHARMACY_URL ?? "https://pharmacy.getmed.ca"} className="text-sm text-ink-500 no-underline transition-colors hover:text-ink-950">
              For pharmacies
            </a>
          </li>
        </ul>

        <p className="flex items-center gap-1 text-xs text-ink-500">
          Made with <span className="text-brand-600">♥</span> by GetMed © {new Date().getFullYear()}
        </p>
      </div>
      <p className="mx-auto mt-6 max-w-[1200px] text-xs text-ink-400">
        Your information is handled in accordance with PIPEDA and PHIPA. Data is stored in Canada.
      </p>
    </footer>
  );
}
