"use client";

import { useActionState } from "react";
import { Alert, Button, Field, FormError, Input } from "@getmed/ui";
import { changePassword, type AuthState } from "@/lib/actions/auth";

export function PasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(changePassword, null);
  return (
    <form action={action} className="space-y-3">
      <FormError message={state?.error} title="Password not changed" />
      {state?.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="New password" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} className="h-12 text-base" /></Field>
      <Field label="Confirm" htmlFor="confirm"><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="h-12 text-base" /></Field>
      <Button type="submit" className="w-full" loading={pending} loadingText="Updating…">Update password</Button>
    </form>
  );
}
