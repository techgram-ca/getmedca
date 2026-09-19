import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Logo } from "@getmed/ui";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; confirmed?: string; error?: string }>;
}) {
  const { next, confirmed, error } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-ink-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo /></div>

        {confirmed ? (
          <Alert tone="success" title="Email confirmed" className="mb-4">
            Sign in to continue setting up your pharmacy.
          </Alert>
        ) : null}
        {error ? (
          <Alert tone="danger" title="We couldn't confirm your email" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <div className="surface rounded-2xl p-6">
          <h1 className="text-xl font-extrabold tracking-tight text-ink-950">Pharmacy sign in</h1>
          <p className="mt-1 text-sm text-ink-500">Manage orders, consultations and your profile.</p>
          <LoginForm next={next} />
        </div>

        <p className="mt-4 text-center text-sm text-ink-500">
          New to GetMed? <Link href="/signup" className="font-semibold text-brand-600 hover:underline">Create your pharmacy account</Link>
        </p>
      </div>
    </div>
  );
}
