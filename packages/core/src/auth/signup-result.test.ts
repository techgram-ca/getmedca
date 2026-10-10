import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  DEFAULT_CONFIRMATION_TTL_SECONDS,
  isAddressTaken,
  isSendingTooOften,
  isUnconfirmed,
  normalizeOtpCode,
  OTP_MAX_LENGTH,
  OTP_MIN_LENGTH,
  readSignupState,
} from "./signup-result.ts";

test("confirmations on: a confirmed address comes back as success with no identities", () => {
  assert.equal(isAddressTaken({ user: { identities: [] } }), true);
});

test("confirmations off: GoTrue says so by code", () => {
  assert.equal(isAddressTaken({ error: { code: "user_already_exists", message: "User already registered" } }), true);
  assert.equal(isAddressTaken({ error: { code: "email_exists", message: "Email address already exists" } }), true);
});

test("older releases only set the message", () => {
  assert.equal(isAddressTaken({ error: { message: "User already registered" } }), true);
  assert.equal(isAddressTaken({ error: { code: null, message: "A user with this email address has already been registered" } }), true);
});

test("a brand-new signup is not taken", () => {
  assert.equal(isAddressTaken({ user: { identities: [{ provider: "email" }] } }), false);
});

test("an unconfirmed account gets its confirmation re-sent, so it is not this case", () => {
  // Supabase returns the real user, identities intact. "Check your email" is
  // the right answer there, and it is the caller's fall-through branch.
  assert.equal(isAddressTaken({ user: { identities: [{ provider: "email" }] } }), false);
});

test("absent identities is not empty identities", () => {
  // The field is optional in the response type. Reading a missing list as
  // "taken" would tell a brand-new pharmacy it already has an account.
  assert.equal(isAddressTaken({ user: {} }), false);
  assert.equal(isAddressTaken({ user: { identities: null } }), false);
  assert.equal(isAddressTaken({ user: null }), false);
  assert.equal(isAddressTaken({}), false);
});

test("an unrelated error is not a taken address", () => {
  assert.equal(isAddressTaken({ error: { code: "weak_password", message: "Password is too short" } }), false);
  assert.equal(isAddressTaken({ error: { code: "over_email_send_rate_limit", message: "Too many requests" } }), false);
  assert.equal(isAddressTaken({ error: { code: "signup_disabled", message: "Signups not allowed" } }), false);
});

test("an error wins over the identities check", () => {
  // A failed signUp has no trustworthy user payload; the error is the answer.
  assert.equal(isAddressTaken({ error: { code: "weak_password", message: "too short" }, user: { identities: [] } }), false);
});

// ---------------- readSignupState ----------------

const NOW = new Date("2026-10-10T12:00:00Z");

test("no row means nobody has used this address", () => {
  assert.deepEqual(readSignupState(null, { now: NOW }), { kind: "new" });
  assert.deepEqual(readSignupState(undefined, { now: NOW }), { kind: "new" });
});

test("a confirmed account is registered, whatever the send timestamps say", () => {
  const state = readSignupState(
    { confirmed_at: "2026-10-01T09:00:00Z", confirmation_sent_at: "2026-10-10T11:59:00Z" },
    { now: NOW },
  );
  assert.equal(state.kind, "registered");
});

test("an unconfirmed account with a live link is pending, and says when it dies", () => {
  const state = readSignupState(
    { confirmed_at: null, confirmation_sent_at: "2026-10-10T11:30:00Z" },
    { ttlSeconds: 3600, now: NOW },
  );
  assert.equal(state.kind, "pending");
  if (state.kind !== "pending") return;
  assert.equal(state.expiresAt.toISOString(), "2026-10-10T12:30:00.000Z");
  assert.equal(state.sentAt.toISOString(), "2026-10-10T11:30:00.000Z");
});

test("once the link runs out it is expired, so a fresh one gets sent", () => {
  const state = readSignupState(
    { confirmed_at: null, confirmation_sent_at: "2026-10-10T10:59:00Z" },
    { ttlSeconds: 3600, now: NOW },
  );
  assert.equal(state.kind, "expired");
});

