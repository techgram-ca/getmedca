import { Home, ShieldCheck, Zap } from "lucide-react";
import { SectionLabel } from "@getmed/ui";

const BENEFITS = [
  { icon: Home, title: "Local Pharmacies", desc: "Support trusted neighbourhood pharmacies you already know. We connect you with verified local stores.", delay: "" },
  { icon: Zap, title: "Fast Delivery", desc: "Get your medicines delivered quickly — often within the same day. No more long pharmacy queues.", delay: "delay-1" },
  { icon: ShieldCheck, title: "Secure Prescriptions", desc: "Your prescription data is kept safe and handled only by licensed pharmacies. Privacy comes first.", delay: "delay-2" },
];

export function WhyChooseSection() {
  return (
    <section id="why-choose" className="px-6 py-20">
      <div className="mx-auto max-w-[1200px]">
        <SectionLabel className="mb-3 text-center">Our Advantages</SectionLabel>
        <h2 className="text-center text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-tight text-ink-950">Why Choose GetMed</h2>
        <p className="mx-auto mt-3 max-w-[520px] text-center text-[1.05rem] text-ink-500">
          We&#39;re building a better way to get your medicines — convenient, safe, and community-focused.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3">
          {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className={`animate-fade-in-up ${b.delay} group flex flex-col items-center text-center`}>
                <div className="relative mb-6">
                  <div className="absolute inset-[-6px] rotate-6 rounded-[20px] bg-brand-100 transition-transform duration-300 group-hover:rotate-12" />
                  <div className="relative flex size-16 items-center justify-center rounded-[18px] bg-brand-600">
                    <Icon className="size-7 text-white" />
                  </div>
                </div>
                <div className="mb-2.5 text-[1.15rem] font-bold text-ink-950">{b.title}</div>
                <p className="max-w-[280px] text-sm leading-[1.7] text-ink-500">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
