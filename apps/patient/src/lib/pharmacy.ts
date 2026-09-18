import { createServiceClient } from "@getmed/db/service";
import { mediaUrl } from "@getmed/core/storage";
import { isOpenNow } from "@getmed/core/hours";

export async function getPublicPharmacy(slugOrId: string) {
  const db = createServiceClient();
  const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
  const q = db.from("pharmacies_public").select("*");
  const { data: p } = await (isUuid ? q.eq("id", slugOrId) : q.eq("slug", slugOrId)).maybeSingle();
  if (!p) return null;

  const [{ data: pharmacists }, { data: services }, { data: issueRows }] = await Promise.all([
    db.from("pharmacists").select("*").eq("pharmacy_id", p.id).order("is_main", { ascending: false }).order("sort_order"),
    db.from("pharmacy_services").select("*").eq("pharmacy_id", p.id).order("sort_order"),
    db.from("pharmacy_issues").select("issue_id, issues(id, name, slug, active)").eq("pharmacy_id", p.id),
  ]);

  const [logoUrl, coverUrl, gallery] = await Promise.all([
    mediaUrl(db, p.logo_path),
    mediaUrl(db, p.cover_path),
    Promise.all((p.gallery_paths ?? []).map((g) => mediaUrl(db, g))),
  ]);
  const staff = await Promise.all(
    (pharmacists ?? []).map(async (ph) => ({ ...ph, photoUrl: await mediaUrl(db, ph.photo_path) })),
  );
  type IssueJoin = { issue_id: string; issues: { id: string; name: string; slug: string; active: boolean } | null };
  const issues = ((issueRows ?? []) as unknown as IssueJoin[])
    .map((r) => r.issues)
    .filter((i): i is NonNullable<IssueJoin["issues"]> => !!i && i.active);

  return {
    ...p,
    logoUrl,
    coverUrl,
    galleryUrls: gallery.filter((g): g is string => !!g),
    pharmacists: staff,
    services: services ?? [],
    issues,
    openNow: isOpenNow(p.hours),
  };
}

export type PublicPharmacy = NonNullable<Awaited<ReturnType<typeof getPublicPharmacy>>>;
