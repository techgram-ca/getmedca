"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Input } from "@getmed/ui";

type Item = { q: string; a: string };
type Section = { title: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: "Ordering",
    items: [
      { q: "Do I need an account?", a: "No. We verify your mobile number with a one-time code each time you place an order or request a consultation. There is no password to remember." },
      { q: "Can I transfer a prescription from my current pharmacy?", a: "Yes. Choose \"Transfer\" on the order form and tell us the name and phone or fax number of your current pharmacy. The new pharmacy handles the transfer with them directly." },
      { q: "What happens after I submit?", a: "The pharmacy is notified immediately and commits to responding within 30 minutes during business hours. You'll get a text when they accept, when the order is ready, and when the driver is on the way." },
      { q: "What if the pharmacy can't fill my order?", a: "If a pharmacy declines or doesn't respond in time, our support team will contact you personally to help you find another option." },
    ],
  },
  {
    title: "Prescription & documents",
    items: [
      { q: "What file types can I upload?", a: "Photos (JPEG, PNG, HEIC, WebP) and PDFs up to 20 MB. A clear, well-lit photo of the full prescription is ideal." },
      { q: "Is my insurance information required?", a: "It's optional in most cases. Providing it up front helps the pharmacy bill your plan directly, but you can also settle with them at delivery." },
      { q: "Who can see my prescription?", a: "Only the pharmacy you chose. GetMed's support team can see your name and phone number so they can help if something goes wrong, but never your prescription, insurance, or health card details." },
    ],
  },
  {
    title: "Delivery & payment",
    items: [
      { q: "How much does delivery cost?", a: "Delivery is arranged by GetMed and its cost is covered by the pharmacy. You pay the pharmacy for your medication only, exactly as you would in store." },
      { q: "How do I pay for my medication?", a: "Payment is settled with the pharmacy directly — for example by phone before dispatch or at the door, depending on the pharmacy's policy. GetMed does not process payments." },
      { q: "Do I need to be home?", a: "Yes. Medication requires a signature at the door. If the driver can't reach you, the delivery is marked as failed and our team will contact you to reschedule." },
      { q: "Where do you deliver?", a: "GetMed currently serves Ontario. Search results show only pharmacies within the platform's driving-distance radius of your address." },
    ],
  },
  {
    title: "Consultations",
    items: [
      { q: "How do consultations work?", a: "Pick a topic, choose a pharmacy that offers it, and submit a short request. A pharmacist calls you back — usually the same business day. There's no booking calendar and no fee to request." },
      { q: "Can a pharmacist prescribe?", a: "Ontario pharmacists can assess and prescribe for a number of minor ailments, such as uncomplicated urinary tract infections, pink eye, and seasonal allergies. The pharmacist will let you know what's possible during your call." },
    ],
  },
  {
    title: "General",
    items: [
      { q: "Is GetMed a pharmacy?", a: "No. GetMed is a platform that connects you with independent licensed pharmacies and handles delivery. All dispensing is done by the pharmacy you choose." },
      { q: "How is my data protected?", a: "Your information is encrypted, stored in Canadian data centres, and handled under PIPEDA and PHIPA. Documents are only accessible through short-lived, signed links." },
    ],
  },
];

const TOTAL = SECTIONS.reduce((n, s) => n + s.items.length, 0);

export function FaqList() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return SECTIONS;
    return SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => `${i.q} ${i.a}`.toLowerCase().includes(needle)) })).filter((s) => s.items.length);
  }, [q]);

  return (
    <div className="mt-8">
      {TOTAL >= 12 ? (
        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions" className="pl-9" aria-label="Search FAQ" />
        </div>
      ) : null}
      {filtered.length === 0 ? <p className="text-sm text-ink-500">No questions match your search.</p> : null}
      <div className="space-y-8">
        {filtered.map((s) => (
          <section key={s.title}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">{s.title}</h2>
            <Accordion type="multiple" className="surface px-5">
              {s.items.map((i) => (
                <AccordionItem key={i.q} value={i.q}>
                  <AccordionTrigger>{i.q}</AccordionTrigger>
                  <AccordionContent>{i.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>
    </div>
  );
}
