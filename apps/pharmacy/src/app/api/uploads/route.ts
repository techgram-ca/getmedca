import { requirePharmacy } from "@getmed/core/auth";
import { AppError } from "@getmed/core/errors";
import { signedUrl, uploadPrivate, type Bucket } from "@getmed/core/storage";
import { handler, json } from "@/lib/api";

const ALLOWED: Record<string, { bucket: Bucket; imagesOnly: boolean }> = {
  logo: { bucket: "pharmacy-media", imagesOnly: true },
  cover: { bucket: "pharmacy-media", imagesOnly: true },
  gallery: { bucket: "pharmacy-media", imagesOnly: true },
  pharmacist: { bucket: "pharmacy-media", imagesOnly: true },
  license: { bucket: "licensing", imagesOnly: false },
};

/** Pharmacy-owned uploads (media + licensing). Stored under <pharmacyId>/… in a private bucket. */
export const POST = handler(async (req: Request) => {
  const { pharmacy, db } = await requirePharmacy();
  const fd = await req.formData();
  const kind = String(fd.get("kind") ?? "");
  const file = fd.get("file");
  const cfg = ALLOWED[kind];
  if (!cfg || !(file instanceof File) || file.size === 0) throw new AppError("Invalid upload");
  const path = await uploadPrivate(db, cfg.bucket, `${pharmacy.id}/${kind}`, file, cfg.imagesOnly);
  const url = await signedUrl(db, cfg.bucket, path, 3600);
  return json({ path, url });
});
