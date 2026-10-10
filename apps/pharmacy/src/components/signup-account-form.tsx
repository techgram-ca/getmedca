"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Field, FormError, Input } from "@getmed/ui";
import { signup, type AuthState } from "@/lib/actions/auth";

const SUPPORT_EMAIL = "support@getmed.ca";

/** "in about 40 minutes", "in about 3 hours", or nothing once it has passed. */
function timeLeft(expiresAt: string): string | null {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `about ${minutes} more minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  return `about ${hours} more hour${hours === 1 ? "" : "s"}`;
}

function SupportLine() {
  return (
    <p className="mt-3 text-xs">
      Still stuck? Email{" "}
      <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium underline">{SUPPORT_EMAIL}</a>.
    </p>
  );
}

export function SignupAccountForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, null);

  // Already registered and confirmed. Not something trying again can fix, so
  // it gets the ways out rather than a line of red text.
  if (state?.existingAccount) {
    return (
      <Alert tone="warning" title="This email already has a GetMed account" className="mt-5">
        <p>Sign in to pick up where you left off. If you have forgotten the password, reset it — no confirmation email is on its way.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm"><Link href="/login">Sign in</Link></Button>
          <Button asChild size="sm" variant="outline"><Link href="/forgot-password">Reset password</Link></Button>
        </div>
        <SupportLine />
      </Alert>
    );
  }

  // Registered, not confirmed, and the link already sent still works. Sending
  // another would only put two links in the inbox and make it harder to know
  // which one to click.
  if (state?.confirmationPending) {
    const left = timeLeft(state.confirmationPending.expiresAt);
    return (
      <Alert tone="info" title="Your confirmation is still pending" className="mt-5">
        <p>
          You have already registered this email. The confirmation link we sent is still valid
          {left ? ` for ${left}` : ""} — open it to finish setting up your pharmacy. Check your spam folder if you
          cannot find it.
        </p>
        <p className="mt-2">Once it runs out, sign up again here and we will send a new one.</p>
        <SupportLine />
      </Alert>
    );
  }

  // The link they were waiting on had run out, so signing up again sent a new one.
  if (state?.confirmationResent) {
    return (
      <Alert tone="success" title="A new confirmation link is on its way" className="mt-5">
        <p>Your last link had expired, so we have sent a fresh one. Open it to finish setting up your pharmacy, and check your spam folder if it does not arrive.</p>
        <SupportLine />
      </Alert>
    );
  }

  if (state?.message) return <Alert tone="success" className="mt-5">{state.message}</Alert>;

  return (
    <form action={action} className="mt-5 space-y-4">
      <FormError message={state?.error} title="We couldn't create your account" />
      <Field label="Your name" htmlFor="fullName"><Input id="fullName" name="fullName" autoComplete="name" required /></Field>
      <Field label="Work email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Password" htmlFor="password" hint="At least 10 characters."><Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required /></Field>
      <Button type="submit" size="lg" className="w-full" loading={pending} loadingText="Creating your account…">Create account</Button>
      <p className="text-xs text-ink-500">By continuing you agree to list your pharmacy on GetMed and to the flat per-delivery fee model.</p>
    </form>
  );
}
