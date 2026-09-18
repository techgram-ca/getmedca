import { NextResponse } from "next/server";
import { requirePharmacy } from "@getmed/core/auth";
import { NotFoundError } from "@getmed/core/errors";
import { signedUrl, type Bucket } from "@getmed/core/storage";
import { handler } from "@/lib/api";

const KINDS: Record<string, { bucket: Bucket; column: "prescription_file_path" | "insurance_file_path" | "health_card_file_path" }> = {
  prescription: { bucket: "prescriptions", column: "prescription_file_path" },
  insurance: { bucket: "insurance", column: "insurance_file_path" },
  health_card: { bucket: "health-cards", column: "health_card_file_path" },
};

/** Redirects to a 5-minute signed URL after verifying the order belongs to this pharmacy. */
export const GET = handler(async (req: Request, ctx: { params: Promise<{ orderId: string }> }) => {
  const { orderId } = await ctx.params;
  const kind = KINDS[new URL(req.url).searchParams.get("kind") ?? ""];
  if (!kind) throw new NotFoundError();
  const { pharmacy, db } = await requirePharmacy();
  const { data: o } = await db.from("orders").select("prescription_file_path, insurance_file_path, health_card_file_path").eq("id", orderId).eq("pharmacy_id", pharmacy.id).maybeSingle();
  const path = o?.[kind.column];
  if (!path) throw new NotFoundError("File not found");
  const url = await signedUrl(db, kind.bucket, path, 300);
  if (!url) throw new NotFoundError("File not found");
  return NextResponse.redirect(url, { headers: { "cache-control": "no-store" } });
});
