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
      <Field label="6-digit code" htmlFor="confirm-code">
        <Input
          id="confirm-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          // Not 6: a code pasted as "123 456" would be truncated before the
          // server ever saw it. The action strips the spaces instead.
          maxLength={12}
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
