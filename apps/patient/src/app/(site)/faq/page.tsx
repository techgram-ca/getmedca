import type { Metadata } from "next";
import Link from "next/link";
import { ImageWithFallback } from "@getmed/ui";
import { FaqList } from "@/components/faq-list";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers about ordering prescriptions, consultations, delivery, and how GetMed works.",
};

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <section className="mx-auto max-w-[1200px] px-6 pb-16 pt-14">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-semibold text-brand-600">
              <span className="size-2 rounded-full bg-brand-600" />
              Help Centre
            </div>
            <h1 className="text-[clamp(2rem,5vw,3.2rem)] font-extrabold leading-[1.15] tracking-tight text-ink-950">
              Frequently Asked <span className="text-brand-600">Questions</span>
            </h1>
            <p className="mt-4 max-w-[480px] text-[1.05rem] leading-[1.7] text-ink-500">
              Everything you need to know about ordering prescriptions, requesting consultations, and how GetMed works — answered in one place.
            </p>
            <p className="mt-4 text-sm text-ink-500">
              Can&#39;t find your answer?{" "}
              <Link href="/contact" className="font-semibold text-brand-600 hover:underline">Contact our support team</Link>
            </p>
          </div>

          <div className="hero-plate hidden lg:block">
            <ImageWithFallback src="/images/faq.png" alt="" label="Upload /images/faq.png" wrapperClassName="relative aspect-[4/3] w-full rounded-2xl shadow-hero" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 pb-20">
        <FaqList />
      </section>
    </div>
  );
}
