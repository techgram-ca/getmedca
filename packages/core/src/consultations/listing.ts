import type { ServiceClient } from "@getmed/db/service";
import { mediaUrl } from "../storage";
import { searchPharmacies, type SearchResponse, type SearchResult } from "../geo/search";

/**
 * The consultation results page lists the pharmacists who can take the call,
 * not the pharmacies they work at. Each entry carries the languages that
 * pharmacist speaks and what their pharmacy charges for the topic.
 */
export type PharmacistListing = {
  /** Null for a pharmacy with nobody on file — the pharmacy still shows. */
  pharmacistId: string | null;
  name: string;
  credentials: string | null;
  yearsExperience: number | null;
  bio: string | null;
  photoUrl: string | null;
  languages: string[];
  isMain: boolean;
  /** Null means the pharmacy charges no fee for this topic. */
  price: number | null;
  pharmacy: SearchResult;
};

export type LanguageFacet = { value: string; label: string; count: number };

export type ConsultationListing = {
  origin: { lat: number; lng: number; placeName: string } | null;
  radiusKm: number;
  /** Every language spoken nearby, with how many pharmacists speak it. */
  languages: LanguageFacet[];
  /** Pharmacists matching the language filter, nearest first. */
  results: PharmacistListing[];
  /** How many were hidden by the language filter. */
  filteredOut: number;
};

/**
 * Pharmacies type languages in free text, so "English", "english " and
 * "ENGLISH" all arrive. Matching and grouping use this form; the label shown
 * is whichever spelling was seen first.
 */
export function languageKey(language: string): string {
  return language.trim().toLowerCase();
}

function label(language: string): string {
  const trimmed = language.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export type ListingInput = {
  address?: string;
  lat?: number;
  lng?: number;
  issueSlug: string;
  language?: string | null;
};

/** Injectable so the listing can be tested without Mapbox or PostGIS. */
export type PharmacySearch = (db: ServiceClient, input: ListingInput) => Promise<SearchResponse>;

/**
 * Pharmacists near an address who can take this consultation, with the
 * languages they speak and the topic's price.
 *
 * `language` filters the results but not the facet counts — the filter has to
 * keep showing the options it is filtering between.
 */
export async function listConsultationPharmacists(
  db: ServiceClient,
  input: ListingInput,
  search_ = searchPharmacies as PharmacySearch,
): Promise<ConsultationListing> {
  const search = await search_(db, input);
  const empty: ConsultationListing = {
    origin: search.origin,
    radiusKm: search.radiusKm,
    languages: [],
    results: [],
    filteredOut: 0,
  };
  if (search.results.length === 0) return empty;

  const pharmacyIds = search.results.map((r) => r.id);
  const [{ data: issue }, { data: staff }] = await Promise.all([
    db.from("issues").select("id").eq("slug", input.issueSlug).maybeSingle(),
    db
      .from("pharmacists")
      .select("id, pharmacy_id, name, credentials, years_experience, bio, languages, is_main, photo_path, sort_order")
      .in("pharmacy_id", pharmacyIds)
      .order("is_main", { ascending: false })
      .order("sort_order"),
  ]);

  const priceByPharmacy = new Map<string, number | null>();
  if (issue?.id) {
    const { data: prices } = await db
      .from("pharmacy_issues")
      .select("pharmacy_id, price")
      .eq("issue_id", issue.id)
      .in("pharmacy_id", pharmacyIds);
    for (const row of prices ?? []) priceByPharmacy.set(row.pharmacy_id, row.price == null ? null : Number(row.price));
  }

  const byPharmacy = new Map<string, typeof staff>();
  for (const s of staff ?? []) {
    const list = byPharmacy.get(s.pharmacy_id) ?? [];
    list.push(s);
    byPharmacy.set(s.pharmacy_id, list as typeof staff);
  }

  // Search results are already sorted by driving distance, so building in that
  // order keeps the nearest pharmacist first without a second sort.
  const all: PharmacistListing[] = [];
  for (const pharmacy of search.results) {
    const price = priceByPharmacy.get(pharmacy.id) ?? null;
    const roster = byPharmacy.get(pharmacy.id) ?? [];
    if (roster.length === 0) {
      // No pharmacist on file. The pharmacy can still take the call, so it
      // stays in the list rather than disappearing behind a data gap.
      all.push({
        pharmacistId: null,
        name: pharmacy.name,
        credentials: null,
        yearsExperience: null,
        bio: null,
        photoUrl: pharmacy.logoUrl,
        languages: [],
        isMain: false,
        price,
        pharmacy,
      });
      continue;
    }
    for (const s of roster) {
      all.push({
        pharmacistId: s.id,
        name: s.name,
        credentials: s.credentials,
        yearsExperience: s.years_experience,
        bio: s.bio,
        photoUrl: await mediaUrl(db, s.photo_path),
        languages: (s.languages ?? []).map((l) => l.trim()).filter(Boolean),
        isMain: s.is_main,
        price,
        pharmacy,
      });
    }
  }

  const facets = new Map<string, LanguageFacet>();
  for (const entry of all) {
    for (const spoken of new Set(entry.languages.map(languageKey))) {
      const original = entry.languages.find((l) => languageKey(l) === spoken)!;
      const existing = facets.get(spoken);
      if (existing) existing.count++;
      else facets.set(spoken, { value: spoken, label: label(original), count: 1 });
    }
  }
  const languages = [...facets.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const wanted = input.language ? languageKey(input.language) : null;
  const results = wanted ? all.filter((e) => e.languages.some((l) => languageKey(l) === wanted)) : all;

  return {
    origin: search.origin,
    radiusKm: search.radiusKm,
    languages,
    results,
    filteredOut: all.length - results.length,
  };
}
