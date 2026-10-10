/**
 * Reading a Supabase signUp response for "that address already has an account".
 *
 * Supabase answers this question two different ways depending on a project
 * setting, and one of them looks exactly like success:
 *
 *  - Email confirmations **off**: an error, `user_already_exists` or
 *    `email_exists` (older releases only set the message).
 *  - Email confirmations **on**: no error at all. The response carries a user
 *    whose id is random, whose `identities` list is empty, and for whom no mail
 *    is ever sent. That is deliberate — it stops a signup form being used to
 *    test which addresses are registered — but a caller that does not know to
 *    look will tell the person to go and check an inbox that will stay empty.
 *
 * An address that has an account but never confirmed it is a third case and
 * not this one: Supabase re-sends the confirmation and returns the real user
 * with its identities intact, so "check your email" is the right answer and
 * this returns false.
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
