import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isAddressTaken } from "./signup-result.ts";

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
