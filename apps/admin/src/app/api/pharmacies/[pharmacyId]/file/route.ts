import { NextResponse } from "next/server";
import { requireAdmin } from "@getmed/core/auth";
import { NotFoundError } from "@getmed/core/errors";
import { signedUrl } from "@getmed/core/storage";
import { handler } from "@/lib/api";

/** Licence document — admin-only, 5-minute signed URL. Not PHI. */
export const GET = handler(async (_req: Request, ctx: { params: Promise<{ pharmacyId: string }> }) => {
  const { pharmacyId } = await ctx.params;
  const { db } = await requireAdmin();
  const { data } = await db.from("pharmacies").select("license_doc_path").eq("id", pharmacyId).maybeSingle();
  const url = await signedUrl(db, "licensing", data?.license_doc_path, 300);
  if (!url) throw new NotFoundError("No document");
  return NextResponse.redirect(url, { headers: { "cache-control": "no-store" } });
});
