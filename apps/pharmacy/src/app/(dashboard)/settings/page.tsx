import { requirePharmacy } from "@getmed/core/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from "@getmed/ui";
import { LoginEmailForm, NotificationEmailForm } from "@/components/email-forms";
import { NotificationPrefs, PasswordForm, PauseToggle } from "@/components/settings-forms";

export default async function SettingsPage() {
  const { pharmacy, session, db } = await requirePharmacy();
  const { data: p } = await db
    .from("pharmacies")
    .select("email, notify_sms, notify_email, notify_sound, status, inactive_reason")
    .eq("id", pharmacy.id)
    .single();
  const selfPaused = p?.status === "inactive" && p.inactive_reason === "Paused by pharmacy";

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" />

      {/* Both addresses on one card, labelled, so the difference between them
          is seen rather than discovered. */}
      <Card>
        <CardHeader>
          <CardTitle>Email addresses</CardTitle>
          <CardDescription>Your pharmacy has two, and they do different jobs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LoginEmailForm current={session.email ?? ""} />
          <div className="border-t border-ink-200 pt-5">
            <NotificationEmailForm current={p?.email ?? session.email ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle><CardDescription>How we alert you about new orders and consultation requests.</CardDescription></CardHeader>
        <CardContent><NotificationPrefs sms={p?.notify_sms ?? true} email={p?.notify_email ?? true} sound={p?.notify_sound ?? true} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Availability</CardTitle><CardDescription>Pause to temporarily hide your pharmacy from patient search (e.g. holidays).</CardDescription></CardHeader>
        <CardContent><PauseToggle paused={selfPaused} canPause={p?.status === "approved" || selfPaused} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Password</CardTitle><CardDescription>One login per pharmacy.</CardDescription></CardHeader>
        <CardContent><PasswordForm /></CardContent>
      </Card>
    </div>
  );
}
