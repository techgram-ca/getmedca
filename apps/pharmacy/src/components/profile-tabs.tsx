"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@getmed/ui";

const TABS = [
  { href: "/profile", label: "Business & branding" },
  { href: "/profile/pharmacists", label: "Pharmacists" },
  { href: "/profile/services", label: "Services" },
  { href: "/profile/hours", label: "Hours" },
];

export function ProfileTabs() {
  const pathname = usePathname();
  return (
    <nav className="inline-flex rounded-xl bg-ink-100 p-1">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={cn("rounded-lg px-4 py-1.5 text-sm font-medium transition-soft", pathname === t.href ? "bg-white text-ink-900 shadow-sm" : "text-ink-600 hover:text-ink-900")}>{t.label}</Link>
      ))}
    </nav>
  );
}
