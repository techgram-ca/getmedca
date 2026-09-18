import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { requireAdmin } from "@getmed/core/auth";
import { formatDate } from "@getmed/core/format";
import { Button, Card, CardContent, EmptyState, PageHeader } from "@getmed/ui";
import { SupportResolveButton } from "@/components/support-resolve";

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const { db } = await requireAdmin();
  let q = db.from("support_messages").select("*").order("created_at", { ascending: false }).limit(200);
  if (show !== "all") q = q.eq("resolved", false);
  const { data } = await q;
  return (
    <div className="max-w-3xl">
      <PageHeader title="Support inbox" description="Messages from the patient site's contact form." actions={<Button asChild size="sm" variant="ghost"><Link href={show === "all" ? "/support" : "/support?show=all"}>{show === "all" ? "Hide resolved" : "Show resolved"}</Link></Button>} />
      {(data ?? []).length === 0 ? <EmptyState icon={<LifeBuoy />} title="Inbox zero" /> : (
        <ul className="space-y-3">{(data ?? []).map((m) => (
          <li key={m.id}><Card className={m.resolved ? "opacity-60" : ""}><CardContent>
            <div className="flex items-start justify-between gap-4">
              <div><p className="font-medium">{m.name}</p><p className="text-xs text-ink-500">{[m.email, m.phone].filter(Boolean).join(" · ")} · {formatDate(m.created_at)}</p></div>
              <SupportResolveButton id={m.id} resolved={m.resolved} />
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-ink-700">{m.message}</p>
          </CardContent></Card></li>
        ))}</ul>
      )}
    </div>
  );
}
