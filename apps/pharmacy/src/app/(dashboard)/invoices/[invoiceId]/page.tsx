import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { requirePharmacy } from "@getmed/core/auth";
import { formatCurrency, formatDate, shortId } from "@getmed/core/format";
import { buildInvoice } from "@getmed/core/invoices";
import { Button, Card, CardContent, PageHeader, Stat, TBody, TD, TH, THead, TR, Table } from "@getmed/ui";

export default async function InvoiceDetail({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const { pharmacy, db } = await requirePharmacy();
  const inv = await buildInvoice(db, pharmacy.id, invoiceId);
  if (!inv) notFound();
  return (
    <div>
      <PageHeader
        title={`Invoice ${inv.id}`}
        description={`${formatDate(inv.periodStart, { dateStyle: "medium", timeStyle: undefined })} – ${formatDate(inv.periodEnd, { dateStyle: "medium", timeStyle: undefined })}`}
        actions={<Button asChild><a href={`/api/invoices/${inv.id}/pdf`}><Download /> Download PDF</a></Button>}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Delivered orders" value={inv.deliveredCount} />
        <Stat label="Flat delivery fee" value={formatCurrency(inv.flatFee)} hint="Snapshotted per order at delivery" />
        <Stat label="Total owed" value={formatCurrency(inv.total)} tone="brand" />
      </div>
      <Card className="mt-6">
        <CardContent className="p-0">
          <Table>
            <THead><TR><TH>Order</TH><TH>Delivered</TH><TH className="text-right">Fee</TH></TR></THead>
            <TBody>
              {inv.lines.map((l) => (
                <TR key={l.orderId}>
                  <TD className="font-mono"><Link href={`/orders/${l.orderId}`} className="hover:text-brand-700">{shortId(l.orderId)}</Link></TD>
                  <TD>{formatDate(l.deliveredAt)}</TD>
                  <TD className="text-right">{formatCurrency(l.fee)}</TD>
                </TR>
              ))}
              {inv.lines.length === 0 ? <TR><TD colSpan={3} className="text-center text-ink-500">No delivered orders this month.</TD></TR> : null}
            </TBody>
          </Table>
        </CardContent>
      </Card>
      <Button asChild variant="link" className="mt-6"><Link href="/invoices">← All invoices</Link></Button>
    </div>
  );
}
