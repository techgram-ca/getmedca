"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert, Button, Field, FormError, Input } from "@getmed/ui";
import { requestPasswordReset, setNewPassword, type AuthState } from "@/lib/actions/auth";

/** Asks for the email, and says the same thing whichever answer is true. */
export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, null);

  if (state?.message) {
    return (
      <div className="space-y-4">
        <Alert tone="success" title="Check your email">{state.message}</Alert>
        <Button asChild variant="outline" className="w-full"><Link href="/login">Back to sign in</Link></Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error ?? null} title="We couldn't send that" />
      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" autoFocus required />
      </Field>
      <Button type="submit" className="w-full" loading={pending} loadingText="Sending…">Email me a reset link</Button>
      <p className="text-center text-sm text-ink-500">
        <Link href="/login" className="font-medium text-brand-700">Back to sign in</Link>
      </p>
    </form>
  );
}

/** Reached through the reset link, which leaves a recovery session behind. */
export function NewPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(setNewPassword, null);
  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error ?? null} title="Password not changed" />
      <Field label="New password" htmlFor="password" required hint="At least 10 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" autoFocus required minLength={10} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm" required>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Button type="submit" className="w-full" loading={pending} loadingText="Saving…">Set new password</Button>
    </form>
  );
}
