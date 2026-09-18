import { requireDriver } from "@getmed/core/auth";
import { Card, CardContent } from "@getmed/ui";
import { PasswordForm } from "@/components/password-form";
import { logout } from "@/lib/actions/auth";

export default async function SettingsPage() {
  const { driver, session } = await requireDriver();
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Settings</h1>
      <Card><CardContent className="text-sm">
        <p className="font-medium">{driver.name}</p>
        <p className="text-ink-500">{session.email} · {driver.phone}</p>
        <p className="mt-2 text-xs text-ink-400">To change your contact or vehicle details, ask GetMed support.</p>
      </CardContent></Card>
      <Card><CardContent>
        <p className="mb-3 text-sm font-medium">Change password</p>
        <PasswordForm />
      </CardContent></Card>
      <form action={logout}><button className="w-full rounded-xl border border-ink-200 bg-white py-3 text-sm font-medium text-ink-700">Sign out</button></form>
    </div>
  );
}
