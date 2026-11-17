import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isUndeliverableAddressError } from "./send.ts";

/**
 * Real responses, as nodemailer puts them into `Error.message` — that string
 * is all the send path keeps, and it is what gets classified.
 */
const DEAD_ADDRESS = [
  "Message failed: 550 5.1.1 <info@closedpharmacy.ca>: Recipient address rejected: User unknown in virtual mailbox table",
  "550 5.1.1 The email account that you tried to reach does not exist. Please try double-checking the recipient's email address for typos.",
  "Invalid recipients: 550 5.4.1 Recipient address rejected: Access denied",
  "550 5.1.2 Bad destination system address",
  "553 5.1.3 <rx@>: Malformed address",
  "Message failed: 550 Requested action not taken: mailbox unavailable",
  "Message failed: 554 5.7.1 <pharmacy@nosuchdomain.invalid>: Relay access denied; domain not found",
  "Message failed: 550 No such user here",
  "The mail server rejected info@oldpharmacy.ca",
  // Resend's own validation, which is a different wording for the same thing.
  "Invalid `to` field. The email address is not a valid email address.",
];

/** Failures that would otherwise condemn every address in the batch. */
const NOT_THE_ADDRESS = [
  "Invalid login: 535 Authentication Failed",
  "535 5.7.8 Error: authentication failed: UGFzc3dvcmQ6",
  "Missing credentials for \"PLAIN\"",
  "connect ECONNREFUSED 136.143.188.17:465",
  "Connection timeout",
  "read ECONNRESET",
  "Greeting never received",
  "getaddrinfo ENOTFOUND smtp.zoho.com",
  "421 4.7.0 Try again later, closing connection",
  "450 4.2.1 The user you are trying to contact is receiving mail too quickly",
  "452 4.2.2 Mailbox full",
  "552 5.2.2 Mailbox full",
  "429 Too many requests. You can only make 2 requests per second.",
  "Attachment \"Rate card.pdf\" could not be read from storage",
  "OUTREACH_FROM_EMAIL is not set — outreach has no address to send from.",
  "Neither a mailbox nor Resend is configured — outreach has no way to send.",
];

test("a recipient-level refusal is recognised", () => {
  for (const detail of DEAD_ADDRESS) {
    assert.equal(isUndeliverableAddressError(detail), true, detail);
  }
});

test("a failure that is not about the address is left alone", () => {
  for (const detail of NOT_THE_ADDRESS) {
    assert.equal(isUndeliverableAddressError(detail), false, detail);
  }
});

test("nothing to go on is not evidence", () => {
  assert.equal(isUndeliverableAddressError(""), false);
  assert.equal(isUndeliverableAddressError("   "), false);
  assert.equal(isUndeliverableAddressError(null), false);
  assert.equal(isUndeliverableAddressError(undefined), false);
  assert.equal(isUndeliverableAddressError("Send failed"), false);
});

test("a 4xx reply is a retry even when its prose sounds permanent", () => {
  assert.equal(
    isUndeliverableAddressError("450 4.1.1 <rx@example.ca>: Recipient address rejected: unverified address"),
    false,
  );
});
