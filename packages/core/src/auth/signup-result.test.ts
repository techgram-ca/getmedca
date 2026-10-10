import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  DEFAULT_CONFIRMATION_TTL_SECONDS,
  isAddressTaken,
  isSendingTooOften,
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
