import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@getmed/core/auth";
import { createServiceClient } from "@getmed/db/service";
import { Logo } from "@getmed/ui";
import { SignupAccountForm } from "@/components/signup-account-form";
import { SignupWizard } from "@/components/signup-wizard";
import { loadProfile } from "@/lib/load-profile";

export const metadata: Metadata = { title: "Create your pharmacy profile" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-ink-50 px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center"><Logo /></div>
          <div className="surface p-6">
            <h1 className="text-xl font-semibold">Create your pharmacy account</h1>
            <p className="mt-1 text-sm text-ink-500">One login per pharmacy. You'll set up your public profile next.</p>
            <SignupAccountForm />
          </div>
          <p className="mt-4 text-center text-sm text-ink-600">Already registered? <Link href="/login" className="font-medium text-brand-700 hover:underline">Sign in</Link></p>
        </div>
      </div>
    );
  }

  if (session.role !== "pharmacy") redirect("/login");
  const db = createServiceClient();
  let { data: pharmacy } = await db.from("pharmacies").select("id, submitted_at, signup_step").eq("owner_user_id", session.userId).maybeSingle();
  if (!pharmacy) {
    const { data: created } = await db.from("pharmacies").insert({ owner_user_id: session.userId, email: session.email, status: "pending" }).select("id, submitted_at, signup_step").single();
    pharmacy = created;
  }
  if (!pharmacy) redirect("/login");
  if (pharmacy.submitted_at) redirect("/dashboard");

  const data = await loadProfile(db, pharmacy.id);
  return <SignupWizard data={data} />;
}
