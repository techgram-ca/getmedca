import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { maskPhone } from "@getmed/core/format";
import { OtpForm } from "@/components/otp-form";
import { PharmacyTopBar } from "@/components/pharmacy/pharmacy-chrome";
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
    <div className="flex min-h-screen flex-col bg-ink-50">
      {chrome ? <PharmacyTopBar pharmacy={chrome} step="Step 2 of 2 · Verify your phone" /> : null}
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-16">
        <OtpForm
          kind="order"
          targetId={order.id}
          maskedPhone={maskPhone(order.patient_phone)}
          successHref={`/order/success?orderId=${order.id}`}
          failureHref={`/order/failure?orderId=${order.id}`}
        />
      </main>
    </div>
  );
}
