/**
 * Low-level senders. Never log message bodies (they may contain PHI).
 */

export async function sendSms(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[sms:dev] to=${to.slice(-4).padStart(to.length, "•")} (${body.length} chars)`);
      return;
    }
    throw new Error("Twilio is not configured");
  }
  const twilio = (await import("twilio")).default;
  const client = twilio(sid, token);
  await client.messages.create({ to, from, body });
}

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "GetMed <no-reply@getmed.ca>";
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email:dev] to=${to} subject="${subject}"`);
      return;
    }
    throw new Error("Resend is not configured");
  }
  const { Resend } = await import("resend");
  const resend = new Resend(key);
  await resend.emails.send({ from, to, subject, text });
}
