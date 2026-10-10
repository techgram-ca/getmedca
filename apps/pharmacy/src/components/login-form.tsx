"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Field, FormError, Input } from "@getmed/ui";
import { login, type AuthState } from "@/lib/actions/auth";
import { ConfirmationPending, ResendConfirmation } from "./confirmation-notices";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, null);

  // Signed up, never confirmed, and the link sent is still good. Nothing to
  // resend — point at the one already sitting in their inbox.
  if (state?.confirmationPending) {
    return <ConfirmationPending email={state.confirmationPending.email} expiresAt={state.confirmationPending.expiresAt} className="mt-5" />;
  }

  // Signed up, never confirmed, and the link has run out. This is the one case
  // where "incorrect email or password" used to be the only thing we said.
  if (state?.confirmationExpired) {
    return <ResendConfirmation email={state.confirmationExpired.email} className="mt-5" />;
  }

  return (
    <form action={action} className="mt-5 space-y-4">
      <FormError message={state?.error} title="Sign in failed" />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Password" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      <p className="-mt-2 text-right text-sm">
        <Link href="/forgot-password" className="font-medium text-brand-700">Forgot your password?</Link>
      </p>
      <Button type="submit" size="lg" className="w-full" loading={pending} loadingText="Signing you in…">Sign in</Button>
    </form>
  );
}
