import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@getmed/ui";

export const metadata: Metadata = { title: "We couldn't complete your order" };

export default async function FailurePage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const { orderId } = await searchParams;
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-danger-100 text-red-700"><AlertTriangle className="size-8" /></div>
      <h1 className="mt-5 text-2xl font-semibold">We couldn't verify your phone number</h1>
      <p className="mt-2 text-ink-600">Too many incorrect codes were entered, so this order wasn't sent to the pharmacy. Nothing has been shared. You can start again whenever you're ready.</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {orderId ? <Button asChild><Link href={`/order/verify?orderId=${orderId}`}>Try a new code</Link></Button> : null}
        <Button asChild variant="outline"><Link href="/">Back to home</Link></Button>
      </div>
      <p className="mt-6 text-sm text-ink-500">Need help? <Link href="/contact" className="text-brand-700 underline">Contact us</Link>.</p>
    </div>
  );
}
