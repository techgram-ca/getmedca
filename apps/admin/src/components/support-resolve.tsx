"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@getmed/ui";
import { setSupportResolved } from "@/lib/actions/config";

export function SupportResolveButton({ id, resolved }: { id: string; resolved: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <Button size="sm" variant={resolved ? "ghost" : "outline"} loading={pending} onClick={() => start(async () => { await setSupportResolved(id, !resolved); router.refresh(); })}>{resolved ? "Reopen" : "Mark resolved"}</Button>;
}
