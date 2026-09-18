import { requirePharmacy } from "@getmed/core/auth";
import { ProfileForm } from "@/components/profile-form";
import { loadProfile } from "@/lib/load-profile";

export default async function ProfilePage() {
  const { pharmacy, db } = await requirePharmacy();
  const data = await loadProfile(db, pharmacy.id);
  return <ProfileForm data={data} patientUrl={process.env.NEXT_PUBLIC_PATIENT_URL ?? "https://getmed.ca"} />;
}
