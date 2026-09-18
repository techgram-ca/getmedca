import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Contact us</h1>
      <p className="mt-3 text-ink-600">Questions about an order, a pharmacy, or GetMed in general? Send us a note and we'll get back to you within one business day.</p>
      <p className="mt-2 text-sm text-ink-500">Please don't include prescription details or health information in this form.</p>
      <div className="surface mt-8 p-6">
        <ContactForm />
      </div>
    </div>
  );
}
