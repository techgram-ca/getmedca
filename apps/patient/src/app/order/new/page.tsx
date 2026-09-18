import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@getmed/db/service";
import { Avatar } from "@getmed/ui";
import { OrderForm } from "@/components/order-form";
import { getPublicPharmacy } from "@/lib/pharmacy";

export const metadata: Metadata = { title: "New order" };
export const dynamic = "force-dynamic";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ pharmacyId?: string; address?: string; type?: string }> }) {
  const sp = await searchParams;
  if (!sp.pharmacyId) notFound();
  const pharmacy = await getPublicPharmacy(sp.pharmacyId);
  if (!pharmacy) notFound();
  const db = createServiceClient();
  const { data: config } = await db.from("form_field_config").select("*").order("sort_order");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-4">
        <Avatar src={pharmacy.logoUrl} name={pharmacy.name ?? "Pharmacy"} size={56} className="rounded-xl" />
        <div>
          <p className="text-sm text-ink-500">Ordering from</p>
          <h1 className="text-xl font-semibold">
            <Link href={`/p/${pharmacy.slug ?? pharmacy.id}`} className="hover:underline">{pharmacy.name}</Link>
          </h1>
        </div>
      </div>
      <OrderForm
        pharmacy={{ id: pharmacy.id, name: pharmacy.name ?? "Pharmacy", offersTransfer: pharmacy.offers_transfer }}
        config={config ?? []}
        initialAddress={sp.address ?? ""}
        initialType={sp.type === "transfer" ? "transfer" : "new"}
      />
    </div>
  );
}
