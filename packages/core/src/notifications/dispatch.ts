import type { ServiceClient } from "@getmed/db/service";
import type { NotificationChannel } from "@getmed/db/types";
import { TEMPLATE_DEFAULTS, type NotificationEvent } from "./defaults";
import { renderTemplate } from "./render";
import { sendEmail, sendSms } from "./send";

export type Target = { phone?: string | null; email?: string | null };

async function loadTemplate(db: ServiceClient, event: NotificationEvent, channel: NotificationChannel) {
  const { data } = await db
    .from("notification_templates")
    .select("subject, template_text, enabled")
    .eq("event_type", event)
    .eq("channel", channel)
    .maybeSingle();
  if (data) return { subject: data.subject, text: data.template_text, enabled: data.enabled };
  return TEMPLATE_DEFAULTS[event][channel];
}

/**
 * Render the admin-managed template for `event` and deliver it on every
 * enabled channel the target has an address for. Failures are swallowed
 * (and reported) so a notification outage never blocks an order transition.
 */
export async function notify(
  db: ServiceClient,
  event: NotificationEvent,
  target: Target,
  vars: Record<string, string | number | null | undefined>,
  opts: { channels?: NotificationChannel[] } = {},
): Promise<void> {
  const channels = opts.channels ?? (["sms", "email"] as NotificationChannel[]);
  await Promise.all(
    channels.map(async (channel) => {
      try {
        const address = channel === "sms" ? target.phone : target.email;
        if (!address) return;
        const tpl = await loadTemplate(db, event, channel);
        if (!tpl || !tpl.enabled) return;
        const body = renderTemplate(tpl.text, vars);
        if (channel === "sms") await sendSms(address, body);
        else await sendEmail(address, renderTemplate(tpl.subject ?? "GetMed notification", vars), body);
      } catch (err) {
        console.error(`[notify] ${event}/${channel} failed`, err instanceof Error ? err.message : err);
      }
    }),
  );
}

export function adminTarget(): Target {
  return { phone: process.env.ADMIN_NOTIFICATION_PHONE ?? null, email: process.env.ADMIN_NOTIFICATION_EMAIL ?? null };
}
