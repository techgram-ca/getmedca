import { strict as assert } from "node:assert";
import { afterEach, test } from "node:test";
import { sendHtmlEmail, smtpConfigFromEnv } from "./send.ts";

const SMTP_KEYS = [
  "OUTREACH_SMTP_HOST", "OUTREACH_SMTP_PORT", "OUTREACH_SMTP_USER",
  "OUTREACH_SMTP_PASSWORD", "OUTREACH_SMTP_SECURE",
] as const;

const saved = {
  key: process.env.RESEND_API_KEY,
  env: process.env.NODE_ENV,
  smtp: Object.fromEntries(SMTP_KEYS.map((k) => [k, process.env[k]])),
};

afterEach(() => {
  if (saved.key === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = saved.key;
  process.env.NODE_ENV = saved.env;
  for (const k of SMTP_KEYS) {
    const v = saved.smtp[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

function setSmtp(values: Partial<Record<(typeof SMTP_KEYS)[number], string>>) {
  for (const k of SMTP_KEYS) delete process.env[k];
  for (const [k, v] of Object.entries(values)) process.env[k] = v;
}

const message = { to: "rx@bolton.ca", subject: "Hello", html: "<p>Hi</p>", text: "Hi" };

test("without a key in development it reports no id rather than pretending to send", async () => {
  delete process.env.RESEND_API_KEY;
  process.env.NODE_ENV = "development";
  assert.deepEqual(await sendHtmlEmail(message), { id: null });
});

test("without a key in production it refuses loudly", async () => {
  delete process.env.RESEND_API_KEY;
  process.env.NODE_ENV = "production";
  // Silently swallowing this is how a whole batch of pitches never goes out
  // while the tracking list records every one of them as sent.
  await assert.rejects(() => sendHtmlEmail(message), /Resend is not configured/);
});


// ---------------- the outreach mailbox ----------------

test("no mailbox configured reads as no mailbox, not as a broken one", () => {
  setSmtp({});
  assert.equal(smtpConfigFromEnv(), null);
});

test("a half-configured mailbox is treated as absent rather than attempted", () => {
  // Host but no password is someone part-way through setting it up. Falling
  // back to Resend beats failing every send with an auth error.
  setSmtp({ OUTREACH_SMTP_HOST: "smtp.zoho.com", OUTREACH_SMTP_USER: "partners@getmed.ca" });
  assert.equal(smtpConfigFromEnv(), null);
  setSmtp({ OUTREACH_SMTP_HOST: "smtp.zoho.com", OUTREACH_SMTP_PASSWORD: "x" });
  assert.equal(smtpConfigFromEnv(), null);
});

test("port 465 implies implicit TLS and 587 does not", () => {
  // Getting this backwards is the usual reason a working mailbox refuses to
  // connect, so it is derived rather than left to be typed correctly.
  setSmtp({ OUTREACH_SMTP_HOST: "smtp.zoho.com", OUTREACH_SMTP_USER: "u", OUTREACH_SMTP_PASSWORD: "p", OUTREACH_SMTP_PORT: "465" });
  assert.equal(smtpConfigFromEnv()?.secure, true);
  setSmtp({ OUTREACH_SMTP_HOST: "smtp.zoho.com", OUTREACH_SMTP_USER: "u", OUTREACH_SMTP_PASSWORD: "p", OUTREACH_SMTP_PORT: "587" });
  assert.equal(smtpConfigFromEnv()?.secure, false);
});

test("the port defaults to 465 when it is not given", () => {
  setSmtp({ OUTREACH_SMTP_HOST: "smtp.zoho.com", OUTREACH_SMTP_USER: "u", OUTREACH_SMTP_PASSWORD: "p" });
  assert.deepEqual(smtpConfigFromEnv(), {
    host: "smtp.zoho.com", port: 465, secure: true, user: "u", password: "p",
  });
});

test("an unreadable port falls back rather than connecting to port NaN", () => {
  setSmtp({ OUTREACH_SMTP_HOST: "h", OUTREACH_SMTP_USER: "u", OUTREACH_SMTP_PASSWORD: "p", OUTREACH_SMTP_PORT: "four-six-five" });
  assert.equal(smtpConfigFromEnv()?.port, 465);
});

test("TLS can be forced either way when a host wants something unusual", () => {
  setSmtp({ OUTREACH_SMTP_HOST: "h", OUTREACH_SMTP_USER: "u", OUTREACH_SMTP_PASSWORD: "p", OUTREACH_SMTP_PORT: "2525", OUTREACH_SMTP_SECURE: "true" });
  assert.equal(smtpConfigFromEnv()?.secure, true);
  setSmtp({ OUTREACH_SMTP_HOST: "h", OUTREACH_SMTP_USER: "u", OUTREACH_SMTP_PASSWORD: "p", OUTREACH_SMTP_PORT: "465", OUTREACH_SMTP_SECURE: "false" });
  assert.equal(smtpConfigFromEnv()?.secure, false);
});

test("host and user are trimmed, because a pasted value brings whitespace", () => {
  setSmtp({ OUTREACH_SMTP_HOST: "  smtp.zohocloud.ca  ", OUTREACH_SMTP_USER: " partners@getmed.ca ", OUTREACH_SMTP_PASSWORD: "p" });
  const c = smtpConfigFromEnv();
  assert.equal(c?.host, "smtp.zohocloud.ca");
  assert.equal(c?.user, "partners@getmed.ca");
});

test("a different prefix reads a different mailbox", () => {
  setSmtp({});
  process.env.OTHER_HOST = "h";
  process.env.OTHER_USER = "u";
  process.env.OTHER_PASSWORD = "p";
  assert.equal(smtpConfigFromEnv("OTHER")?.host, "h");
  for (const k of ["OTHER_HOST", "OTHER_USER", "OTHER_PASSWORD"]) delete process.env[k];
});

test("transactional mail is unaffected: no mailbox means the Resend path", async () => {
  setSmtp({ OUTREACH_SMTP_HOST: "h", OUTREACH_SMTP_USER: "u", OUTREACH_SMTP_PASSWORD: "p" });
  delete process.env.RESEND_API_KEY;
  process.env.NODE_ENV = "development";
  // No `smtp` passed, so the outreach mailbox being set does not capture it.
  assert.deepEqual(await sendHtmlEmail(message), { id: null });
});
