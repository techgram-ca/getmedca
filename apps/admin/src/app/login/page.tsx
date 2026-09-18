import type { Metadata } from "next";
import { Logo } from "@getmed/ui";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo light /></div>
        <div className="surface p-6">
          <h1 className="text-xl font-semibold">Admin sign in</h1>
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
