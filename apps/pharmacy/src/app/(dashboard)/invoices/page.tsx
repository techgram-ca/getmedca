import Link from "next/link";
import { FileText } from "lucide-react";
import { requirePharmacy } from "@getmed/core/auth";
import { formatCurrency } from "@getmed/core/format";
import { listInvoiceMonths } from "@getmed/core/invoices";
import { Alert, Button, EmptyState, PageHeader, TBody, TD, TH, THead, TR, Table } from "@getmed/ui";

export default async function InvoicesPage() {
  const { pharmacy, db } = await requirePharmacy();
  const months = await listInvoiceMonths(db, pharmacy.id);
  return (
    <div>
      <PageHeader title="Invoices" description="Monthly delivery-fee summaries. Only delivered orders are billed, at the flat fee in effect when each was delivered." />
      <Alert tone="info" className="mb-4">Flat fee per delivered order. No fee is charged for rejected, cancelled, timed-out, or failed deliveries.</Alert>
      {months.length === 0 ? (
        <EmptyState icon={<FileText />} title="No invoices yet" description="Your first invoice appears after your first delivered order." />
      ) : (
        <div className="surface overflow-hidden">
          <Table>
            <THead><TR><TH>Month</TH><TH>Delivered orders</TH><TH>Flat fee</TH><TH>Total owed</TH><TH></TH></TR></THead>
            <TBody>
              {months.map((m) => (
                <TR key={m.id}>
                  <TD className="font-medium">{monthLabel(m.id)}</TD>
                  <TD>{m.deliveredCount}</TD>
                  <TD>{formatCurrency(m.flatFee)}</TD>
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
