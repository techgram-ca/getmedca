import { requirePharmacy } from "@getmed/core/auth";
import { ServicesEditor } from "@/components/services-editor";

export default async function ServicesPage() {
  const { pharmacy, db } = await requirePharmacy();
  const { data } = await db.from("pharmacy_services").select("*").eq("pharmacy_id", pharmacy.id).order("created_at");
  return <ServicesEditor services={data ?? []} />;
}
