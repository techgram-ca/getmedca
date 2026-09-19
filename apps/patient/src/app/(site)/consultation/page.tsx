import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Stethoscope } from "lucide-react";
import { createServiceClient } from "@getmed/db/service";
import { ImageWithFallback } from "@getmed/ui";
import { ConsultAddressSearch } from "@/components/consult-address-search";

export const metadata: Metadata = {
  title: "Consult a Pharmacist",
  description: "Get expert advice from a licensed Ontario pharmacist for UTIs, skin conditions, allergies, and more — no clinic visit needed.",
};
export const dynamic = "force-dynamic";

/** Accent palette cycled across the topic cards, matching the GetMed look. */
const ACCENTS = [
  { bg: "#e0f5f2", fg: "#2a9d8f" },
  { bg: "#fef3c7", fg: "#d97706" },
  { bg: "#ede9fe", fg: "#7c3aed" },
  { bg: "#fee2e2", fg: "#dc2626" },
  { bg: "#fce7f3", fg: "#be185d" },
  { bg: "#fff7ed", fg: "#ea580c" },
];

export default async function ConsultationIndex() {
  const db = createServiceClient();
  const { data: issues } = await db.from("issues").select("id, name, slug, description").eq("active", true).order("sort_order");
  const list = issues ?? [];

  return (
    <>
      <section className="bg-gradient-to-br from-brand-100 via-brand-50 to-white">
        <div className="mx-auto max-w-[1200px] px-6 pb-20 pt-14">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-600/10 px-4 py-1.5 text-xs font-bold text-brand-600">
                <Stethoscope className="size-3.5" />
                Licensed Ontario Pharmacists
              </div>

              <h1 className="mb-4 text-[clamp(2.2rem,4.5vw,3.4rem)] font-extrabold leading-[1.15] tracking-tight text-ink-950">
                Consult a pharmacist — <span className="text-brand-600">from anywhere</span>
              </h1>

              <p className="mb-6 max-w-[480px] text-[1.05rem] leading-[1.7] text-ink-500">
                Get expert advice and treatment for common conditions without leaving home.
              </p>

              <div className="mb-8 flex flex-wrap gap-5 text-sm text-ink-500">
                {["No appointment needed", "Same-day call back", "No booking fee"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-brand-600" />
                    {t}
                  </span>
                ))}
              </div>

              <ConsultAddressSearch />
            </div>

            <div className="hero-plate hidden lg:block">
              <ImageWithFallback
                src="/images/consultation.jpg"
                alt="Consult a pharmacist"
                label="Upload /images/consultation.jpg"
                wrapperClassName="relative aspect-[4/3] w-full rounded-2xl shadow-hero"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink-950">Conditions pharmacists can treat</h2>
            <p className="mx-auto mt-3 max-w-lg text-base text-ink-500">
              Get a quick assessment and treatment for common minor conditions — no clinic visit needed.
            </p>
          </div>

          {list.length === 0 ? (
            <p className="text-center text-ink-500">Consultation topics are being set up. Check back soon.</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((issue, i) => {
                const accent = ACCENTS[i % ACCENTS.length]!;
                return (
                  <Link
                    key={issue.id}
                    href={`/consultation/${issue.slug}`}
                    className="group flex flex-col rounded-2xl border border-ink-200 bg-ink-50 p-6 no-underline transition-all hover:-translate-y-0.5 hover:shadow-pop"
                  >
                    <div className="mb-4 flex size-12 items-center justify-center rounded-xl" style={{ backgroundColor: accent.bg }}>
                      <Stethoscope className="size-6" style={{ color: accent.fg }} />
                    </div>
                    <h3 className="mb-2 text-base font-bold text-ink-950 group-hover:text-brand-700">{issue.name}</h3>
                    {issue.description ? <p className="flex-1 text-sm leading-relaxed text-ink-500">{issue.description}</p> : null}
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                      Find a pharmacist <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-10 space-y-2 text-center">
            <p className="text-sm text-ink-500">
              <span className="font-medium text-ink-950">+ Many more minor conditions</span>
            </p>
            <p className="text-sm text-ink-500">If your condition is not suitable, the pharmacist will refer you to a doctor.</p>
          </div>
        </div>
      </section>
    </>
  );
}
