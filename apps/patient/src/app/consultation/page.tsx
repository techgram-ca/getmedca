import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Stethoscope } from "lucide-react";
import { createServiceClient } from "@getmed/db/service";

export const metadata: Metadata = { title: "Pharmacist consultations" };
export const dynamic = "force-dynamic";

export default async function ConsultationIndex() {
  const db = createServiceClient();
  const { data: issues } = await db.from("issues").select("id, name, slug, description").eq("active", true).order("sort_order");

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800"><Stethoscope className="size-3.5" /> Free to request</span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Talk to a pharmacist about…</h1>
        <p className="mt-3 text-lg text-ink-600">Choose a topic, pick a pharmacy near you, and a pharmacist will call you back. No appointment needed.</p>
      </div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(issues ?? []).map((i, idx) => (
          <li key={i.id} className="animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
            <Link href={`/consultation/${i.slug}`} className="surface group flex h-full flex-col p-5 transition-soft hover:-translate-y-0.5 hover:shadow-pop focus-ring">
              <h2 className="font-semibold text-ink-900 group-hover:text-brand-700">{i.name}</h2>
              {i.description ? <p className="mt-1.5 flex-1 text-sm text-ink-600">{i.description}</p> : null}
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">Find a pharmacist <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          </li>
        ))}
      </ul>
      {(issues ?? []).length === 0 ? <p className="mt-10 text-ink-500">Consultation topics are being set up. Check back soon.</p> : null}
    </div>
  );
}
