"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@getmed/core/auth";
import { publicUrl } from "@getmed/core/storage";

type R = { ok: true; url?: string } | { ok: false; error: string };

/** What a mail client will actually render, or carry. */
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ATTACHMENT_TYPES = new Set([...IMAGE_TYPES, "application/pdf"]);

/**
 * Resend puts a cap on the whole message, and the body plus every attachment
 * counts toward it once they are base64 encoded — which costs about a third
 * on top. Five megabytes of originals leaves room and is already more than
 * anyone should attach to a cold pitch.
 */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Adds a file to a template.
 *
 * An `attachment` rides with the message. An `image` is uploaded, and its
 * public URL handed back for the admin to drop into an `<img src>` — mail
 * clients fetch those themselves, from an inbox, with no session.
 */
export async function addTemplateFile(form: FormData): Promise<R> {
  try {
    const { db } = await requireAdmin();
    const templateId = String(form.get("templateId") ?? "");
    const kind = String(form.get("kind") ?? "");
    const file = form.get("file");

    if (!templateId) return { ok: false, error: "Save the template before adding files to it" };
    if (kind !== "attachment" && kind !== "image") return { ok: false, error: "Unknown file kind" };
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a file" };

    const allowed = kind === "image" ? IMAGE_TYPES : ATTACHMENT_TYPES;
    if (!allowed.has(file.type)) {
      return {
        ok: false,
        error: kind === "image" ? "Images only: JPEG, PNG, WebP or GIF" : "JPEG, PNG, WebP, GIF or PDF only",
      };
    }
    if (file.size > MAX_BYTES) {
      return { ok: false, error: `Too large (${(file.size / 1024 / 1024).toFixed(1)} MB). The limit is 5 MB.` };
    }

    // The key is random rather than the filename: these objects are readable
    // by anyone holding the URL, and a guessable one is a different thing.
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const key = `${templateId}/${crypto.randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await db.storage
      .from("outreach-media")
      .upload(key, bytes, { contentType: file.type, upsert: false });
    if (upErr) return { ok: false, error: `Upload failed: ${upErr.message}` };

    const { error } = await db.from("outreach_template_files").insert({
      template_id: templateId,
      kind,
      path: key,
      filename: file.name.slice(0, 200),
      content_type: file.type,
      size_bytes: file.size,
    });
    if (error) {
      // Nothing points at the object now, so leaving it would be litter.
      await db.storage.from("outreach-media").remove([key]);
      return { ok: false, error: error.message };
    }

    revalidatePath("/tracking");
    return { ok: true, url: publicUrl(db, "outreach-media", key) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed" };
  }
}

/** Removes a file from a template, and the object behind it. */
export async function deleteTemplateFile(id: string): Promise<R> {
  const { db } = await requireAdmin();
  const { data: file } = await db.from("outreach_template_files").select("path").eq("id", id).maybeSingle();
  if (!file) return { ok: true };
  const { error } = await db.from("outreach_template_files").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  // After the row, so a failed storage delete leaves a stray object rather
  // than a row pointing at nothing — a broken image is worse than litter.
  await db.storage.from("outreach-media").remove([file.path]);
  revalidatePath("/tracking");
  return { ok: true };
}
