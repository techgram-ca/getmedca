"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PackageCheck } from "lucide-react";
import { Button, toast } from "@getmed/ui";
import { pickUpAction } from "@/lib/actions/orders";

export function PickupButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="lg" className="w-full" loading={pending} onClick={() => start(async () => { const r = await pickUpAction(orderId); if (r.ok) { toast.success("Picked up — patient notified"); router.refresh(); } else toast.error(r.error); })}>
      <PackageCheck /> I've picked it up
    </Button>
  );
}
