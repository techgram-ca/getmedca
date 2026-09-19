import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-semibold text-brand-600">
        <Mail className="size-3.5" /> Support
      </div>
      <h1 className="text-[clamp(2rem,5vw,3rem)] font-extrabold tracking-tight text-ink-950">Contact us</h1>
      <p className="mt-3 text-ink-500">
        Questions about an order, a pharmacy, or GetMed in general? Send us a note and we&#39;ll get back to you within one business day.
      </p>
      <p className="mt-2 text-sm text-ink-400">Please don&#39;t include prescription details or health information in this form.</p>
      <div className="surface mt-8 rounded-2xl p-6">
        <ContactForm />
      </div>
    </div>
  );
}
