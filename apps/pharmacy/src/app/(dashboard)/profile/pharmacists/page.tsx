import { requirePharmacy } from "@getmed/core/auth";
import { PharmacistsEditor } from "@/components/pharmacists-editor";
import { loadProfile } from "@/lib/load-profile";

export default async function PharmacistsPage() {
  const { pharmacy, db } = await requirePharmacy();
  const data = await loadProfile(db, pharmacy.id);
  return <PharmacistsEditor pharmacists={data.pharmacists} />;
}
