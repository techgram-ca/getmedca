"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button, toast } from "@getmed/ui";
import { setDriverActive } from "@/lib/actions/drivers";

export function DriverActiveToggle({ driverId, active }: { driverId: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <Button variant={active ? "outline" : "primary"} loading={pending} onClick={() => start(async () => { await setDriverActive(driverId, !active); toast.success(active ? "Driver deactivated" : "Driver activated"); router.refresh(); })}>{active ? "Deactivate" : "Activate"}</Button>;
}
