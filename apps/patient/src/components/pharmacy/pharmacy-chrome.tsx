"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { Avatar, Button, PoweredByGetMed, cn } from "@getmed/ui";

export type ChromePharmacy = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  phone: string | null;
  offersConsultation: boolean;
};

/**
 * Header for pharmacy-owned pages. Presents the pharmacy as the brand; GetMed
 * appears only as a small "Powered by" credit.
 */
export function PharmacyHeader({
  pharmacy,
  links = [],
  orderHref,
}: {
  pharmacy: ChromePharmacy;
  links?: { href: string; label: string }[];
  orderHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const href = orderHref ?? `/order/new?pharmacyId=${pharmacy.id}`;
  return (
    <header className="sticky top-0 z-50 border-b border-ink-200 bg-white/92 backdrop-blur-[16px]">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-6">
        <Link href={`/p/${pharmacy.slug}`} className="flex min-w-0 items-center gap-3 no-underline">
          <Avatar src={pharmacy.logoUrl} name={pharmacy.name} size={40} className="shrink-0 rounded-xl" />
          <span className="min-w-0">
            <span className="block truncate text-[1.05rem] font-extrabold tracking-tight text-ink-950">{pharmacy.name}</span>
            <PoweredByGetMed className="hidden sm:inline-flex" />
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Pharmacy">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-ink-600 no-underline transition-colors hover:text-ink-950">
              {l.label}
            </a>
          ))}
          {pharmacy.phone ? (
            <a href={`tel:${pharmacy.phone}`} className="flex items-center gap-1.5 text-sm font-semibold text-ink-950 no-underline transition-colors hover:text-brand-700">
              <Phone className="size-4" /> Call
            </a>
          ) : null}
          <Button asChild size="sm"><Link href={href}>Order prescription</Link></Button>
        </nav>

        <button className="cursor-pointer border-none bg-transparent p-2 text-ink-950 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div className="flex flex-col gap-4 border-t border-ink-200 bg-white px-6 py-4 md:hidden animate-fade-in">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm font-medium text-ink-600 no-underline">{l.label}</a>
          ))}
          {pharmacy.phone ? <a href={`tel:${pharmacy.phone}`} className="text-sm font-semibold text-ink-950 no-underline">Call {pharmacy.phone}</a> : null}
          <Button asChild size="sm" className="w-fit"><Link href={href}>Order prescription</Link></Button>
        </div>
      ) : null}
    </header>
  );
}

export function PharmacyFooter({ pharmacy, address }: { pharmacy: ChromePharmacy; address?: string | null }) {
  return (
    <footer className="border-t border-ink-200 bg-white px-6 py-10">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar src={pharmacy.logoUrl} name={pharmacy.name} size={36} className="rounded-lg" />
          <div>
            <p className="font-extrabold text-ink-950">{pharmacy.name}</p>
            {address ? <p className="text-xs text-ink-500">{address}</p> : null}
          </div>
        </div>
        <div className="flex flex-col gap-1 text-sm text-ink-500 sm:items-end">
          {pharmacy.phone ? <a href={`tel:${pharmacy.phone}`} className="no-underline hover:text-brand-700">{pharmacy.phone}</a> : null}
          <p className="text-xs">© {new Date().getFullYear()} {pharmacy.name}. All rights reserved.</p>
          <PoweredByGetMed />
        </div>
      </div>
    </footer>
  );
}

/** Mobile action bar pinned to the bottom of pharmacy-owned pages. */
export function StickyOrderBar({ pharmacy, className, orderHref }: { pharmacy: ChromePharmacy; className?: string; orderHref?: string }) {
  return (
    <div className={cn("fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden", className)}>
      <div className="flex gap-2">
        <Button asChild className="flex-1"><Link href={orderHref ?? `/order/new?pharmacyId=${pharmacy.id}`}>Order prescription</Link></Button>
        {pharmacy.offersConsultation ? (
          <Button asChild variant="outline" className="flex-1"><Link href={`/consultation/request?pharmacyId=${pharmacy.id}`}>Ask a pharmacist</Link></Button>
        ) : null}
      </div>
    </div>
  );
}

/** Compact pharmacy-branded bar used across the order flow. */
export function PharmacyTopBar({ pharmacy, step }: { pharmacy: ChromePharmacy; step?: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-ink-200 bg-white/92 backdrop-blur-[16px]">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-6">
        <Link href={`/p/${pharmacy.slug}`} className="flex min-w-0 items-center gap-3 no-underline">
          <Avatar src={pharmacy.logoUrl} name={pharmacy.name} size={36} className="shrink-0 rounded-xl" />
          <span className="min-w-0">
            <span className="block truncate font-extrabold tracking-tight text-ink-950">{pharmacy.name}</span>
            <PoweredByGetMed />
          </span>
        </Link>
        {step ? <span className="hidden shrink-0 text-sm font-medium text-ink-500 sm:block">{step}</span> : null}
        {pharmacy.phone ? (
          <a href={`tel:${pharmacy.phone}`} className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-ink-950 no-underline hover:text-brand-700">
            <Phone className="size-4" /> <span className="hidden sm:inline">{pharmacy.phone}</span>
          </a>
        ) : null}
      </div>
    </header>
  );
}
