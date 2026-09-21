import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { maskPhone } from "@getmed/core/format";
import { OtpForm } from "@/components/otp-form";
import { OrderingFrom } from "@/components/pharmacy/ordering-from";
import { getOrderSummary, toChrome } from "@/lib/order-summary";

export const metadata: Metadata = { title: "Verify your phone" };
export const dynamic = "force-dynamic";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const { orderId } = await searchParams;
  if (!orderId) notFound();
  const order = await getOrderSummary(orderId);
  if (!order) notFound();
  if (order.phone_verified_at) redirect(`/order/success?orderId=${order.id}`);
  const chrome = toChrome(order.pharmacy);

  return (
    <div className="mx-auto w-full max-w-md px-6 py-14">
      {chrome ? (
        <OrderingFrom
          className="mb-6"
          showBack={false}
          label="Your order goes to"
          pharmacy={{ id: chrome.id, slug: chrome.slug, name: chrome.name, logoUrl: chrome.logoUrl }}
        />
      ) : null}
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
