import { StickyNote } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

export type DeliveryProofView = {
  photoUrl: string | null;
  signatureUrl: string | null;
  note: string | null;
  capturedAt: string;
  driverName: string | null;
};

/**
 * What the driver captured on delivery, shown to the pharmacy and to admin.
 * The URLs are short-lived signed links, so the page is rendered per request
 * rather than cached.
 */
export function DeliveryProofCard({
  proof,
  capturedAtLabel,
}: {
  proof: DeliveryProofView;
  /** Pre-formatted timestamp — formatting lives in the app, not the UI package. */
  capturedAtLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Proof of delivery</CardTitle>
        <CardDescription>
          Captured {capturedAtLabel}
          {proof.driverName ? ` by ${proof.driverName}` : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <figure className="m-0">
            <figcaption className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Photo at the door</figcaption>
            {proof.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL from a private bucket, expires in minutes
              <img
                src={proof.photoUrl}
                alt="Delivery photo taken by the driver"
                className="aspect-[4/3] w-full rounded-xl border border-ink-200 object-cover"
              />
            ) : (
              <p className="rounded-xl border border-dashed border-ink-300 px-3 py-6 text-center text-sm text-ink-500">
                Photo unavailable
              </p>
            )}
          </figure>
          <figure className="m-0">
            <figcaption className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Recipient signature</figcaption>
            {proof.signatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL from a private bucket, expires in minutes
              <img
                src={proof.signatureUrl}
                alt="Signature captured on delivery"
                className="aspect-[4/3] w-full rounded-xl border border-ink-200 bg-white object-contain p-2"
              />
            ) : (
              <p className="rounded-xl border border-dashed border-ink-300 px-3 py-6 text-center text-sm text-ink-500">
                Signature unavailable
              </p>
            )}
          </figure>
        </div>

        {proof.note ? (
          <div className="flex gap-3 rounded-xl bg-ink-50 px-4 py-3">
            <StickyNote className="mt-0.5 size-4 shrink-0 text-brand-600" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Driver's note</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-800">{proof.note}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
