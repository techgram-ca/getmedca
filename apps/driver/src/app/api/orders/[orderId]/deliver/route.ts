import { NextResponse } from "next/server";
import { requireDriver } from "@getmed/core/auth";
import { AppError } from "@getmed/core/errors";
import { deliverOrder } from "@getmed/core/orders";
import { uploadDataUrl, uploadPrivate } from "@getmed/core/storage";
import { handler } from "@/lib/api";

/** Proof of delivery: photo + signature → private bucket → status delivered (fee snapshotted). */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ orderId: string }> }) => {
  const { orderId } = await ctx.params;
  const { driver, db } = await requireDriver();
  const fd = await req.formData();
  const photo = fd.get("photo");
  const signature = fd.get("signature");
  if (!(photo instanceof File) || photo.size === 0) throw new AppError("A delivery photo is required");
  if (typeof signature !== "string" || !signature.startsWith("data:image/")) throw new AppError("A signature is required");

  const [photoPath, signaturePath] = await Promise.all([
    uploadPrivate(db, "proof-of-delivery", `${orderId}/photo`, photo, true),
    uploadDataUrl(db, "proof-of-delivery", `${orderId}/signature`, signature),
  ]);
  const order = await deliverOrder(orderId, driver.id, { photoPath, signaturePath }, { db });
  return NextResponse.json({ ok: true, status: order.status });
});
