import { requireAdmin } from "@getmed/core/auth";
import { getPlatformSettings } from "@getmed/core/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from "@getmed/ui";
import { PasswordForm, PlatformSettingsForm } from "@/components/settings-forms";

export default async function SettingsPage() {
  const { db, session } = await requireAdmin();
  const s = await getPlatformSettings(db);
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" />
      <Card>
        <CardHeader><CardTitle>Platform settings</CardTitle><CardDescription>Applied at query time — no reprocessing needed. The delivery fee is snapshotted onto each order when it's delivered, so past invoices never change.</CardDescription></CardHeader>
        <CardContent><PlatformSettingsForm searchRadiusKm={Number(s.search_radius_km)} flatDeliveryFee={Number(s.flat_delivery_fee)} slaMinutes={s.sla_minutes} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Admin account</CardTitle><CardDescription>Signed in as {session.email}. Single admin user.</CardDescription></CardHeader>
        <CardContent><PasswordForm /></CardContent>
      </Card>
    </div>
  );
}
