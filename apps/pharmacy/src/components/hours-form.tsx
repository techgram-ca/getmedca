"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { WeeklyHours } from "@getmed/core/hours";
import { Button, toast } from "@getmed/ui";
import { saveHours } from "@/lib/actions/profile";
import { HoursEditor } from "./hours-editor";

export function HoursForm({ hours }: { hours: WeeklyHours }) {
  const router = useRouter();
  const [v, setV] = useState(hours);
  const [pending, start] = useTransition();
  return (
    <div className="max-w-2xl space-y-4">
      <HoursEditor value={v} onChange={setV} />
      <Button loading={pending} loadingText="Saving…" onClick={() => start(async () => { const r = await saveHours(v); if (r.ok) { toast.success("Hours saved"); router.refresh(); } else toast.error(r.error); })}>Save hours</Button>
    </div>
  );
}
