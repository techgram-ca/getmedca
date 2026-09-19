"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar, Button, cn, toast } from "@getmed/ui";
import { reassignAction } from "@/lib/actions/orders";

type D = { id: string; name: string; phone: string; vehicle_make: string | null; vehicle_model: string | null };

export function ReassignForm({ orderId, drivers }: { orderId: string; drivers: D[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (drivers.length === 0) return <p className="mt-4 text-sm text-ink-500">No other active drivers right now.</p>;
  return (
    <div className="mt-4 space-y-3">
      <ul className="space-y-2">
        {drivers.map((d) => (
          <li key={d.id}>
            <button type="button" onClick={() => setSel(d.id)} className={cn("surface flex w-full items-center gap-3 p-3 text-left transition-soft", sel === d.id && "ring-2 ring-brand-500")}>
              <Avatar name={d.name} size={40} />
              <span className="min-w-0 flex-1"><span className="block font-medium">{d.name}</span><span className="block text-xs text-ink-500">{[d.vehicle_make, d.vehicle_model].filter(Boolean).join(" ") || d.phone}</span></span>
            </button>
          </li>
        ))}
      </ul>
      <Button size="lg" className="w-full" disabled={!sel} loading={pending} loadingText="Handing off…" onClick={() => start(async () => { const r = await reassignAction(orderId, sel!); if (r.ok) { toast.success("Handed off"); router.push("/"); router.refresh(); } else toast.error(r.error); })}>Confirm hand-off</Button>
    </div>
  );
}
