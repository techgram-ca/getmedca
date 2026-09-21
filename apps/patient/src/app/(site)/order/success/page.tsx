import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, MessageSquare, Truck } from "lucide-react";
import { shortId } from "@getmed/core/format";
import { Avatar, Button, Card, CardContent } from "@getmed/ui";
import { getOrderSummary, toChrome } from "@/lib/order-summary";

export const metadata: Metadata = { title: "Order submitted" };
export const dynamic = "force-dynamic";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const { orderId } = await searchParams;
  if (!orderId) notFound();
  const order = await getOrderSummary(orderId);
  if (!order) notFound();
  if (!order.phone_verified_at) redirect(`/order/verify?orderId=${order.id}`);
  const p = order.pharmacy;
  const chrome = toChrome(p);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <div className="text-center animate-slide-up">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-100 text-green-700">
            <CheckCircle2 className="size-9" />
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink-950">Your order is with the pharmacy</h1>
          <p className="mt-2 text-ink-500">
            Reference <span className="font-mono font-bold text-ink-950">{shortId(order.id)}</span> ·{" "}
            {order.order_type === "transfer" ? "Prescription transfer" : "New prescription"}
          </p>
        </div>

        {p ? (
          <Card className="mt-8">
            <CardContent className="flex items-center gap-4">
              <Avatar src={p.logoUrl} name={p.name ?? "Pharmacy"} size={56} className="rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink-950">{p.name}</p>
                <p className="text-sm text-ink-500">{[p.address_line, p.city].filter(Boolean).join(", ")}</p>
                {p.phone ? <a href={`tel:${p.phone}`} className="text-sm font-medium text-brand-600 hover:underline">{p.phone}</a> : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="mt-4">
          <CardContent>
            <h2 className="font-bold text-ink-950">What happens next</h2>
            <ol className="mt-4 space-y-4 text-sm">
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-brand-600" />
                <span><strong>Within 30 minutes</strong> the pharmacy reviews your order. You&#39;ll get a text when it&#39;s accepted.</span>
              </li>
              <li className="flex gap-3">
                <MessageSquare className="mt-0.5 size-4 shrink-0 text-brand-600" />
                <span>The pharmacy may call you about your prescription or payment. Payment is settled with them directly.</span>
              </li>
              <li className="flex gap-3">
                <Truck className="mt-0.5 size-4 shrink-0 text-brand-600" />
                <span>
                  When it&#39;s ready, a driver brings it to you{p?.estimated_delivery_time ? ` — typically ${p.estimated_delivery_time}` : ""}. Someone must be home to sign.
                </span>
              </li>
            </ol>
            <p className="mt-4 text-xs text-ink-400">If the pharmacy can&#39;t fill your order, our support team will contact you personally to help.</p>
          </CardContent>
        </Card>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {p ? <Button asChild variant="secondary"><Link href={`/order/new?pharmacyId=${p.id}`}>Submit another prescription</Link></Button> : null}
        {chrome ? <Button asChild variant="outline"><Link href={`/p/${chrome.slug}`}>Back to {chrome.name}</Link></Button> : null}
      </div>
    </div>
  );
}
