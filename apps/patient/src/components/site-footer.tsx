import Link from "next/link";
import { Logo } from "@getmed/ui";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink-500">
            Prescription delivery and pharmacist consultations from independent pharmacies near you. Currently serving Ontario.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Patients</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="text-ink-700 hover:text-brand-700" href="/how-it-works">How it works</Link></li>
            <li><Link className="text-ink-700 hover:text-brand-700" href="/consultation">Consultations</Link></li>
            <li><Link className="text-ink-700 hover:text-brand-700" href="/faq">FAQ</Link></li>
            <li><Link className="text-ink-700 hover:text-brand-700" href="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Company</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="text-ink-700 hover:text-brand-700" href="/about">About GetMed</Link></li>
            <li><a className="text-ink-700 hover:text-brand-700" href={process.env.NEXT_PUBLIC_PHARMACY_URL ?? "https://pharmacy.getmed.ca"}>Join as a pharmacy</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-100">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-ink-400 sm:px-6">
          © {new Date().getFullYear()} GetMed. Your information is handled in accordance with PIPEDA and PHIPA. Data is stored in Canada.
        </p>
      </div>
    </footer>
  );
}
