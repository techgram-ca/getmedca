import { requirePharmacy } from "@getmed/core/auth";
import { NotFoundError } from "@getmed/core/errors";
import { buildInvoice, renderInvoicePdf } from "@getmed/core/invoices";
import { handler } from "@/lib/api";

export const GET = handler(async (_req: Request, ctx: { params: Promise<{ invoiceId: string }> }) => {
  const { invoiceId } = await ctx.params;
  const { pharmacy, db } = await requirePharmacy();
  const inv = await buildInvoice(db, pharmacy.id, invoiceId);
  if (!inv) throw new NotFoundError("Invoice not found");
  const bytes = await renderInvoicePdf(inv);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="getmed-invoice-${inv.id}.pdf"`,
      "cache-control": "no-store",
    },
  });
});
