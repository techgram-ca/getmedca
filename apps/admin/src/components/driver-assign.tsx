"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Select, toast } from "@getmed/ui";
import { assignDriverAction } from "@/lib/actions/orders";

type Driver = { id: string; name: string; phone: string; vehicle_make: string | null; vehicle_model: string | null };

export function DriverAssign({ orderId, currentDriverId, drivers }: { orderId: string; currentDriverId: string | null; drivers: Driver[] }) {
  const router = useRouter();
  const [id, setId] = useState(currentDriverId ?? "");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Select value={id} onChange={(e) => setId(e.target.value)} className="flex-1" aria-label="Driver">
        <option value="">Choose an available driver…</option>
        {drivers.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.phone}{d.vehicle_make ? ` · ${d.vehicle_make} ${d.vehicle_model ?? ""}` : ""}</option>)}
      </Select>
      <Button disabled={!id || id === currentDriverId} loading={pending} loadingText="Assigning…" onClick={() => start(async () => { const r = await assignDriverAction(orderId, id); if (r.ok) { toast.success("Driver assigned"); router.refresh(); } else toast.error(r.error); })}>{currentDriverId ? "Reassign" : "Assign driver"}</Button>
    </div>
  );
}
