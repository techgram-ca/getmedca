"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button, Logo, cn } from "@getmed/ui";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/consultation", label: "Consultations" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="GetMed home" className="focus-ring rounded-md">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-soft focus-ring",
                pathname.startsWith(n.href) ? "text-brand-700" : "text-ink-600 hover:text-ink-900",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <a href={process.env.NEXT_PUBLIC_PHARMACY_URL ?? "https://pharmacy.getmed.ca"}>For pharmacies</a>
          </Button>
          <Button asChild size="sm">
            <Link href="/#search">Find a pharmacy</Link>
          </Button>
        </div>
        <button className="rounded-md p-2 md:hidden focus-ring" aria-label="Toggle menu" onClick={() => setOpen((o) => !o)}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open ? (
        <div className="border-t border-ink-200 bg-white px-4 py-3 md:hidden animate-fade-in">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-ink-700">
              {n.label}
            </Link>
          ))}
          <a href={process.env.NEXT_PUBLIC_PHARMACY_URL ?? "https://pharmacy.getmed.ca"} className="block rounded-md px-3 py-2 text-sm font-medium text-ink-700">
            For pharmacies
          </a>
        </div>
      ) : null}
    </header>
  );
}
