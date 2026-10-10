"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Field, FormError, Input } from "@getmed/ui";
import { signup, type AuthState } from "@/lib/actions/auth";

const SUPPORT_EMAIL = "support@getmed.ca";

export function SignupAccountForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, null);

  // Already registered. Not an error the pharmacy can fix by trying again, so
  // it gets the three ways out rather than a line of red text.
  if (state?.existingAccount) {
    return (
      <Alert tone="warning" title="This email already has a GetMed account" className="mt-5">
        <p>Sign in to pick up where you left off. If you have forgotten the password, reset it — no confirmation email is on its way.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm"><Link href="/login">Sign in</Link></Button>
          <Button asChild size="sm" variant="outline"><Link href="/forgot-password">Reset password</Link></Button>
        </div>
        <p className="mt-3 text-xs">
          Not you, or locked out of the inbox? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium underline">{SUPPORT_EMAIL}</a>.
        </p>
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
