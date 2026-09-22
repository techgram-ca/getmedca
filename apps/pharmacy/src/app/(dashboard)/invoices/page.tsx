import Link from "next/link";
import { FileText } from "lucide-react";
import { requirePharmacy } from "@getmed/core/auth";
import { formatCurrency } from "@getmed/core/format";
import { listInvoiceMonths } from "@getmed/core/invoices";
import { Alert, Badge, Button, EmptyState, PageHeader, TBody, TD, TH, THead, TR, Table } from "@getmed/ui";

export default async function InvoicesPage() {
  const { pharmacy, db } = await requirePharmacy();
  const months = await listInvoiceMonths(db, pharmacy.id);

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Monthly delivery summaries. Only delivered orders are billed, each at the price agreed when GetMed set its delivery type."
      />
      <Alert tone="info" className="mb-4">
        Nothing is charged for orders you reject or cancel, or for deliveries that fail.
      </Alert>

      {months.length === 0 ? (
        <EmptyState icon={<FileText />} title="No invoices yet" description="Your first invoice appears after your first delivered order." />
      ) : (
        <div className="surface overflow-hidden">
          <Table>
            <THead>
              <TR><TH>Month</TH><TH>Delivered orders</TH><TH>By delivery type</TH><TH>Total owed</TH><TH /></TR>
            </THead>
            <TBody>
              {months.map((m) => (
                <TR key={m.id}>
                  <TD className="font-medium">{monthLabel(m.id)}</TD>
                  <TD>{m.deliveredCount}</TD>
                  <TD>
                    {m.breakdown.length === 0 ? (
                      <span className="text-ink-400">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-1.5">
                        {m.breakdown.map((b) => (
                          <Badge key={b.type} tone="neutral">{b.label.replace(" Delivery", "")} × {b.count}</Badge>
                        ))}
                      </span>
                    )}
                  </TD>
                  <TD className="font-semibold">{formatCurrency(m.total)}</TD>
                  <TD className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/invoices/${m.id}`}>View</Link></Button></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function monthLabel(id: string) {
  const [y, m] = id.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, 1)).toLocaleDateString("en-CA", { month: "long", year: "numeric", timeZone: "UTC" });
}
