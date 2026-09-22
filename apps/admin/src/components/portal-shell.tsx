"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, BarChart3, Bell, Building2, Car, ClipboardList, DollarSign, FormInput, LayoutDashboard, LifeBuoy, ListChecks, LogOut, Menu, MessageSquare, Settings, X } from "lucide-react";
import { Logo, cn } from "@getmed/ui";
import { logout } from "@/lib/actions/auth";

type Counts = { escalations: number; pharmacies: number; support: number };

export function PortalShell({ counts, children }: { counts: Counts; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const NAV = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/escalations", label: "Escalations", icon: AlertTriangle, badge: counts.escalations },
    { href: "/orders", label: "Orders", icon: ClipboardList },
    { href: "/pharmacies", label: "Pharmacies", icon: Building2, badge: counts.pharmacies },
    { href: "/drivers", label: "Drivers", icon: Car },
    { href: "/pricing", label: "Pricing", icon: DollarSign },
    { href: "/consultations", label: "Consultations", icon: MessageSquare },
    { href: "/issues", label: "Issue categories", icon: ListChecks },
    { href: "/forms", label: "Form fields", icon: FormInput },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/support", label: "Support inbox", icon: LifeBuoy, badge: counts.support },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Admin">
      {NAV.map((n) => {
        const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-soft focus-ring", active ? "bg-white/10 text-white" : "text-ink-300 hover:bg-white/5 hover:text-white")}>
            <n.icon className="size-4" /> <span className="flex-1">{n.label}</span>
            {n.badge ? <span className="rounded-full bg-accent-400 px-1.5 text-[10px] font-semibold text-ink-950">{n.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col bg-ink-950 lg:flex">
        <div className="flex h-16 items-center px-5"><Logo light size="sm" /><span className="ml-2 rounded bg-white/10 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-300">Admin</span></div>
        {nav}
        <form action={logout} className="border-t border-white/10 p-4"><button className="flex items-center gap-2 text-xs text-ink-400 hover:text-white"><LogOut className="size-3.5" /> Sign out</button></form>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-ink-950 px-4 text-white lg:hidden">
          <Logo light size="sm" />
          <button className="rounded-md p-2" onClick={() => setOpen((o) => !o)} aria-label="Menu">{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </header>
        {open ? <div className="bg-ink-950 lg:hidden">{nav}</div> : null}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
