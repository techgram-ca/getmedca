import type { Metadata } from "next";
import { Logo } from "@getmed/ui";
import { ForgotPasswordForm } from "@/components/password-reset-forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-ink-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="surface rounded-2xl p-6">
          <h1 className="text-lg font-semibold text-ink-900">Reset your password</h1>
          <p className="mb-5 mt-1 text-sm text-ink-500">
            We&apos;ll email you a link to choose a new one. Open it on this device — the link signs you in to set it.
          </p>
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
