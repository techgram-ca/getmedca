import type { ServiceClient } from "@getmed/db/service";
import { signedUrl } from "../storage";

export type DeliveryProof = {
  /** Signed URL, valid for 10 minutes. Never a public link — the bucket is private. */
  photoUrl: string | null;
  signatureUrl: string | null;
  note: string | null;
  capturedAt: string;
  driverName: string | null;
};

/**
 * The photo, signature and note a driver captured on delivery, for the pharmacy
 * and admin order pages.
 *
 * The proof-of-delivery bucket is private, so the images are served through
 * short-lived signed URLs generated per request rather than stored links — the
 * photo shows a patient's doorway and the signature is their handwriting.
 */
export async function loadDeliveryProof(db: ServiceClient, orderId: string): Promise<DeliveryProof | null> {
  const { data } = await db
    .from("proof_of_delivery")
    .select("photo_path, signature_path, note, created_at, drivers(name)")
    .eq("order_id", orderId)
    .maybeSingle();
  if (!data) return null;

  const row = data as typeof data & { drivers: { name: string } | null };
  const [photoUrl, signatureUrl] = await Promise.all([
    signedUrl(db, "proof-of-delivery", row.photo_path, 600),
    signedUrl(db, "proof-of-delivery", row.signature_path, 600),
  ]);
  return {
    photoUrl,
    signatureUrl,
    note: row.note,
    capturedAt: row.created_at,
    driverName: row.drivers?.name ?? null,
  };
}
