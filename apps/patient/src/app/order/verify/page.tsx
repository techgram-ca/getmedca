import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { maskPhone } from "@getmed/core/format";
import { OtpForm } from "@/components/otp-form";
import { getOrderSummary } from "@/lib/order-summary";

export const metadata: Metadata = { title: "Verify your phone" };
export const dynamic = "force-dynamic";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const { orderId } = await searchParams;
  if (!orderId) notFound();
  const order = await getOrderSummary(orderId);
  if (!order) notFound();
  if (order.phone_verified_at) redirect(`/order/success?orderId=${order.id}`);

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <OtpForm
        kind="order"
        targetId={order.id}
        maskedPhone={maskPhone(order.patient_phone)}
        successHref={`/order/success?orderId=${order.id}`}
        failureHref={`/order/failure?orderId=${order.id}`}
      />
    </div>
  );
}
