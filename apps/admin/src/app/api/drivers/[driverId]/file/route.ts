import { NextResponse } from "next/server";
import { requireAdmin } from "@getmed/core/auth";
import { NotFoundError } from "@getmed/core/errors";
import { signedUrl } from "@getmed/core/storage";
import { handler } from "@/lib/api";

export const GET = handler(async (req: Request, ctx: { params: Promise<{ driverId: string }> }) => {
  const { driverId } = await ctx.params;
  const kind = new URL(req.url).searchParams.get("kind");
  const { db } = await requireAdmin();
  const { data } = await db.from("drivers").select("license_doc_path, insurance_doc_path").eq("id", driverId).maybeSingle();
  const path = kind === "insurance" ? data?.insurance_doc_path : data?.license_doc_path;
  const url = await signedUrl(db, "driver-docs", path, 300);
  if (!url) throw new NotFoundError("No document");
  return NextResponse.redirect(url, { headers: { "cache-control": "no-store" } });
});
