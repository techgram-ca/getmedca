"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Building2, ClipboardList, FileText, LayoutDashboard, LogOut, Menu, MessageSquare, Settings, X } from "lucide-react";
import { Badge, Logo, cn } from "@getmed/ui";
import { logout } from "@/lib/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/consultations", label: "Consultations", icon: MessageSquare },
  { href: "/profile", label: "Profile", icon: Building2 },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ pharmacyName, status, children }: { pharmacyName: string; status: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Dashboard">
      {NAV.map((n) => {
        const active = pathname === n.href || pathname.startsWith(n.href + "/");
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-soft focus-ring",
              active ? "bg-brand-600 text-white" : "text-ink-700 hover:bg-ink-100",
            )}
          >
            <n.icon className="size-4" /> {n.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200 bg-white lg:flex">
        <div className="flex h-16 items-center px-5"><Logo /></div>
        {nav}
        <div className="border-t border-ink-200 p-4">
          <p className="truncate text-sm font-medium">{pharmacyName}</p>
          <Badge tone={status === "approved" ? "success" : status === "pending" ? "warning" : "neutral"} className="mt-1 capitalize">{status}</Badge>
          <form action={logout} className="mt-3">
            <button className="flex items-center gap-2 text-xs text-ink-500 hover:text-ink-900"><LogOut className="size-3.5" /> Sign out</button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <Logo />
          <button className="rounded-md p-2 focus-ring" onClick={() => setOpen((o) => !o)} aria-label="Menu">{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </header>
        {open ? <div className="border-b border-ink-200 bg-white lg:hidden animate-fade-in">{nav}<form action={logout} className="px-6 pb-4"><button className="text-sm text-ink-500">Sign out</button></form></div> : null}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
