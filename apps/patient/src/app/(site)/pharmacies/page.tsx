import type { Metadata } from "next";
import { createServiceClient } from "@getmed/db/service";
import { parseDirectoryQuery, sortDirectory } from "@getmed/core/geo";
import { mediaUrl } from "@getmed/core/storage";
import { isOpenNow } from "@getmed/core/hours";
import { PharmacyDirectory } from "@/components/pharmacy-directory";
import { requireLaunched } from "@/lib/launch";

export const metadata: Metadata = {
  title: "Find your pharmacy",
  description: "Search GetMed pharmacies by name, city or postal code and order directly from the one you already use.",
};
export const dynamic = "force-dynamic";

/** Enough to scan, few enough that nobody scrolls looking for a pager. */
const MAX_RESULTS = 60;

export default async function PharmaciesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireLaunched();
  const { q } = await searchParams;
  const query = parseDirectoryQuery(q ?? "");

  let results: Awaited<ReturnType<typeof load>> = [];
  if (query.patterns.length) results = await load(query);

  return <PharmacyDirectory q={q ?? ""} searched={query.text !== null} results={results} />;
}

async function load(query: ReturnType<typeof parseDirectoryQuery>) {
  const db = createServiceClient();
  // The public view is already only approved pharmacies; `listed` takes out
  // the demo page, which is there to show prospects and not to be ordered from.
  const filter = query.postal
    ? query.patterns.map((p) => `postal_code.ilike.${p}`).join(",")
    : query.patterns.flatMap((p) => [`name.ilike.${p}`, `city.ilike.${p}`]).join(",");

  const { data } = await db
    .from("pharmacies_public")
    .select("id, slug, name, city, province, postal_code, address_line, phone, tagline, logo_path, hours, offers_delivery, offers_consultation")
    .eq("listed", true)
    .or(filter)
    .limit(MAX_RESULTS);

  const rows = await Promise.all(
    (data ?? []).map(async (p) => ({
      id: p.id,
      slug: p.slug ?? p.id,
      name: p.name,
      city: p.city,
      postal_code: p.postal_code,
      address: [p.address_line, p.city, p.province].filter(Boolean).join(", "),
      phone: p.phone,
      tagline: p.tagline,
      logoUrl: await mediaUrl(db, p.logo_path),
      offersDelivery: p.offers_delivery,
      offersConsultation: p.offers_consultation,
      openNow: isOpenNow(p.hours),
    })),
  );
  return sortDirectory(rows, query);
}
