import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createServiceClient } from "@getmed/db/service";
import { maskPhone } from "@getmed/core/format";
import { OtpForm } from "@/components/otp-form";

export const metadata: Metadata = { title: "Verify your phone" };
export const dynamic = "force-dynamic";

export default async function VerifyConsultationPage({ searchParams }: { searchParams: Promise<{ requestId?: string }> }) {
  const { requestId } = await searchParams;
  if (!requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) notFound();
  const db = createServiceClient();
  const { data: r } = await db.from("consultation_requests").select("id, patient_phone, phone_verified_at").eq("id", requestId).maybeSingle();
  if (!r) notFound();
  if (r.phone_verified_at) redirect(`/consultation/success?requestId=${r.id}`);
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <OtpForm kind="consultation" targetId={r.id} maskedPhone={maskPhone(r.patient_phone)} successHref={`/consultation/success?requestId=${r.id}`} failureHref="/consultation" />
    </div>
  );
}
