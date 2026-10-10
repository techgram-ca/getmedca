"use client";

import { useActionState } from "react";
import { Alert, Button, FormError } from "@getmed/ui";
import { resendConfirmation, type AuthState } from "@/lib/actions/auth";

const SUPPORT_EMAIL = "support@getmed.ca";

/** "about 40 more minutes", "about 3 more hours", or nothing once it has passed. */
export function timeLeft(expiresAt: string): string | null {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `about ${minutes} more minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  return `about ${hours} more hour${hours === 1 ? "" : "s"}`;
}

export function SupportLine() {
  return (
    <p className="mt-3 text-xs">
      Still stuck? Email{" "}
      <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium underline">{SUPPORT_EMAIL}</a>.
    </p>
  );
}

/**
 * Registered, unconfirmed, and the link already sent still works.
 *
 * Shown on both the signup and the login form, because both are places a
 * pharmacy lands when a confirmation never got clicked, and they should not
 * be able to tell two different stories about the same account.
 *
 * No resend here on purpose: a second link only makes it harder to know which
 * one in the inbox to click, and the older one is the one that fails.
 */
export function ConfirmationPending({ expiresAt, className }: { expiresAt: string; className?: string }) {
  const left = timeLeft(expiresAt);
  return (
    <Alert tone="info" title="Your confirmation is still pending" className={className}>
      <p>
        You have already registered this email. The confirmation link we sent is still valid
        {left ? ` for ${left}` : ""} — open it to finish setting up your pharmacy. Check your spam folder if you
        cannot find it.
      </p>
      <p className="mt-2">Once it runs out, come back here and we will send a new one.</p>
      <SupportLine />
    </Alert>
  );
}

/** A fresh link has just gone out. */
export function ConfirmationResent({ className }: { className?: string }) {
  return (
    <Alert tone="success" title="A new confirmation link is on its way" className={className}>
      <p>Open it to finish setting up your pharmacy, and check your spam folder if it does not arrive.</p>
      <SupportLine />
    </Alert>
  );
}

/**
 * Registered, unconfirmed, and the link has run out — with the button that
 * fixes it. Sending is a click rather than automatic, because arriving at a
 * login page is not in itself a request for mail.
 */
export function ResendConfirmation({ email, className }: { email: string; className?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(resendConfirmation, null);

  if (state?.confirmationResent) return <ConfirmationResent className={className} />;

  return (
    <Alert tone="warning" title="Confirm your email to sign in" className={className}>
      <p>
        This email is registered but was never confirmed, so there is nothing to sign in to yet — your password is
        not the problem. The link we sent has expired.
      </p>
      <form action={action} className="mt-3">
        <input type="hidden" name="email" value={email} />
        {state?.error ? <FormError message={state.error} /> : null}
        <Button type="submit" size="sm" loading={pending} loadingText="Sending…" className={state?.error ? "mt-3" : undefined}>
          Send a new link
        </Button>
      </form>
      <SupportLine />
    </Alert>
  );
}
