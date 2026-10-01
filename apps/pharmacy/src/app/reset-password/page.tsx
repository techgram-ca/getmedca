import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Button, Logo } from "@getmed/ui";
import { getSession } from "@getmed/core/auth";
import { NewPasswordForm } from "@/components/password-reset-forms";

export const metadata: Metadata = { title: "Choose a new password" };
export const dynamic = "force-dynamic";

/**
 * Where the reset link lands, once the callback has exchanged its token for a
 * recovery session. Without that session there is nothing to update, so this
 * says so rather than presenting a form that cannot work.
 */
export default async function ResetPasswordPage() {
  const session = await getSession();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-ink-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="surface rounded-2xl p-6">
          <h1 className="text-lg font-semibold text-ink-900">Choose a new password</h1>
          {session ? (
            <>
              <p className="mb-5 mt-1 text-sm text-ink-500">Signing in again afterwards will use this password.</p>
              <NewPasswordForm />
            </>
          ) : (
            <div className="mt-4 space-y-4">
              <Alert tone="warning" title="This link is no longer valid">
                Reset links work once and expire quickly, and they have to be opened on the device that asked for them.
                Request a new one and it will work.
              </Alert>
              <Button asChild className="w-full"><Link href="/forgot-password">Send a new link</Link></Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
