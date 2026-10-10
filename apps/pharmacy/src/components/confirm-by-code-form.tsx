"use client";

import { useActionState } from "react";
import { Button, Field, FormError, Input } from "@getmed/ui";
import { verifyEmailCode, type AuthState } from "@/lib/actions/auth";

/**
 * The standalone version of the code form, which asks for the address too.
 *
 * The inline one knows the email because the pharmacy just typed it. Someone
 * arriving here from the email itself has not, so this asks — prefilled from
 * the link when it carries one.
 */
export function ConfirmByCodeForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(verifyEmailCode, null);

  return (
    <form action={action} className="mt-5 space-y-4">
      <FormError message={state?.error} title="We couldn't confirm that" />
      <Field label="Email" htmlFor="confirm-email">
        <Input id="confirm-email" name="email" type="email" autoComplete="email" defaultValue={defaultEmail} required />
      </Field>
      <Field label="Code from the email" htmlFor="confirm-code">
        <Input
          id="confirm-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          // Codes run 6 to 10 digits depending on the project, and paste in
          // with spaces, so this is deliberately loose. The action decides.
          maxLength={16}
          placeholder="123456"
          autoFocus
          className="font-mono tracking-[0.4em]"
          required
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending} loadingText="Confirming…">
        Confirm email
      </Button>
    </form>
  );
}
