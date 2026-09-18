import type { Metadata } from "next";
import { createServiceClient } from "@getmed/db/service";
import { searchPharmacies } from "@getmed/core/geo";
import { SearchView } from "@/components/search-view";

export const metadata: Metadata = { title: "Pharmacies near you" };
export const dynamic = "force-dynamic";

type Search = { address?: string; lat?: string; lng?: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const address = sp.address?.trim() ?? "";
  const lat = sp.lat ? Number(sp.lat) : undefined;
  const lng = sp.lng ? Number(sp.lng) : undefined;

  let response: Awaited<ReturnType<typeof searchPharmacies>> = { origin: null, radiusKm: 0, results: [] };
  let error: string | null = null;
  if (address || (lat != null && lng != null)) {
    try {
      response = await searchPharmacies(createServiceClient(), {
        address,
        lat: Number.isFinite(lat) ? lat : undefined,
        lng: Number.isFinite(lng) ? lng : undefined,
      });
    } catch (e) {
      error = e instanceof Error ? e.message : "Search failed";
    }
  }

  return <SearchView address={address} response={response} error={error} />;
}
