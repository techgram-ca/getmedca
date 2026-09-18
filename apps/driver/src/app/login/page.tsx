import type { Metadata } from "next";
import { Logo } from "@getmed/ui";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="flex min-h-screen flex-col justify-center bg-brand-600 px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo light /></div>
        <div className="surface p-6">
          <h1 className="text-xl font-semibold">Driver sign in</h1>
          <p className="mt-1 text-sm text-ink-500">Use the login GetMed created for you.</p>
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
