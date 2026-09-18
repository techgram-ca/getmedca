"use client";

import { Clock, MapPin, Phone, Truck } from "lucide-react";
import { DAY_KEYS, DAY_LABELS, formatTime, isOpenNow, type WeeklyHours } from "@getmed/core/hours";
import { Avatar, Badge, cn } from "@getmed/ui";

export type PreviewData = {
  name: string;
  tagline: string;
  bio: string;
  addressLine: string;
  city: string;
  phone: string;
  logoUrl: string | null;
  coverUrl: string | null;
  hours: WeeklyHours;
  estimatedDeliveryTime: string;
  offersDelivery: boolean;
  offersTransfer: boolean;
  offersConsultation: boolean;
  pharmacists: { name: string; credentials: string; photoUrl: string | null; isMain: boolean }[];
  services: { name: string; price: number | null }[];
  acceptedInsurance: string[];
};

/** Live miniature of the public /p/[slug] page, rendered from the draft. */
export function PharmacyPreview({ d, className }: { d: PreviewData; className?: string }) {
  const open = isOpenNow(d.hours);
  const main = d.pharmacists.find((p) => p.isMain) ?? d.pharmacists[0];
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-ink-200 bg-white text-[13px] shadow-card", className)}>
      <div className="h-20 bg-gradient-to-r from-brand-700 to-brand-500">
        {d.coverUrl ? <img src={d.coverUrl} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="px-4 pb-4">
        <div className="-mt-6 flex items-end gap-3">
          <div className="rounded-xl border-2 border-white bg-white"><Avatar src={d.logoUrl} name={d.name || "Pharmacy"} size={48} className="rounded-lg" /></div>
          <div className="min-w-0 flex-1 pb-0.5">
            <p className="truncate font-semibold text-ink-900">{d.name || "Your pharmacy name"}</p>
            <p className="truncate text-ink-500">{d.tagline || "A short tagline patients will see"}</p>
          </div>
          <Badge tone={open.open ? "success" : "neutral"} className="text-[10px]">{open.label}</Badge>
        </div>
        {d.bio ? <p className="mt-3 line-clamp-3 text-ink-600">{d.bio}</p> : null}
        <div className="mt-3 flex flex-wrap gap-1">
          {d.offersDelivery ? <Badge tone="brand" className="text-[10px]"><Truck className="size-3" /> Delivery</Badge> : null}
          {d.offersTransfer ? <Badge tone="brand" className="text-[10px]">Transfers</Badge> : null}
          {d.offersConsultation ? <Badge tone="brand" className="text-[10px]">Consultations</Badge> : null}
        </div>
        <div className="mt-3 space-y-1 text-ink-600">
          <p className="flex items-center gap-1.5"><MapPin className="size-3.5 text-ink-400" /> {[d.addressLine, d.city].filter(Boolean).join(", ") || "Address"}</p>
          {d.phone ? <p className="flex items-center gap-1.5"><Phone className="size-3.5 text-ink-400" /> {d.phone}</p> : null}
          {d.estimatedDeliveryTime ? <p className="flex items-center gap-1.5"><Clock className="size-3.5 text-ink-400" /> Typical delivery: {d.estimatedDeliveryTime}</p> : null}
        </div>
        {main ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-ink-50 p-2">
            <Avatar src={main.photoUrl} name={main.name} size={32} />
            <div className="min-w-0"><p className="truncate font-medium">{main.name}</p><p className="truncate text-[11px] text-ink-500">{main.credentials}</p></div>
          </div>
        ) : null}
        {d.services.length ? (
          <ul className="mt-3 space-y-1">
            {d.services.slice(0, 3).map((s, i) => (
              <li key={i} className="flex justify-between rounded-md border border-ink-100 px-2 py-1"><span className="truncate">{s.name}</span>{s.price != null ? <span className="text-brand-700">${s.price}</span> : null}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-x-3 text-[11px] text-ink-500">
          {DAY_KEYS.map((k) => {
            const h = d.hours[k];
            return <p key={k} className="flex justify-between"><span>{DAY_LABELS[k].slice(0, 3)}</span><span>{!h || h.closed ? "Closed" : `${formatTime(h.open)}–${formatTime(h.close)}`}</span></p>;
          })}
        </div>
        {d.acceptedInsurance.length ? <p className="mt-2 text-[11px] text-ink-500">Insurance: {d.acceptedInsurance.join(", ")}</p> : null}
      </div>
    </div>
  );
}
