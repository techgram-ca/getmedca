"use client";

import { useState } from "react";
import { BadgeCheck, ChevronDown } from "lucide-react";
import { Avatar, Badge, Button, ScrollReveal, cn } from "@getmed/ui";

export type TeamMember = {
  id: string;
  name: string;
  credentials: string | null;
  years_experience: number | null;
  bio: string | null;
  languages: string[];
  is_main: boolean;
  photoUrl: string | null;
};

/** How many more appear each time "Show more" is pressed. */
const PAGE = 4;

/**
 * The pharmacists on a pharmacy's public page.
 *
 * One pharmacist gets a single wide card — a lone card in a two-column grid
 * reads as a layout that lost its other half. Two or more get identical cards
 * side by side, two to a row on a laptop, because a pharmacy with three
 * pharmacists was previously showing one in full and the rest as a row of
 * thumbnails, which said more about the order they were added in than about
 * the people. The one in charge is marked rather than enlarged.
 *
 * Past four the rest are behind a button. Every card carries a bio, so a
 * twelve-pharmacist chain would otherwise push the whole page down.
 */
export function PharmacistGrid({ members }: { members: TeamMember[] }) {
  const [shown, setShown] = useState(PAGE);
  if (members.length === 0) return null;

  const main = members.find((m) => m.is_main) ?? members[0]!;
  if (members.length === 1) {
    return (
      <ScrollReveal delay={100}>
        <div className="mx-auto mt-12 max-w-3xl">
          <PharmacistCard member={main} wide />
        </div>
      </ScrollReveal>
    );
  }

  // The one in charge first, then the rest in the order the pharmacy set.
  const ordered = [main, ...members.filter((m) => m.id !== main.id)];
  const visible = ordered.slice(0, shown);
  const remaining = ordered.length - visible.length;

  return (
    <div className="mx-auto mt-12 max-w-4xl">
      <div className="grid gap-5 md:grid-cols-2">
        {visible.map((m, i) => (
          // Only the first batch animates in on scroll; later batches are
          // already in view when the button is pressed, and fading them up
          // from below looks like a glitch rather than an entrance.
          <ScrollReveal key={m.id} delay={i < PAGE ? 100 + i * 70 : 0}>
            <PharmacistCard member={m} />
          </ScrollReveal>
        ))}
      </div>

      {remaining > 0 ? (
        <div className="mt-7 flex justify-center">
          <Button variant="outline" onClick={() => setShown((n) => n + PAGE)}>
            Show {Math.min(remaining, PAGE)} more
            {remaining > PAGE ? <span className="text-ink-500">of {remaining}</span> : null}
            <ChevronDown />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function PharmacistCard({ member, wide = false }: { member: TeamMember; wide?: boolean }) {
  const meta = [member.credentials, member.years_experience != null ? `${member.years_experience} years of experience` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={cn("h-full rounded-2xl border border-ink-200 bg-white", wide ? "p-8" : "p-6")}>
      <div className={cn("flex gap-5", wide ? "flex-col sm:flex-row sm:gap-6" : "items-start")}>
        <Avatar
          src={member.photoUrl}
          name={member.name}
          size={wide ? 112 : 64}
          className={cn("shrink-0", wide ? "rounded-2xl" : "rounded-xl")}
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn("font-extrabold text-ink-950", wide ? "text-xl" : "text-base")}>{member.name}</p>
            {member.is_main ? (
              <Badge tone="brand"><BadgeCheck className="size-3" /> Pharmacist in charge</Badge>
            ) : null}
          </div>
          {meta ? <p className="mt-1 text-sm text-ink-500">{meta}</p> : null}
          {member.bio ? (
            <p className={cn("mt-3 leading-relaxed text-ink-600", wide ? null : "text-sm")}>{member.bio}</p>
          ) : null}
          {member.languages.length ? (
            <p className="mt-3 text-sm text-ink-500">Speaks {member.languages.join(", ")}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
