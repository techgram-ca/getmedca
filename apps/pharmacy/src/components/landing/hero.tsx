import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { Button, Logo } from "@getmed/ui";
import { HEADLINE_STATS } from "@/lib/market-stats";

const DASHBOARD_ORDERS = [
  { name: "New prescription", med: "Awaiting your response", badge: "Pending", color: "bg-amber-100 text-amber-700" },
  { name: "Transfer request", med: "Accepted · preparing", badge: "Accepted", color: "bg-blue-100 text-blue-700" },
  { name: "Delivery", med: "Driver on the way", badge: "Out for delivery", color: "bg-emerald-100 text-emerald-700" },
];

export function LandingHero() {
  return (
    <section className="overflow-hidden bg-white px-6 pb-16 pt-28">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-700">
              <span className="size-2 animate-pulse rounded-full bg-amber-500" />
              The shift to online pharmacy is accelerating
            </div>

            <h1 className="text-[clamp(2rem,4.5vw,3.2rem)] font-extrabold leading-[1.15] tracking-tight text-ink-950">
              Your patients are ordering <span className="text-red-500">online</span> —{" "}
              <span className="text-brand-600">make sure it&#39;s from you</span>
            </h1>

            <p className="mt-5 max-w-[520px] text-[1.1rem] leading-[1.75] text-ink-500">
              Online prescription ordering and home delivery are becoming the default. GetMed gives independent Ontario pharmacies the tools to compete — without building any of it yourself.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/signup">Join GetMed today <ArrowRight /></Link></Button>
              <a
                href="#how-it-works"
                className="inline-flex items-center rounded-full border-2 border-ink-200 px-6 py-3 text-sm font-semibold text-ink-500 no-underline transition-colors hover:border-brand-600 hover:text-brand-700"
              >
                See how it works
              </a>
            </div>

            <p className="mt-4 text-xs text-ink-500">
              ✓ Free onboarding &nbsp;·&nbsp; ✓ No contracts &nbsp;·&nbsp; ✓ No commission on your dispensing
            </p>
          </div>

          {/* Dashboard preview */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-[-16px] rotate-2 rounded-[32px] bg-brand-100" />
            <div className="relative overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-[0_24px_64px_rgba(42,157,143,0.14)]">
              <div className="flex items-center justify-between border-b border-ink-200 bg-ink-50 px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <Logo size="sm" />
                  <span className="text-xs font-medium text-ink-500">Pharmacy dashboard</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="size-2.5 rounded-full bg-red-400" />
                  <div className="size-2.5 rounded-full bg-yellow-400" />
                  <div className="size-2.5 rounded-full bg-green-400" />
                </div>
              </div>

              <div className="p-5">
                <div className="mb-4 grid grid-cols-2 gap-3">
                  {[
                    { label: "New orders", value: "3", trend: "Respond within 30 min" },
                    { label: "Delivered this month", value: "128", trend: "Invoiced at a flat fee" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-ink-200 bg-ink-50 p-3.5">
                      <div className="mb-1 text-[0.65rem] font-medium text-ink-500">{s.label}</div>
                      <div className="text-2xl font-extrabold text-ink-950">{s.value}</div>
                      <div className="mt-1 flex items-center gap-1">
                        <TrendingUp className="size-3 text-emerald-500" />
                        <span className="text-[0.6rem] font-semibold text-emerald-600">{s.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-wider text-ink-500">Today&#39;s queue</p>
                <div className="space-y-2">
                  {DASHBOARD_ORDERS.map((o) => (
                    <div key={o.name} className="flex items-center justify-between border-b border-ink-200 py-1.5 last:border-0">
                      <div>
                        <div className="text-xs font-semibold text-ink-950">{o.name}</div>
                        <div className="text-[0.6rem] text-ink-500">{o.med}</div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${o.color}`}>{o.badge}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 border-t border-ink-200 pt-3">
                  <div className="mb-1 flex justify-between text-[0.6rem] text-ink-500">
                    <span>Average time to accept</span>
                    <span className="font-bold text-brand-600">6 min</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-ink-200">
                    <div className="h-full w-[20%] rounded-full bg-brand-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-3 -top-3 whitespace-nowrap rounded-full bg-brand-600 px-3 py-1.5 text-[0.65rem] font-bold text-white shadow-lg">
              Your pharmacy, live
            </div>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-ink-200 bg-ink-200 sm:grid-cols-3">
          {HEADLINE_STATS.map((s) => (
            <div key={s.value} className="bg-white px-8 py-5 text-center sm:text-left">
              <div className="text-3xl font-extrabold tracking-tight text-brand-600">{s.value}</div>
              <div className="mt-1 text-xs leading-snug text-ink-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
