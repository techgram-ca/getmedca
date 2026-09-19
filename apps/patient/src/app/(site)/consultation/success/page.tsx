import type { Metadata } from "next";
import Link from "next/link";
import { PhoneCall } from "lucide-react";
import { Button } from "@getmed/ui";

export const metadata: Metadata = { title: "Request sent" };

export default function ConsultationSuccess() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6 animate-slide-up">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-100 text-green-700"><PhoneCall className="size-8" /></div>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">A pharmacist will call you shortly</h1>
      <p className="mt-3 text-ink-600">Your request has been sent to the pharmacy. Keep your phone nearby — calls usually come within the same business day, during your preferred window if you chose one.</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild variant="secondary"><Link href="/consultation">Browse other topics</Link></Button>
        <Button asChild variant="outline"><Link href="/">Return home</Link></Button>
      </div>
    </div>
  );
}
