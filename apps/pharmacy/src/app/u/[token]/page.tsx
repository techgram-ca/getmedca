import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Logo } from "@getmed/ui";
import { createServiceClient } from "@getmed/db/service";
import { UnsubscribeButton } from "@/components/unsubscribe-button";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Unsubscribing from the pitch emails.
 *
 * The link in the email opens this page; the change happens on the button,
 * which is a POST. A link that unsubscribed on GET would be spent by the same
 * mail scanners that fetch every other link in a message — quietly removing
 * pharmacies who never asked, in a way nobody could later tell apart from a
 * real unsubscribe.
 *
 * No login, nothing to fill in, and it works for anyone holding the link,
 * which is what CASL asks of an unsubscribe mechanism.
 */
export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = createServiceClient();
  const { data: contact } = await db
    .from("outreach_contacts")
    .select("pharmacy_name, unsubscribed_at")
    .eq("token", token)
    .maybeSingle();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-ink-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Link href="/" className="no-underline"><Logo /></Link></div>
        <div className="surface p-6">
          {!contact ? (
            <Alert tone="info" title="Nothing to unsubscribe">
              This link does not match anything on our list, so there is nothing here to stop. You will not be emailed
              from it.
            </Alert>
          ) : contact.unsubscribed_at ? (
            <Alert tone="success" title="You are unsubscribed">
              We will not email {contact.pharmacy_name} about GetMed again.
            </Alert>
          ) : (
            <>
              <h1 className="text-xl font-semibold">Stop these emails?</h1>
              <p className="mt-2 text-sm text-ink-600">
                We will not contact {contact.pharmacy_name} about joining GetMed again. This does not affect anything
                else — if the pharmacy already has an account, it keeps working exactly as it did.
              </p>
              <UnsubscribeButton token={token} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