test("the boundary belongs to expired, not pending", () => {
  // A link that dies exactly now is not one to tell someone to go and use.
  const exactly = readSignupState(
    { confirmed_at: null, confirmation_sent_at: "2026-10-10T11:00:00Z" },
    { ttlSeconds: 3600, now: NOW },
  );
  assert.equal(exactly.kind, "expired");
  const aSecondLeft = readSignupState(
    { confirmed_at: null, confirmation_sent_at: "2026-10-10T11:00:01Z" },
    { ttlSeconds: 3600, now: NOW },
  );
  assert.equal(aSecondLeft.kind, "pending");
});

test("a longer project expiry keeps the same link alive", () => {
  const row = { confirmed_at: null, confirmation_sent_at: "2026-10-10T06:00:00Z" };
  assert.equal(readSignupState(row, { ttlSeconds: 3600, now: NOW }).kind, "expired");
  assert.equal(readSignupState(row, { ttlSeconds: 86400, now: NOW }).kind, "pending");
});

test("an account with no send on record is offered a link rather than called pending", () => {
  // Made by an admin or an import: there is no link to be waiting on.
  assert.equal(readSignupState({ confirmed_at: null, confirmation_sent_at: null }, { now: NOW }).kind, "expired");
});

test("an unreadable timestamp is treated as expired, never as pending", () => {
  assert.equal(readSignupState({ confirmed_at: null, confirmation_sent_at: "not a date" }, { now: NOW }).kind, "expired");
});

test("the default expiry is the short one, because guessing long strands people", () => {
  assert.equal(DEFAULT_CONFIRMATION_TTL_SECONDS, 3600);
});

// ---------------- isSendingTooOften ----------------

test("Supabase's resend cap is recognised", () => {
  assert.equal(isSendingTooOften({ code: "over_email_send_rate_limit", message: "..." }), true);
  assert.equal(isSendingTooOften({ code: null, message: "For security purposes, you can only request this after 42 seconds" }), false);
  assert.equal(isSendingTooOften({ code: "weak_password", message: "too short" }), false);
  assert.equal(isSendingTooOften(null), false);
  assert.equal(isSendingTooOften(undefined), false);
});

// ---------------- isUnconfirmed ----------------

test("a sign-in blocked by a missing confirmation is told apart from a bad password", () => {
  assert.equal(isUnconfirmed({ code: "email_not_confirmed", message: "Email not confirmed" }), true);
  assert.equal(isUnconfirmed({ code: null, message: "Email not confirmed" }), true);
  assert.equal(isUnconfirmed({ code: "invalid_credentials", message: "Invalid login credentials" }), false);
  assert.equal(isUnconfirmed(null), false);
  assert.equal(isUnconfirmed(undefined), false);
});

// ---------------- normalizeOtpCode ----------------

test("a code is however many digits the project issues, not six", () => {
  // GOTRUE_MAILER_OTP_LENGTH is 6..10, and newer projects default to 8.
  assert.equal(normalizeOtpCode("123456"), "123456");
  assert.equal(normalizeOtpCode("12345678"), "12345678");
  assert.equal(normalizeOtpCode("1234567890"), "1234567890");
});

test("what pasting out of an email adds is stripped, not refused", () => {
  assert.equal(normalizeOtpCode("123 456"), "123456");
  assert.equal(normalizeOtpCode(" 1234 5678 "), "12345678");
  assert.equal(normalizeOtpCode("1234-5678"), "12345678");
  assert.equal(normalizeOtpCode("1234 5678"), "12345678");
  assert.equal(normalizeOtpCode("12—3456"), "123456");
});

test("too short or too long is not a code", () => {
  assert.equal(normalizeOtpCode("12345"), null);
  assert.equal(normalizeOtpCode("12345678901"), null);
  assert.equal(normalizeOtpCode(""), null);
});

test("anything that is not digits is not a code", () => {
  assert.equal(normalizeOtpCode("12345a"), null);
  assert.equal(normalizeOtpCode("abcdef"), null);
  assert.equal(normalizeOtpCode("12345+"), null);
});

test("the bounds are the ones Supabase allows", () => {
  assert.equal(OTP_MIN_LENGTH, 6);
  assert.equal(OTP_MAX_LENGTH, 10);
});
