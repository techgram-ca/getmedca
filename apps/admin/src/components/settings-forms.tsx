"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { Alert, Button, Field, FormError, Input, toast } from "@getmed/ui";
import { changePassword, type AuthState } from "@/lib/actions/auth";
import { savePlatformSettings } from "@/lib/actions/config";

export function PlatformSettingsForm({ searchRadiusKm, slaMinutes }: { searchRadiusKm: number; slaMinutes: number }) {
  const router = useRouter();
  const [v, setV] = useState({ searchRadiusKm, slaMinutes });
  const [pending, start] = useTransition();
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await savePlatformSettings(v); if (r.ok) { toast.success("Settings saved"); router.refresh(); } else toast.error(r.error); }); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Search radius (km)" htmlFor="radius" hint="Real driving distance cutoff for patient search."><Input id="radius" type="number" min={1} max={200} step="0.5" value={v.searchRadiusKm} onChange={(e) => setV({ ...v, searchRadiusKm: Number(e.target.value) })} /></Field>
        <Field label="Pharmacy SLA (minutes)" htmlFor="sla" hint="Time to accept/reject before timing out."><Input id="sla" type="number" min={5} max={240} value={v.slaMinutes} onChange={(e) => setV({ ...v, slaMinutes: Number(e.target.value) })} /></Field>
      </div>
      <Button type="submit" loading={pending}>Save settings</Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(changePassword, null);
  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      {state?.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="New password" htmlFor="password" hint="At least 12 characters."><Input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} /></Field>
      <Field label="Confirm" htmlFor="confirm"><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required /></Field>
      <Button type="submit" loading={pending}>Update password</Button>
    </form>
  );
}
