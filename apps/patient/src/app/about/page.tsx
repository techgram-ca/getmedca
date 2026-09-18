import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">About GetMed</h1>
      <div className="prose mt-6 max-w-none space-y-4 text-ink-700 leading-relaxed">
        <p>
          GetMed connects patients with independent, community pharmacies for prescription delivery and pharmacist consultations. We started in Ontario with a simple belief: the pharmacist down the street gives better care than a call centre, and they deserve the same convenience the big chains can afford to build.
        </p>
        <p>
          We are not a pharmacy. We don't dispense, we don't touch your medication, and we never sell your data. Each order goes to the licensed pharmacy you choose, who fills it exactly as they would in store. Our drivers handle the last mile, with proof of delivery on every drop-off.
        </p>
        <h2 className="text-xl font-semibold text-ink-900">Privacy and compliance</h2>
        <p>
          GetMed is designed for PIPEDA and PHIPA. Your health documents are stored encrypted in Canadian data centres, accessible only through short-lived links, and visible only to the pharmacy filling your order. Our support team can see your name and phone number so they can help when something goes wrong, but never your prescription or insurance details.
        </p>
        <h2 className="text-xl font-semibold text-ink-900">For pharmacies</h2>
        <p>
          Independent pharmacies keep their own branding, decide which orders to accept, and pay a flat fee only when an order is delivered. There are no subscriptions and no commissions on your dispensing.
        </p>
      </div>
    </div>
  );
}
