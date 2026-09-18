import { requirePharmacy } from "@getmed/core/auth";
import { HoursForm } from "@/components/hours-form";
import { loadProfile } from "@/lib/load-profile";

export default async function HoursPage() {
  const { pharmacy, db } = await requirePharmacy();
  const data = await loadProfile(db, pharmacy.id);
  return <HoursForm hours={data.pharmacy.hours} />;
}
