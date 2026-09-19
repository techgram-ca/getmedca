"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button, Logo } from "@getmed/ui";

const LINKS = [
  { href: "#opportunity", label: "Opportunity" },
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
];

export function LandingNavbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-ink-200 bg-white/92 backdrop-blur-[16px]">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <Logo />
          <span className="ml-1.5 hidden items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-brand-600 sm:inline-flex">
            For Pharmacies
          </span>
        </Link>

        <ul className="hidden list-none items-center gap-7 md:flex">
          {LINKS.map(({ href, label }) => (
            <li key={href}>
              <a href={href} className="text-sm font-medium text-ink-500 no-underline transition-colors hover:text-ink-950">{label}</a>
            </li>
          ))}
          <li>
            <Link href="/login" className="text-sm font-medium text-ink-500 no-underline transition-colors hover:text-ink-950">Sign in</Link>
          </li>
          <li>
            <Button asChild size="sm"><Link href="/signup">Create free account</Link></Button>
          </li>
        </ul>

        <button className="cursor-pointer border-none bg-transparent p-2 text-ink-950 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div className="flex flex-col gap-4 border-t border-ink-200 bg-white px-6 py-4 md:hidden animate-fade-in">
          {LINKS.map(({ href, label }) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="text-sm font-medium text-ink-500 no-underline">{label}</a>
          ))}
          <Link href="/login" className="text-sm font-medium text-ink-500 no-underline">Sign in</Link>
          <Button asChild size="sm" className="w-fit"><Link href="/signup">Create free account</Link></Button>
        </div>
      ) : null}
    </nav>
  );
}
