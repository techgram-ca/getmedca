"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo, cn } from "@getmed/ui";

const LINKS = [
  { label: "Consult a Pharmacist", href: "/consultation" },
  { label: "About GetMed", href: "/about" },
  { label: "FAQs", href: "/faq" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  function orderPrescription(e: React.MouseEvent) {
    e.preventDefault();
    setOpen(false);
    if (pathname === "/") document.getElementById("hero-address-input")?.focus();
    else router.push("/?focus=address");
  }

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-ink-200 bg-ink-50/90 backdrop-blur-[16px]">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Link href="/" aria-label="GetMed home" className="focus-ring rounded-md no-underline">
          <Logo />
        </Link>

        <ul className="hidden list-none items-center gap-8 md:flex">
          <li>
            <a href="/" onClick={orderPrescription} className="cursor-pointer text-sm font-medium text-brand-600 no-underline transition-colors hover:text-ink-950">
              Order Prescription
            </a>
          </li>
          {LINKS.map(({ label, href }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn("text-sm font-medium no-underline transition-colors hover:text-ink-950", pathname.startsWith(href) ? "text-ink-950" : "text-brand-600")}
              >
                {label}
              </Link>
            </li>
          ))}
          <li>
            <a
              href={process.env.NEXT_PUBLIC_PHARMACY_URL ?? "https://pharmacy.getmed.ca"}
              className="rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 no-underline transition-soft hover:border-brand-600 hover:text-brand-700"
            >
              For Pharmacies
            </a>
          </li>
        </ul>

        <button className="cursor-pointer border-none bg-transparent p-2 text-ink-950 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div className="flex flex-col gap-4 border-t border-ink-200 bg-ink-50 px-6 py-4 md:hidden animate-fade-in">
          <a href="/" onClick={orderPrescription} className="cursor-pointer text-sm font-medium text-brand-600 no-underline">Order Prescription</a>
          {LINKS.map(({ label, href }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className="text-sm font-medium text-brand-600 no-underline">{label}</Link>
          ))}
          <a href={process.env.NEXT_PUBLIC_PHARMACY_URL ?? "https://pharmacy.getmed.ca"} className="text-sm font-medium text-ink-700 no-underline">For Pharmacies</a>
        </div>
      ) : null}
    </nav>
  );
}
