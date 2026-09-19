"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { Alert, Button, Field, FormError, Input, Switch, toast } from "@getmed/ui";
import { changePassword, type AuthState } from "@/lib/actions/auth";
import { saveNotificationPrefs, setSelfPaused } from "@/lib/actions/profile";

export function NotificationPrefs({ sms, email, sound }: { sms: boolean; email: boolean; sound: boolean }) {
  const router = useRouter();
  const [v, setV] = useState({ notifySms: sms, notifyEmail: email, notifySound: sound });
  const [pending, start] = useTransition();
  const update = (patch: Partial<typeof v>) => {
    const next = { ...v, ...patch };
    setV(next);
    start(async () => {
      const r = await saveNotificationPrefs(next);
      if (r.ok) router.refresh();
      else toast.error(r.error);
    });
  };
  return (
    <div className="divide-y divide-ink-100">
      {([["notifySms", "SMS alerts", "Text message for every new order and consultation request"], ["notifyEmail", "Email alerts", "Email for every new order and consultation request"], ["notifySound", "Dashboard sound", "Chime when a new order arrives while the dashboard is open"]] as const).map(([k, l, d]) => (
        <label key={k} className="flex items-center justify-between gap-4 py-3">
          <span><span className="block text-sm font-medium">{l}</span><span className="block text-xs text-ink-500">{d}</span></span>
          <Switch checked={v[k]} onCheckedChange={(c) => update({ [k]: c })} disabled={pending} />
        </label>
      ))}
    </div>
  );
}

export function PauseToggle({ paused, canPause }: { paused: boolean; canPause: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!canPause) return <Alert tone="info">Availability can be changed once your pharmacy is approved.</Alert>;
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm">{paused ? "Your pharmacy is paused and hidden from search." : "Your pharmacy is live and visible to patients."}</p>
      <Button variant={paused ? "primary" : "outline"} loading={pending} onClick={() => start(async () => { await setSelfPaused(!paused); toast.success(paused ? "You're live again" : "Pharmacy paused"); router.refresh(); })}>{paused ? "Resume" : "Pause"}</Button>
    </div>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(changePassword, null);
  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} title="Password not changed" />
      {state?.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="New password" htmlFor="password" hint="At least 10 characters."><Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} /></Field>
      <Field label="Confirm password" htmlFor="confirm"><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required /></Field>
      <Button type="submit" loading={pending} loadingText="Updating…">Update password</Button>
    </form>
  );
}
