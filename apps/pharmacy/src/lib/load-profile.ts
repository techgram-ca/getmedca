import type { ServiceClient } from "@getmed/db/service";
import { mediaUrl, signedUrl } from "@getmed/core/storage";
import { DEFAULT_HOURS, type WeeklyHours } from "@getmed/core/hours";

/** Everything the signup wizard / profile editor needs, with signed preview URLs. */
export async function loadProfile(db: ServiceClient, pharmacyId: string) {
  const [{ data: p }, { data: pharmacists }, { data: services }, { data: issues }, { data: issueRows }] = await Promise.all([
    db.from("pharmacies").select("*").eq("id", pharmacyId).single(),
    db.from("pharmacists").select("*").eq("pharmacy_id", pharmacyId).order("is_main", { ascending: false }).order("created_at"),
    db.from("pharmacy_services").select("*").eq("pharmacy_id", pharmacyId).order("created_at"),
    db.from("issues").select("id, name, slug").eq("active", true).order("sort_order"),
    db.from("pharmacy_issues").select("issue_id").eq("pharmacy_id", pharmacyId),
  ]);
  if (!p) throw new Error("Pharmacy not found");
  const [logoUrl, coverUrl, licenseUrl] = await Promise.all([mediaUrl(db, p.logo_path), mediaUrl(db, p.cover_path), signedUrl(db, "licensing", p.license_doc_path, 600)]);
  const staff = await Promise.all((pharmacists ?? []).map(async (s) => ({ ...s, photoUrl: await mediaUrl(db, s.photo_path) })));
  const hours = (p.hours && Object.keys(p.hours as object).length ? p.hours : DEFAULT_HOURS) as WeeklyHours;
  return {
    pharmacy: { ...p, hours, logoUrl, coverUrl, licenseUrl },
    pharmacists: staff,
    services: services ?? [],
    issues: issues ?? [],
    selectedIssueIds: (issueRows ?? []).map((r) => r.issue_id),
  };
}

export type ProfileData = Awaited<ReturnType<typeof loadProfile>>;
