import { requirePharmacy } from "@getmed/core/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@getmed/ui";
import { ConsultationTopicsCard } from "@/components/consultation-topics-card";
import { PharmacistsEditor } from "@/components/pharmacists-editor";
import { loadProfile } from "@/lib/load-profile";

export default async function PharmacistsPage() {
  const { pharmacy, db } = await requirePharmacy();
  const data = await loadProfile(db, pharmacy.id);
  return (
    <div className="max-w-3xl space-y-6">
      {/* Topics first: they decide whether a pharmacist is required at all. */}
      <ConsultationTopicsCard
        issues={data.issues}
        selected={data.selectedIssueIds}
        prices={data.issuePrices}
        pharmacistCount={data.pharmacists.length}
      />
      <Card>
        <CardHeader>
          <CardTitle>Your pharmacists</CardTitle>
          <CardDescription>Patients see your main pharmacist prominently and the rest as a list.</CardDescription>
        </CardHeader>
        <CardContent>
          <PharmacistsEditor pharmacists={data.pharmacists} embedded />
        </CardContent>
      </Card>
    </div>
  );
}
