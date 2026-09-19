"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Stethoscope } from "lucide-react";
import { Button, Select, cn } from "@getmed/ui";

export type PickableIssue = { id: string; name: string; slug: string };

/**
 * First step of the consultation flow: pick what you need help with. The
 * address is only asked on the next page, once a topic is chosen.
 */
export function IssuePicker({
  issues,
  id = "consult-issue",
  className,
  label = "What do you need help with?",
}: {
  issues: PickableIssue[];
  id?: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);

  if (issues.length === 0) {
    return <p className={cn("text-sm text-ink-500", className)}>Consultation topics are being set up. Check back soon.</p>;
  }

  return (
    <form
      className={cn("w-full", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (!slug) {
          document.getElementById(id)?.focus();
          return;
        }
        setBusy(true);
        router.push(`/consultation/${slug}`);
      }}
    >
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-ink-800">{label}</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-[220px] flex-1">
          <Stethoscope className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-ink-500" aria-hidden />
          <Select id={id} value={slug} onChange={(e) => setSlug(e.target.value)} className="h-14 rounded-2xl pl-11 text-base">
            <option value="">Choose a topic…</option>
            {issues.map((i) => (
              <option key={i.id} value={i.slug}>{i.name}</option>
            ))}
          </Select>
        </div>
        <Button type="submit" size="lg" loading={busy} loadingText="Loading…" className="shrink-0">
          Continue <ArrowRight />
        </Button>
      </div>
      <p className="mt-2 text-xs text-ink-500">We&#39;ll ask for your address next, to find pharmacists near you.</p>
    </form>
  );
}
