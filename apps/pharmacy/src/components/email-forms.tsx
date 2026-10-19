"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail } from "lucide-react";
import { Alert, Button, Field, FormError, Input, toast } from "@getmed/ui";
import { changeLoginEmail, type AuthState } from "@/lib/actions/auth";
import { saveNotificationEmail } from "@/lib/actions/profile";

/**
 * Changing the address you sign in with.
 *
 * Deliberately told apart from the notification address on the same page: the
 * two being confused is the whole reason this exists. Somebody signs up with
 * a personal address, types the shop's address into their profile, and then
 * cannot work out why that one will not log them in.
 */
export function LoginEmailForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(changeLoginEmail, null);
  const [open, setOpen] = useState(false);

  if (state?.message) {
    return (
      <Alert tone="success" title="Confirm it from your inbox">
        {state.message}
      </Alert>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-2 text-sm">
          <KeyRound className="size-4 text-brand-600" />
          <span className="font-medium text-ink-950">{current}</span>
        </span>
        {!open ? (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Change</Button>
        ) : null}
      </div>
      <p className="mt-1.5 text-xs text-ink-500">
        This is the address and password you log in with. It is not where order alerts go — that is below.
      </p>

      {open ? (
        <form action={action} className="mt-4 space-y-3">
          <FormError message={state?.error} title="We couldn't change it" />
          <Field label="New sign-in email" htmlFor="new-login-email" required hint="We will email it a link to confirm. Nothing changes until you open it.">
            <Input id="new-login-email" name="email" type="email" autoComplete="email" placeholder="rx@yourpharmacy.ca" required />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" loading={pending} loadingText="Sending…">Send confirmation</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

/** Where order alerts land. Usually the shop inbox, and allowed to differ. */
export function NotificationEmailForm({ current }: { current: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState(current);

  const save = () =>
    start(async () => {
      const r = await saveNotificationEmail({ email });
      if (r.ok) {
        toast.success("Notification email saved");
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }}>
      <Field
        label="Send order alerts to"
        htmlFor="notify-email"
        required
        hint="Often a shared shop inbox. It does not have to be the address you sign in with."
      >
        <div className="flex flex-wrap items-start gap-2">
          <Input id="notify-email" type="email" className="max-w-[22rem]" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" loading={pending} loadingText="Saving…" disabled={email.trim() === current.trim()}>
            <Mail /> Save
          </Button>
        </div>
      </Field>
    </form>
  );
}
