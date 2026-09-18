"use client";

import { useActionState } from "react";
import { Button, Field, FormError, Input } from "@getmed/ui";
import { login, type AuthState } from "@/lib/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, null);
  return (
    <form action={action} className="mt-5 space-y-4">
      <FormError message={state?.error} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required className="h-12 text-base" /></Field>
      <Field label="Password" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required className="h-12 text-base" /></Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>Sign in</Button>
    </form>
  );
}
