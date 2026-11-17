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

/**
 * An SMTP mailbox to send through, instead of Resend.
 *
 * Exists because of a measured difference, not a theory: the same HTML from
 * the same address lands in Gmail's Primary tab sent from the Zoho mailbox
 * and in Promotions sent through Resend. Transactional mail is unaffected and
 * stays on Resend — it arrives in Primary already, and a mailbox's daily send
 * limit is not somewhere to put order alerts.
 */
export type SmtpConfig = {
  host: string;
  port: number;
  /** True for an implicit-TLS port (465); false for STARTTLS (587). */
  secure: boolean;
  user: string;
  password: string;
};

/**
 * Reads an SMTP mailbox out of the environment, or null if it is not set up.
 *
 * The host is configuration rather than a constant because Zoho runs separate
 * data centres — smtp.zoho.com, .eu, .ca and others — and a mailbox only
 * authenticates against its own.
 */
export function smtpConfigFromEnv(prefix = "OUTREACH_SMTP"): SmtpConfig | null {
  const host = process.env[`${prefix}_HOST`]?.trim();
  const user = process.env[`${prefix}_USER`]?.trim();
  const password = process.env[`${prefix}_PASSWORD`];
  if (!host || !user || !password) return null;
  const port = Number(process.env[`${prefix}_PORT`] ?? 465);
  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 465,
    // 465 is implicit TLS; 587 upgrades with STARTTLS. Getting this backwards
    // is the usual reason a working mailbox refuses to connect.
    secure: (process.env[`${prefix}_SECURE`] ?? "").trim() === ""
      ? port === 465
      : process.env[`${prefix}_SECURE`]!.trim().toLowerCase() === "true",
    user,
    password,
  };
}

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
  /**
   * Send through this mailbox instead of Resend. The caller decides, so a
   * transactional notice cannot be routed down the outreach path by a
   * stray environment variable.
   */
  smtp?: SmtpConfig | null;
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
  if (message.smtp) return sendOverSmtp(message, message.smtp);
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

/**
 * The same message over an ordinary mailbox.
 *
 * Nodemailer is imported lazily, like the Resend and Twilio clients above, so
 * an install that never sends this way never loads it.
 */
async function sendOverSmtp(message: HtmlEmail, smtp: SmtpConfig): Promise<{ id: string | null }> {
  const nodemailer = (await import("nodemailer")).default;
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.password },
  });
  const info = await transport.sendMail({
    // A mailbox will only send as itself or one of its own aliases, so an
    // unrelated From is rejected at the server rather than silently rewritten.
    from: message.from ?? smtp.user,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    ...(message.attachments?.length
      ? {
          attachments: message.attachments.map((a) => ({
            filename: a.filename,
            content: Buffer.from(a.content),
            ...(a.contentType ? { contentType: a.contentType } : {}),
          })),
        }
      : {}),
  });
  // Held for a retry rather than delivered: reported as a failure, because a
  // caller that recorded this as sent would be recording something untrue.
  if (info.rejected?.length) {
    throw new Error(`The mail server rejected ${info.rejected.join(", ")}`);
  }
  return { id: info.messageId ?? null };
}

/**
 * Phrases that mean the problem is this one recipient and will not go away.
 *
 * Mostly enhanced status codes, which say the same thing in every server's
 * wording, plus the prose the common ones put beside them.
 */
const BAD_ADDRESS_SIGNALS = [
  "5.1.1", "5.1.2", "5.1.3", "5.1.6", "5.1.10", "5.2.1", "5.4.4",
  "user unknown", "unknown user", "no such user", "no such recipient",
  "recipient not found", "recipient address rejected", "recipient rejected",
  "invalid recipient", "unknown recipient", "address does not exist",
  "mailbox unavailable", "mailbox not found", "mailbox does not exist",
  "does not exist", "unrouteable address", "unroutable address",
  "domain not found", "host or domain name not found", "nxdomain",
  "not a valid email", "invalid `to`",
  // Ours, from `info.rejected`: refused for this recipient by construction.
  "the mail server rejected",
];

/**
 * Reasons a send failed that say nothing about the address.
 *
 * These are the ones worth being careful about. A bad password or a dropped
 * connection fails every message in a batch, and treating that as "all forty
 * of these addresses are dead" would be a worse outcome than not noticing a
 * real one.
 */
const NOT_THE_ADDRESS = [
  "authentic", "invalid login", "not configured", "no way to send",
  "econnection", "esocket", "etimedout", "timeout", "timed out",
  "connection", "socket", "network", "dns",
  "rate limit", "too many", "quota", "mailbox full", "over the limit",
  "try again", "temporar", "greylist", "deferred",
  "attachment",
];

/**
 * Whether a failed send means the address itself is wrong.
 *
 * Errs towards saying no. A false yes stops the pitch going to a pharmacy
 * whose address was fine and puts it on a list of addresses to go and
 * re-find; a false no just leaves a dead address to be marked by hand, which
 * is where most of them come from anyway — a relay accepts the message and
 * bounces it minutes later, where nothing in this process can see it.
 */
export function isUndeliverableAddressError(detail: string | null | undefined): boolean {
  const text = (detail ?? "").toLowerCase();
  if (!text.trim()) return false;
  if (NOT_THE_ADDRESS.some((fragment) => text.includes(fragment))) return false;
  // A 4xx reply is the server asking for the message again later, whatever
  // prose it put after the code. Only a 5xx is a refusal that stands.
  if (/\b4\d\d\b/.test(text) && !/\b5\d\d\b/.test(text)) return false;
  return BAD_ADDRESS_SIGNALS.some((fragment) => text.includes(fragment));
}
