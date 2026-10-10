/**
 * Working out what a signup attempt is really looking at.
 *
 * Supabase deliberately will not tell a signup form whether an address is
 * taken — it answers a repeat signup for a confirmed address with success, a
 * fake user and no email at all, so the form cannot be used to test which
 * addresses are registered. For a portal whose pharmacies have public pages
 * that buys nothing, and it costs a registration every time someone sits
 * waiting for mail that was never sent.
 *
 * So the state is read from the database first (`readSignupState`), and what
 * comes back off the signUp call is checked as a backstop (`isAddressTaken`)
 * for the gap between the two and for environments where the lookup is not
 * available.
 */

/** How long a Supabase confirmation link stays usable, in seconds. */
export const DEFAULT_CONFIRMATION_TTL_SECONDS = 3600;

export type SignupState =
  /** Nothing on file. An ordinary signup. */
  | { kind: "new" }
  /** Confirmed account. Signing up again will never work; sign in instead. */
  | { kind: "registered" }
  /** Unconfirmed, and the link already sent is still usable. */
  | { kind: "pending"; sentAt: Date; expiresAt: Date }
  /** Unconfirmed, and the link has run out. Sign up again to get a fresh one. */
  | { kind: "expired" };

/**
 * Reads the row `public.email_signup_state` returns for an address.
 *
 * `ttlSeconds` has to match the project's own OTP expiry, which Supabase's
 * docs give as 1 hour in one place and 24 in another and which the dashboard
 * can change, so it is configuration rather than a constant. Guessing short is
 * the safe way to be wrong: it sends a fresh, working link. Guessing long
 * leaves a pharmacy staring at "your confirmation is pending" with a dead link
 * and no way to ask for another.
 */
export function readSignupState(
  row: { confirmed_at: string | null; confirmation_sent_at: string | null } | null | undefined,
  { ttlSeconds = DEFAULT_CONFIRMATION_TTL_SECONDS, now = new Date() }: { ttlSeconds?: number; now?: Date } = {},
): SignupState {
  if (!row) return { kind: "new" };
  if (row.confirmed_at) return { kind: "registered" };

  // No send on record — an account made some other way, by an admin or an
  // import. There is no link to be pending, so offer to send one.
  if (!row.confirmation_sent_at) return { kind: "expired" };

  const sentAt = new Date(row.confirmation_sent_at);
  if (Number.isNaN(sentAt.getTime())) return { kind: "expired" };

  const expiresAt = new Date(sentAt.getTime() + ttlSeconds * 1000);
  return expiresAt > now ? { kind: "pending", sentAt, expiresAt } : { kind: "expired" };
}

/**
 * Whether a Supabase signUp response means the address already has an account.
 *
 * Supabase says so two different ways depending on a project setting:
 *
 *  - Email confirmations **off**: an error, `user_already_exists` or
 *    `email_exists` (older releases only set the message).
 *  - Email confirmations **on**: no error. The response carries a user whose
 *    id is random and whose `identities` list is empty.
 *
 * An address that has an account but never confirmed it is not this case:
 * Supabase re-sends the confirmation and returns the real user with its
 * identities intact, so "check your email" is the right answer and this
 * returns false.
 *
 * Absent is not empty. `identities` is optional in the response type, and an
 * unknown shape must not be read as "taken" — that would be a brand-new
 * pharmacy told it already has an account, with no way forward at all.
 */
export function isAddressTaken(result: {
  error?: { code?: string | null; message?: string | null } | null;
  user?: { identities?: unknown[] | null } | null;
}): boolean {
  const { error, user } = result;
  if (error) {
    const code = error.code ?? "";
    if (code === "user_already_exists" || code === "email_exists") return true;
    // "User already registered", and the older "A user with this email
    // address has already been registered".
    return /already (?:been )?(?:registered|exists)/i.test(error.message ?? "");
  }
  return Array.isArray(user?.identities) && user.identities.length === 0;
}

/** Supabase's own cap on how often it will re-send to the same address. */
export function isSendingTooOften(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "over_email_send_rate_limit" || /rate limit|too many requests/i.test(error.message ?? "");
}
