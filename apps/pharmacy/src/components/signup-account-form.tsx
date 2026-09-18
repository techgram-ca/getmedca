"use client";

import { useActionState } from "react";
import { Alert, Button, Field, FormError, Input } from "@getmed/ui";
import { signup, type AuthState } from "@/lib/actions/auth";

export function SignupAccountForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, null);
  if (state?.message) return <Alert tone="success" className="mt-5">{state.message}</Alert>;
  return (
    <form action={action} className="mt-5 space-y-4">
      <FormError message={state?.error} />
      <Field label="Your name" htmlFor="fullName"><Input id="fullName" name="fullName" autoComplete="name" required /></Field>
      <Field label="Work email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Password" htmlFor="password" hint="At least 10 characters."><Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required /></Field>
      <Button type="submit" className="w-full" loading={pending}>Create account</Button>
      <p className="text-xs text-ink-500">By continuing you agree to list your pharmacy on GetMed and to the flat per-delivery fee model.</p>
    </form>
  );
}
