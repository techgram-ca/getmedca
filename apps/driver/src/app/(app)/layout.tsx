import { redirect } from "next/navigation";
import { requireDriver } from "@getmed/core/auth";
import { AppShell } from "@/components/app-shell";
import { PushEnable } from "@/components/push-enable";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let ctx: Awaited<ReturnType<typeof requireDriver>>;
  try {
    ctx = await requireDriver();
  } catch {
    redirect("/login");
  }
  return (
    <AppShell driverName={ctx.driver.name}>
      <PushEnable hasSubscription={!!ctx.driver.push_subscription} />
      {children}
    </AppShell>
  );
}
