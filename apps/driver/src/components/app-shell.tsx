"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Package, Settings, Users } from "lucide-react";
import { Logo, cn } from "@getmed/ui";

const TABS = [
  { href: "/", label: "Deliveries", icon: Package },
  { href: "/history", label: "History", icon: History },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ driverName, children }: { driverName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-white/90 px-4 backdrop-blur border-b border-ink-200" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <Logo size="sm" />
        <span className="truncate text-sm text-ink-600">{driverName}</span>
      </header>
      <main className="flex-1 px-4 py-4 pb-24">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Driver app">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {TABS.map((t) => {
            const active = t.href === "/" ? pathname === "/" || pathname.startsWith("/orders") : pathname.startsWith(t.href);
            return (
              <Link key={t.href} href={t.href} className={cn("flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-soft", active ? "text-brand-700" : "text-ink-500")}>
                <t.icon className="size-5" /> {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
