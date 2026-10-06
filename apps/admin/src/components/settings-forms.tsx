"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { Rocket } from "lucide-react";
import { Alert, Button, Field, FormError, Input, Textarea, toast } from "@getmed/ui";
import { changePassword, type AuthState } from "@/lib/actions/auth";
import { saveLaunchState, savePlatformSettings } from "@/lib/actions/config";

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

/**
 * The switch that opens the patient site.
 *
 * Deliberately awkward to flip by accident: the button says which direction it
 * goes, and taking the site back down asks for confirmation, because doing that
 * to a live service by misclick is a different kind of mistake from doing it to
 * one nobody has seen yet.
 */
export function LaunchForm({ launchedAt, message }: { launchedAt: string | null; message: string | null }) {
  const router = useRouter();
  const [text, setText] = useState(message ?? "");
  const [pending, start] = useTransition();
  const launched = launchedAt != null;

  const save = (nextLaunched: boolean) =>
    start(async () => {
      const r = await saveLaunchState({ launched: nextLaunched, message: text });
      if (r.ok) {
        toast.success(nextLaunched === launched ? "Message saved" : nextLaunched ? "GetMed is live" : "Patient site taken down");
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <div className="space-y-4">
      <Alert tone={launched ? "success" : "warning"}>
        {launched ? (
          <>
            <strong>Live.</strong> Patients can search, order and request consultations. Launched{" "}
            {new Date(launchedAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}.
          </>
        ) : (
          <>
            <strong>Not launched.</strong> The homepage shows your message instead of the site, with no navigation.
            Pharmacy pages stay visible with ordering and consultations disabled, and both are refused if anyone
            reaches them by direct link.
          </>
        )}
      </Alert>

      <Field
        label="Coming soon message"
        htmlFor="launch-message"
        optional
        hint="Shown on the homepage before launch. Leave empty to use the default copy."
      >
        <Textarea
          id="launch-message"
          rows={3}
          value={text}
          maxLength={600}
          placeholder="We're getting GetMed ready for Ontario…"
          onChange={(e) => setText(e.target.value)}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" loading={pending} onClick={() => save(launched)}>
          Save message
        </Button>
        {launched ? (
          <Button
            type="button"
            variant="danger"
            loading={pending}
            onClick={() => {
              if (confirm("Take the patient site down? Patients will not be able to order until you launch again.")) save(false);
            }}
          >
            Take site down
          </Button>
        ) : (
          <Button type="button" loading={pending} onClick={() => save(true)}>
            <Rocket /> Launch GetMed
          </Button>
        )}
      </div>
    </div>
  );
}
