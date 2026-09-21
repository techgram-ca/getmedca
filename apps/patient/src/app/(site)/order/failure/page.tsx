import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@getmed/ui";
import { getOrderSummary, toChrome } from "@/lib/order-summary";

export const metadata: Metadata = { title: "We couldn't complete your order" };
export const dynamic = "force-dynamic";

export default async function FailurePage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const { orderId } = await searchParams;
  const order = orderId ? await getOrderSummary(orderId) : null;
  const chrome = toChrome(order?.pharmacy ?? null);

  return (
    <div className="mx-auto w-full max-w-lg px-6 py-20 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-danger-100 text-red-700">
          <AlertTriangle className="size-8" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-ink-950">We couldn&#39;t verify your phone number</h1>
        <p className="mt-2 text-ink-500">
          Too many incorrect codes were entered, so this order wasn&#39;t sent to the pharmacy. Nothing has been shared. You can start again whenever you&#39;re ready.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {orderId ? <Button asChild><Link href={`/order/verify?orderId=${orderId}`}>Try a new code</Link></Button> : null}
          {chrome ? <Button asChild variant="outline"><Link href={`/p/${chrome.slug}`}>Back to {chrome.name}</Link></Button> : null}
        </div>
      <p className="mt-6 text-sm text-ink-500">
        Need help? <Link href="/contact" className="font-semibold text-brand-600 underline">Contact us</Link>.
      </p>
    </div>
  );
}
