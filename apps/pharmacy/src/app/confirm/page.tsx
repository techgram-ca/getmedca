import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@getmed/ui";
import { ConfirmByCodeForm } from "@/components/confirm-by-code-form";

export const metadata: Metadata = { title: "Confirm your email" };

/**
 * Entering the confirmation code on its own page.
 *
 * The code also appears inline right after signing up, but that state lives in
 * the form and does not survive a refresh or a closed tab — which is exactly
 * what someone does while they go and look at their email. This is where the
 * email's own "enter it here" link points.
 */
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-ink-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Link href="/" className="no-underline"><Logo /></Link></div>
        <div className="surface p-6">
          <h1 className="text-xl font-semibold">Confirm your email</h1>
          <p className="mt-1 text-sm text-ink-500">
            Enter the code from the email we sent. It works even if the link in that email does not.
          </p>
          <ConfirmByCodeForm defaultEmail={email ?? ""} />
        </div>
        <p className="mt-4 text-center text-sm text-ink-600">
          Code expired?{" "}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">Sign in to get a new one</Link>
        </p>
      </div>
    </div>
  );
}
