"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@getmed/core/auth";
import { sendHtmlEmail, type EmailAttachment } from "@getmed/core/notifications";
import {
  dropUnresolvedLinks,
  htmlToPlainText,
  outreachSendBlockers,
  renderOutreachEmail,
  type EmailTemplate,
  type LinkRule,
} from "@getmed/core/outreach";
import type { ServiceClient } from "@getmed/db/service";

/** What happened to one pharmacy, so a bulk send can report per-row. */
export type SendOutcome = {
  contactId: string;
  pharmacyName: string;
  status: "sent" | "skipped" | "failed";
  /** Why it was skipped, or what the provider said when it failed. */
  detail?: string;
};

export type SendResult = { ok: true; outcomes: SendOutcome[] } | { ok: false; error: string };

const MAX_PER_BATCH = 50;

/**
 * Who the pitch comes from.
 *
 * Deliberately separate from `RESEND_FROM_EMAIL`, which is the no-reply
 * address transactional notices go out under. A pitch that cannot be replied
 * to is not a pitch, and sending both from one address means a pharmacy's
 * answer lands wherever order alerts bounce to.
 */
function senderConfig(): { from: string; replyTo: string | undefined } {
  const from = process.env.OUTREACH_FROM_EMAIL?.trim();
  const replyTo = process.env.OUTREACH_REPLY_TO_EMAIL?.trim();
  if (!from) throw new Error("OUTREACH_FROM_EMAIL is not set — outreach has no address to send from.");
  return { from, replyTo: replyTo || undefined };
}

/** Pulls the template's attachments out of storage, once per batch. */
async function loadAttachments(db: ServiceClient, templateId: string): Promise<EmailAttachment[]> {
  const { data: files } = await db
    .from("outreach_template_files")
    .select("path, filename, content_type")
    .eq("template_id", templateId)
    .eq("kind", "attachment")
    .order("created_at");
  if (!files?.length) return [];

  const out: EmailAttachment[] = [];
  for (const f of files) {
    const { data, error } = await db.storage.from("outreach-media").download(f.path);
    // A missing object would otherwise send the pitch silently without the
    // thing it refers to, which is worse than not sending it.
    if (error || !data) throw new Error(`Attachment "${f.filename}" could not be read from storage`);
    out.push({
      filename: f.filename,
      content: new Uint8Array(await data.arrayBuffer()),
      contentType: f.content_type,
    });
  }
  return out;
}

/**
 * Sends one template to each of the given contacts.
 *
 * Every contact is rendered and checked on its own, and one that cannot be
 * sent is skipped with a reason rather than failing the batch: the point of
 * selecting twelve pharmacies is not to find out that one of them has no
 * city. Nothing is sent twice in a batch, because a duplicated id in the
 * selection would otherwise mean a duplicated email.
 *
 * A successful send sets `sent_at`, which the bot filter measures its
 * one-minute window from — so the thing that used to be a button to remember
 * to press is now a side effect of the send itself.
 */
export async function sendOutreachEmails(contactIds: string[], templateId: string): Promise<SendResult> {
  try {
    const ids = [...new Set(contactIds.filter(Boolean))];
    if (ids.length === 0) return { ok: false, error: "No pharmacies selected" };
    if (ids.length > MAX_PER_BATCH) {
      return { ok: false, error: `Select at most ${MAX_PER_BATCH} at a time — this one had ${ids.length}.` };
    }

    const { db } = await requireAdmin();
    const { from, replyTo } = senderConfig();

    const [{ data: template }, { data: rules }, { data: contacts }] = await Promise.all([
      db.from("outreach_email_templates").select("*").eq("id", templateId).maybeSingle(),
      db.from("outreach_link_rules").select("slug, site, path, appends_rest, label").order("sort_order"),
      db.from("outreach_contacts").select("*").in("id", ids),
    ]);
    if (!template) return { ok: false, error: "That template no longer exists" };
    if (!contacts?.length) return { ok: false, error: "Those contacts no longer exist" };

    const linkRules = (rules ?? []) as LinkRule[];
    const shape: EmailTemplate = { subject: template.subject, body: template.body };
    const pharmacyUrl = process.env.NEXT_PUBLIC_PHARMACY_URL ?? "https://pharmacy.getmed.ca";

    const attachments = await loadAttachments(db, template.id);
    const outcomes: SendOutcome[] = [];

    for (const contact of contacts) {
      const rendered = renderOutreachEmail(shape, contact, linkRules, pharmacyUrl);
      const blockers = outreachSendBlockers(contact, shape, rendered);
      if (blockers.length) {
        outcomes.push({
          contactId: contact.id,
          pharmacyName: contact.pharmacy_name,
          status: "skipped",
          detail: blockers.join("; "),
        });
        continue;
      }

      const to = contact.contact_email!.trim();
      // No link is required, so one that could not be built for this pharmacy
      // comes out of the body rather than going out as href="[rates-link]".
      const html = dropUnresolvedLinks(rendered.html, rendered.unknown);
      try {
        const { id } = await sendHtmlEmail({
          to,
          subject: rendered.subject,
          html,
          text: htmlToPlainText(html),
          from,
          replyTo,
          attachments,
        });
        await db.from("outreach_sends").insert({
          contact_id: contact.id,
          template_id: template.id,
          template_name: template.name,
          to_email: to,
          subject: rendered.subject,
          status: "sent",
          provider_message_id: id,
          attachment_count: attachments.length,
        });
        // Only the first send sets it. The window the bot filter measures
        // belongs to the pitch; a follow-up weeks later would move it and
        // retrospectively reclassify every visit in between.
        if (!contact.sent_at) {
          await db.from("outreach_contacts").update({ sent_at: new Date().toISOString() }).eq("id", contact.id);
        }
        outcomes.push({ contactId: contact.id, pharmacyName: contact.pharmacy_name, status: "sent" });
      } catch (e) {
        const detail = e instanceof Error ? e.message : "Send failed";
        await db.from("outreach_sends").insert({
          contact_id: contact.id,
          template_id: template.id,
          template_name: template.name,
          to_email: to,
          subject: rendered.subject,
          status: "failed",
          error: detail.slice(0, 500),
          attachment_count: attachments.length,
        });
        outcomes.push({ contactId: contact.id, pharmacyName: contact.pharmacy_name, status: "failed", detail });
      }
    }

    revalidatePath("/tracking");
    for (const o of outcomes) revalidatePath(`/tracking/${o.contactId}`);
    return { ok: true, outcomes };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed" };
  }
}

/** Whether sending is configured at all, so the UI can say so before trying. */
export async function outreachSenderReady(): Promise<{ ready: boolean; from: string | null; replyTo: string | null }> {
  await requireAdmin();
  const from = process.env.OUTREACH_FROM_EMAIL?.trim() || null;
  const replyTo = process.env.OUTREACH_REPLY_TO_EMAIL?.trim() || null;
  return { ready: !!from && !!process.env.RESEND_API_KEY, from, replyTo };
}
