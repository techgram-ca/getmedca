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

export type EmailAttachment = {
  filename: string;
  /** Raw bytes. Encoded for the provider here, never carried around base64. */
  content: Uint8Array;
  contentType?: string;
};

export type HtmlEmail = {
  to: string;
  subject: string;
  html: string;
  /** What a client that refuses HTML shows. Always send one. */
  text: string;
  from?: string;
  /** Where a reply goes, which for outreach is a person rather than no-reply. */
  replyTo?: string;
  attachments?: EmailAttachment[];
};

/**
 * One HTML email, with a reply-to and optional attachments.
 *
 * Separate from `sendEmail` because that one is for transactional notices:
 * plain text, from no-reply, and nobody is expected to answer them. An
 * outreach pitch is the opposite on all three counts — a reply to it is the
 * entire point.
 *
 * Returns the provider's message id so a send can be traced afterwards.
 * Nothing about the body is logged.
 */
export async function sendHtmlEmail(message: HtmlEmail): Promise<{ id: string | null }> {
  const key = process.env.RESEND_API_KEY;
  const from = message.from ?? process.env.RESEND_FROM_EMAIL ?? "GetMed <no-reply@getmed.ca>";
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[email:dev] to=${message.to} subject="${message.subject}" html=${message.html.length} chars` +
          `${message.attachments?.length ? ` +${message.attachments.length} attachment(s)` : ""}`,
      );
      return { id: null };
    }
    throw new Error("Resend is not configured");
  }
  const { Resend } = await import("resend");
  const resend = new Resend(key);
  const { data, error } = await resend.emails.send({
    from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    ...(message.attachments?.length
      ? {
          attachments: message.attachments.map((a) => ({
            filename: a.filename,
            content: Buffer.from(a.content).toString("base64"),
            ...(a.contentType ? { contentType: a.contentType } : {}),
          })),
        }
      : {}),
  });
  // Resend reports failures in the body rather than by throwing, so a caller
  // that only caught exceptions would record every rejected send as a success.
  if (error) throw new Error(error.message || "Resend rejected the message");
  return { id: data?.id ?? null };
}
