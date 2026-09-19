"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { Input } from "@getmed/ui";

type Item = { q: string; a: string };
type Section = { category: string; items: Item[] };

const FAQS: Section[] = [
  {
    category: "Ordering Prescriptions",
    items: [
      { q: "How do I order a prescription through GetMed?", a: "Enter your address on the homepage to find nearby pharmacies. Pick one, fill in your details and delivery address, upload your prescription, then verify your phone number with a one-time code. The pharmacy is notified instantly." },
      { q: "Can I transfer my prescription from another pharmacy?", a: "Yes. Choose \"Transfer prescription\" on the order form and tell us your current pharmacy's name and phone or fax number. The new pharmacy handles the transfer on your behalf." },
      { q: "Do I need an account?", a: "No. We verify your mobile number with a one-time code each time you place an order or request a consultation. There is no password to remember." },
      { q: "What happens after I submit?", a: "The pharmacy is notified immediately and commits to responding within 30 minutes during business hours. You'll get a text when they accept, when the order is ready, and when the driver is on the way." },
      { q: "What if the pharmacy can't fill my order?", a: "If a pharmacy declines or doesn't respond in time, our support team contacts you personally to help you find another option. The pharmacy never contacts you about a declined order." },
    ],
  },
  {
    category: "Prescription & Documents",
    items: [
      { q: "What file types can I upload?", a: "Photos (JPEG, PNG, HEIC, WebP) and PDFs up to 20 MB. A clear, well-lit photo of the full prescription works best." },
      { q: "Is my insurance information required?", a: "It's optional in most cases. Providing it up front helps the pharmacy bill your plan directly, but you can also settle with them at delivery." },
      { q: "Who can see my prescription?", a: "Only the pharmacy you chose. GetMed's support team can see your name and phone number so they can help if something goes wrong, but never your prescription, insurance, or health card details." },
    ],
  },
  {
    category: "Delivery & Payment",
    items: [
      { q: "How much does delivery cost?", a: "Delivery is arranged by GetMed and its cost is covered by the pharmacy. You pay the pharmacy for your medication only, exactly as you would in store." },
      { q: "How do I pay for my medication?", a: "Directly with the pharmacy — by phone before dispatch or at the door, depending on their policy. GetMed never processes patient payments." },
      { q: "Do I need to be home?", a: "Yes. Medication requires a signature at the door. If the driver can't reach you, the delivery is marked failed and our team contacts you to reschedule." },
      { q: "Where do you deliver?", a: "GetMed currently serves Ontario. Search results show only pharmacies within the platform's driving-distance radius of your address." },
    ],
  },
  {
    category: "Consultations",
    items: [
      { q: "How do consultations work?", a: "Pick a topic, choose a pharmacy that offers it, and submit a short request. A pharmacist calls you back — usually the same business day. There's no booking calendar and no fee to request." },
      { q: "Can a pharmacist prescribe?", a: "Ontario pharmacists can assess and prescribe for a number of minor ailments, such as uncomplicated urinary tract infections, pink eye, and seasonal allergies. The pharmacist will tell you what's possible during your call." },
      { q: "Are the pharmacists licensed?", a: "Yes. Every pharmacy on GetMed is verified against its Ontario College of Pharmacists registration before it can receive orders." },
    ],
  },
  {
    category: "Account & Privacy",
    items: [
      { q: "How is my health information protected?", a: "Your information is encrypted, stored in Canadian data centres, and handled under PIPEDA and PHIPA. Documents are only accessible through short-lived, signed links." },
      { q: "Why do you ask for consent?", a: "Sharing prescription details with a pharmacy requires your explicit consent under PHIPA. We record the moment you give it with your order." },
    ],
  },
];

const TOTAL = FAQS.reduce((n, s) => n + s.items.length, 0);

function FaqItem({ q, a }: Item) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-6 bg-white px-7 py-6 text-left transition-colors hover:bg-ink-50"
      >
        <span className="text-base font-semibold leading-snug text-ink-950">{q}</span>
        {open ? <ChevronUp className="size-5 shrink-0 text-brand-600" /> : <ChevronDown className="size-5 shrink-0 text-ink-500" />}
      </button>
      {open ? (
        <div className="border-t border-ink-200 bg-white px-7 pb-7 pt-2 animate-fade-in">
          <p className="text-[0.95rem] leading-relaxed text-ink-500">{a}</p>
        </div>
      ) : null}
    </div>
  );
}

export function FaqList() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return FAQS;
    return FAQS.map((s) => ({ ...s, items: s.items.filter((i) => `${i.q} ${i.a}`.toLowerCase().includes(needle)) })).filter((s) => s.items.length);
  }, [query]);

  return (
    <div>
      {TOTAL >= 12 ? (
        <div className="relative mb-8 max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions" className="pl-11" aria-label="Search FAQ" />
        </div>
      ) : null}

      {filtered.length === 0 ? <p className="text-sm text-ink-500">No questions match your search.</p> : null}

      <div className="space-y-12">
        {filtered.map(({ category, items }) => (
          <section key={category}>
            <h2 className="mb-5 text-xs font-bold uppercase tracking-widest text-brand-600">{category}</h2>
            <div className="space-y-4">
              {items.map((item) => <FaqItem key={item.q} {...item} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
