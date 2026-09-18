"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { FormFieldConfigRow } from "@getmed/db/types";
import { Card, CardContent, CardHeader, CardTitle, Switch, toast } from "@getmed/ui";
import { setFieldRequired } from "@/lib/actions/config";

const GROUPS: { key: FormFieldConfigRow["applies_to"]; label: string }[] = [
  { key: "new_order", label: "New prescription" },
  { key: "transfer", label: "Prescription transfer" },
  { key: "consultation", label: "Consultation request" },
];
const LOCKED = new Set(["patient_name", "patient_phone", "delivery_address"]);

export function FormFieldToggles({ fields }: { fields: FormFieldConfigRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="space-y-6">
      {GROUPS.map((g) => (
        <Card key={g.key}>
          <CardHeader><CardTitle>{g.label}</CardTitle></CardHeader>
          <CardContent className="divide-y divide-ink-100 p-0 px-5">
            {fields.filter((f) => f.applies_to === g.key).map((f) => {
              const locked = LOCKED.has(f.field_key);
              return (
                <label key={f.field_key} className="flex items-center justify-between gap-4 py-3">
                  <span><span className="block text-sm font-medium">{f.label}</span><span className="block font-mono text-[11px] text-ink-400">{f.field_key}</span></span>
                  <span className="flex items-center gap-2 text-xs text-ink-500">{f.required || locked ? "Required" : "Optional"}<Switch checked={f.required || locked} disabled={locked || pending} onCheckedChange={(v) => start(async () => { const r = await setFieldRequired(f.field_key, f.applies_to, v); if (r.ok) router.refresh(); else toast.error(r.error); })} /></span>
                </label>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
