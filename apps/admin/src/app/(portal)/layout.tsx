import { redirect } from "next/navigation";
import { requireAdmin } from "@getmed/core/auth";
import { PortalShell } from "@/components/portal-shell";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  let ctx: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    ctx = await requireAdmin();
  } catch {
    redirect("/login");
  }
  const { db } = ctx;
  const [{ count: escalations }, { count: pendingPharmacies }, { count: support }] = await Promise.all([
    db.from("orders").select("id", { count: "exact", head: true }).not("escalated_at", "is", null).neq("escalation_status", "resolved"),
    db.from("pharmacies").select("id", { count: "exact", head: true }).eq("status", "pending").not("submitted_at", "is", null),
    db.from("support_messages").select("id", { count: "exact", head: true }).eq("resolved", false),
  ]);
  return <PortalShell counts={{ escalations: escalations ?? 0, pharmacies: pendingPharmacies ?? 0, support: support ?? 0 }}>{children}</PortalShell>;
}
