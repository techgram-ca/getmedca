import { createServiceClient } from "@getmed/db/service";
import { searchPharmacies } from "@getmed/core/geo";
import { handler, json } from "@/lib/api";

/** GET /api/search?address=…&lat=…&lng=…&issue=… — the two-stage discovery lookup. */
export const GET = handler(async (req: Request) => {
  const url = new URL(req.url);
  const address = url.searchParams.get("address")?.trim() || undefined;
  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");
  const issueSlug = url.searchParams.get("issue");
  const res = await searchPharmacies(createServiceClient(), {
    address,
    lat: lat ? Number(lat) : undefined,
    lng: lng ? Number(lng) : undefined,
    issueSlug,
  });
  return json(res);
});
