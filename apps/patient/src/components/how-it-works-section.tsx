import { ImageWithFallback, SectionLabel } from "@getmed/ui";

const STEPS = [
  {
    num: "STEP 01",
    title: "Upload Prescription",
    desc: "Securely upload your doctor's prescription. We accept photos and digital prescriptions.",
    img: "/images/order.png",
    delay: "",
  },
  {
    num: "STEP 02",
    title: "Pharmacy Verifies",
    desc: "Your selected pharmacy reviews and confirms the order, ensuring accuracy and safety for every medicine.",
    img: "/images/verification.png",
    delay: "delay-1",
  },
  {
    num: "STEP 03",
    title: "Medicine Delivered",
    desc: "Your medicines are carefully prepared and delivered right to your doorstep — quickly and reliably.",
    img: "/images/delivery.png",
    delay: "delay-2",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-brand-50 px-6 py-20">
      <div className="mx-auto max-w-[1200px]">
        <SectionLabel className="mb-3 text-center">Simple Process</SectionLabel>
        <h2 className="text-center text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-tight text-ink-950">How It Works</h2>
        <p className="mx-auto mt-3 max-w-[520px] text-center text-[1.05rem] text-ink-500">
          Getting your medicines delivered is as easy as three simple steps.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className={`animate-fade-in-up ${step.delay} group flex flex-col rounded-3xl border border-ink-200 bg-white p-6 pb-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(42,157,143,0.1)]`}
            >
              <ImageWithFallback
                src={step.img}
                alt={step.title}
                label={`Upload ${step.img}`}
                wrapperClassName="mb-6 aspect-square w-full rounded-2xl bg-brand-50"
                className="transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="mb-3 flex items-center gap-3">
                <span className="text-[0.7rem] font-extrabold tracking-[0.1em] text-brand-600">{step.num}</span>
                <div className="h-px flex-1 bg-ink-200" />
              </div>
              <div className="mb-2 text-[1.15rem] font-bold text-ink-950">{step.title}</div>
              <p className="text-sm leading-[1.7] text-ink-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
