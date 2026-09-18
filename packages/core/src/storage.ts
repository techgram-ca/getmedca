import type { ServiceClient } from "@getmed/db/service";

export type Bucket =
  | "prescriptions"
  | "insurance"
  | "health-cards"
  | "licensing"
  | "pharmacy-media"
  | "driver-docs"
  | "proof-of-delivery";

/** Short-lived signed URL (default 5 minutes) for a private object. */
export async function signedUrl(db: ServiceClient, bucket: Bucket, path: string | null | undefined, expiresIn = 300) {
  if (!path) return null;
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

/** Longer-lived (1h) signed URLs for non-PHI marketing media (logos, covers, pharmacist photos). */
export async function mediaUrl(db: ServiceClient, path: string | null | undefined) {
  return signedUrl(db, "pharmacy-media", path, 3600);
}

const ALLOWED_DOC_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function assertDocType(file: File, imagesOnly = false) {
  const allowed = imagesOnly ? ALLOWED_IMAGE_TYPES : ALLOWED_DOC_TYPES;
  if (!allowed.has(file.type)) throw new Error(`Unsupported file type: ${file.type || "unknown"}`);
  if (file.size > 20 * 1024 * 1024) throw new Error("File too large (max 20 MB)");
}

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return file.type.split("/")[1] ?? "bin";
}

/**
 * Upload a File with the service role into a private bucket. The object key
 * is opaque (folder/uuid.ext) — never derived from PHI.
 */
export async function uploadPrivate(db: ServiceClient, bucket: Bucket, folder: string, file: File, imagesOnly = false) {
  assertDocType(file, imagesOnly);
  const key = `${folder}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await db.storage.from(bucket).upload(key, bytes, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return key;
}

/** Upload a base64 data URL (used for signature pad / camera captures). */
export async function uploadDataUrl(db: ServiceClient, bucket: Bucket, folder: string, dataUrl: string) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid image data");
  const contentType = match[1]!;
  const bytes = Buffer.from(match[2]!, "base64");
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("Image too large");
  const key = `${folder}/${crypto.randomUUID()}.${contentType.split("/")[1]}`;
  const { error } = await db.storage.from(bucket).upload(key, bytes, { contentType, upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return key;
}
