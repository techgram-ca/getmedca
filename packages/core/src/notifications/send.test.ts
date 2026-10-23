import { strict as assert } from "node:assert";
import { afterEach, test } from "node:test";
import { sendHtmlEmail } from "./send.ts";

const saved = { key: process.env.RESEND_API_KEY, env: process.env.NODE_ENV };

afterEach(() => {
  if (saved.key === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = saved.key;
  process.env.NODE_ENV = saved.env;
});

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
