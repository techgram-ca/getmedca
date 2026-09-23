import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatCurrency, formatDate, shortId } from "../format";
import { zoneLabel } from "../pricing";
import type { InvoiceSummary } from "./summary";

/** Render a monthly invoice PDF (server-side, no browser needed). */
export async function renderInvoicePdf(inv: InvoiceSummary): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([612, 792]);
  const teal = rgb(0.05, 0.47, 0.45);
  const gray = rgb(0.4, 0.4, 0.4);
  let y = 740;

  const text = (s: string, x: number, size = 11, f = font, color = rgb(0.1, 0.1, 0.1)) => {
    page.drawText(s, { x, y, size, font: f, color });
  };

  page.drawRectangle({ x: 0, y: 760, width: 612, height: 32, color: teal });
  page.drawText("GetMed", { x: 40, y: 770, size: 16, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Monthly delivery invoice", { x: 430, y: 770, size: 11, font, color: rgb(1, 1, 1) });

  text(inv.pharmacyName, 40, 18, bold);
  y -= 22;
  text(`Invoice ${inv.id}`, 40, 11, font, gray);
  y -= 16;
  text(`Period: ${formatDate(inv.periodStart, { dateStyle: "medium", timeStyle: undefined })} – ${formatDate(inv.periodEnd, { dateStyle: "medium", timeStyle: undefined })}`, 40, 11, font, gray);
  y -= 36;

  text("Delivered orders", 40, 11, bold);
  text(String(inv.deliveredCount), 300, 11);
  y -= 18;
  text("Total owed", 40, 13, bold);
  text(formatCurrency(inv.total), 300, 13, bold, teal);
  y -= 32;

  // Breakdown by delivery type
  text("By delivery type", 40, 11, bold);
  y -= 16;
  text("Type", 40, 10, bold, gray);
  text("Deliveries", 240, 10, bold, gray);
  text("Rate", 350, 10, bold, gray);
  text("Subtotal", 460, 10, bold, gray);
  y -= 6;
  page.drawLine({ start: { x: 40, y }, end: { x: 572, y }, thickness: 0.5, color: gray });
  y -= 16;
  for (const row of inv.breakdown) {
    text(row.label, 40, 10);
    text(String(row.count), 240, 10);
    text(row.unitPrice != null ? formatCurrency(row.unitPrice) : "Mixed", 350, 10);
    text(formatCurrency(row.subtotal), 460, 10);
    y -= 16;
  }
  if (inv.breakdown.length === 0) {
    text("No deliveries this month.", 40, 10, font, gray);
    y -= 16;
  }
  y -= 20;

  text("Every delivery", 40, 11, bold);
  y -= 16;
  text("Order", 40, 10, bold, gray);
  text("Delivered", 140, 10, bold, gray);
  text("Type", 340, 10, bold, gray);
  text("Fee", 460, 10, bold, gray);
  y -= 6;
  page.drawLine({ start: { x: 40, y }, end: { x: 572, y }, thickness: 0.5, color: gray });
  y -= 16;

  for (const line of inv.lines) {
    if (y < 60) {
      page = doc.addPage([612, 792]);
      y = 740;
    }
    text(shortId(line.orderId), 40, 10);
    text(formatDate(line.deliveredAt), 140, 10);
    text(zoneLabel(line.type), 340, 10);
    text(formatCurrency(line.fee), 460, 10);
    y -= 16;
  }
  if (inv.lines.length === 0) text("No delivered orders this month.", 40, 10, font, gray);

  return doc.save();
}
