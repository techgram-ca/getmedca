import type { Metadata } from "next";
import { FaqList } from "@/components/faq-list";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Frequently asked questions</h1>
      <p className="mt-3 text-ink-600">Can't find what you need? <a href="/contact" className="font-medium text-brand-700 underline-offset-2 hover:underline">Contact us.</a></p>
      <FaqList />
    </div>
  );
}
