import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@getmed/ui";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-ink-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="surface p-6">
          <h1 className="text-xl font-semibold">Pharmacy sign in</h1>
          <p className="mt-1 text-sm text-ink-500">Manage orders, consultations and your profile.</p>
          <LoginForm next={next} />
        </div>
        <p className="mt-4 text-center text-sm text-ink-600">
          New to GetMed? <Link href="/signup" className="font-medium text-brand-700 hover:underline">Create your pharmacy account</Link>
        </p>
      </div>
    </div>
  );
}
