import { formatDateDisplay, formatINR } from "@/lib/formatters";
import type { Bill } from "@/types";

export function buildScannedBillImageUrl(bill: Bill): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const itemsSvg = bill.lineItems
    .slice(0, 4)
    .map((li, i) => {
      const y = 310 + i * 44;
      const desc = li.description.length > 36 ? `${li.description.slice(0, 34)}...` : li.description;
      return `
        <text x="48" y="${y}" font-family="monospace" font-size="13" fill="#292A28">${esc(desc)}</text>
        <text x="48" y="${y + 16}" font-family="monospace" font-size="11" fill="#77736C">HSN ${esc(li.hsnSac)} | Qty ${li.quantity} ${esc(li.unit)} x ${esc(formatINR(li.unitPrice))}</text>
        <text x="532" y="${y + 6}" text-anchor="end" font-family="monospace" font-size="13" font-weight="bold" fill="#292A28">${esc(formatINR(li.total))}</text>
        <line x1="48" y1="${y + 26}" x2="532" y2="${y + 26}" stroke="#E7E0D6" stroke-width="1"/>
      `;
    })
    .join("");

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="580" height="720" viewBox="0 0 580 720">
    <rect width="580" height="720" fill="#E6DFD3"/>
    <g transform="translate(18, 18) rotate(-0.6 270 340)">
      <rect x="6" y="8" width="532" height="670" rx="4" fill="rgba(19,52,88,0.12)"/>
      <rect x="0" y="0" width="532" height="670" rx="3" fill="#FCFBF8" stroke="#D8D0C5" stroke-width="1.2"/>
      <rect x="0" y="0" width="532" height="64" fill="#F6E4EA"/>
      <rect x="0" y="0" width="532" height="4" fill="#930031"/>
      <text x="32" y="28" font-family="sans-serif" font-size="11" font-weight="bold" fill="#601D49" letter-spacing="1.5">SCANNED TAX INVOICE IMAGE (${esc(bill.fileType)})</text>
      <text x="32" y="50" font-family="sans-serif" font-size="18" font-weight="bold" fill="#133458">${esc(bill.vendorName)}</text>
      <text x="500" y="34" text-anchor="end" font-family="monospace" font-size="13" font-weight="bold" fill="#930031">${esc(bill.invoiceNumber)}</text>
      <text x="500" y="52" text-anchor="end" font-family="monospace" font-size="11" fill="#601D49">GSTIN: ${esc(bill.vendorGstin)}</text>

      <text x="32" y="96" font-family="sans-serif" font-size="11" font-weight="bold" fill="#77736C">BILL TO</text>
      <text x="32" y="114" font-family="sans-serif" font-size="12" fill="#292A28">Airco Precision Systems Pvt. Ltd.</text>
      <text x="32" y="132" font-family="sans-serif" font-size="11" fill="#4A4A4A">${esc(bill.billingAddress.slice(0, 52))}</text>

      <text x="320" y="96" font-family="sans-serif" font-size="11" font-weight="bold" fill="#77736C">DATES &amp; SUPPLY</text>
      <text x="320" y="114" font-family="monospace" font-size="11" fill="#292A28">Date: ${esc(formatDateDisplay(bill.invoiceDate))}</text>
      <text x="320" y="132" font-family="monospace" font-size="11" fill="#292A28">Due : ${esc(formatDateDisplay(bill.dueDate))}</text>
      <text x="320" y="150" font-family="monospace" font-size="11" fill="#4A4A4A">POS : ${esc(bill.placeOfSupply)}</text>

      <line x1="32" y1="176" x2="500" y2="176" stroke="#133458" stroke-width="1.5"/>
      <text x="32" y="198" font-family="sans-serif" font-size="11" font-weight="bold" fill="#133458">PARTICULARS</text>
      <text x="500" y="198" text-anchor="end" font-family="sans-serif" font-size="11" font-weight="bold" fill="#133458">AMOUNT</text>
      <line x1="32" y1="208" x2="500" y2="208" stroke="#D8D0C5" stroke-width="1"/>

      <g transform="translate(-16, -70)">
        ${itemsSvg}
      </g>

      <g transform="translate(0, 480)">
        <line x1="32" y1="0" x2="500" y2="0" stroke="#D8D0C5" stroke-width="1"/>
        <text x="330" y="26" font-family="sans-serif" font-size="12" fill="#4A4A4A">Taxable Value</text>
        <text x="500" y="26" text-anchor="end" font-family="monospace" font-size="12" fill="#292A28">${esc(formatINR(bill.taxableAmount))}</text>
        <text x="330" y="48" font-family="sans-serif" font-size="12" fill="#4A4A4A">GST Total</text>
        <text x="500" y="48" text-anchor="end" font-family="monospace" font-size="12" fill="#292A28">${esc(formatINR(bill.cgst + bill.sgst + bill.igst))}</text>
        <line x1="320" y1="62" x2="500" y2="62" stroke="#133458" stroke-width="1.2"/>
        <text x="330" y="84" font-family="sans-serif" font-size="14" font-weight="bold" fill="#133458">TOTAL</text>
        <text x="500" y="84" text-anchor="end" font-family="monospace" font-size="15" font-weight="bold" fill="#930031">${esc(formatINR(bill.totalAmount))}</text>
      </g>

      <g transform="translate(46, 520) rotate(-12)">
        <rect x="0" y="0" width="150" height="44" rx="4" fill="none" stroke="#176B70" stroke-width="2" opacity="0.75"/>
        <text x="75" y="27" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="#176B70" opacity="0.85">SCANNED COPY</text>
      </g>

      <text x="32" y="642" font-family="monospace" font-size="10" fill="#77736C">File: ${esc(bill.fileName)} · Captured via Airco BillSage</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function downloadBillDocument(bill: Bill): void {
  const imageSrc =
    bill.previewDataUrl ??
    (bill.fileType === "PNG" || bill.fileType === "JPG" ? buildScannedBillImageUrl(bill) : null);

  if (imageSrc) {
    const a = document.createElement("a");
    a.href = imageSrc;
    a.download = bill.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  const content = [
    `TAX INVOICE RECORD — ${bill.invoiceNumber}`,
    `Vendor: ${bill.vendorName} (GSTIN: ${bill.vendorGstin})`,
    `Invoice Date: ${bill.invoiceDate} | Due Date: ${bill.dueDate}`,
    `Place of Supply: ${bill.placeOfSupply}`,
    `PO Reference: ${bill.poNumber || "—"}`,
    "",
    "Line Items:",
    ...bill.lineItems.map(
      (li, i) =>
        `${i + 1}. ${li.description} | HSN ${li.hsnSac} | ${li.quantity} ${li.unit} x ${formatINR(li.unitPrice)} = ${formatINR(li.total)}`
    ),
    "",
    `Taxable Value: ${formatINR(bill.taxableAmount)}`,
    `CGST: ${formatINR(bill.cgst)} | SGST: ${formatINR(bill.sgst)} | IGST: ${formatINR(bill.igst)}`,
    `Grand Total: ${formatINR(bill.totalAmount)}`,
    `Amount Paid: ${formatINR(bill.amountPaid)} | Balance: ${formatINR(Math.max(0, bill.totalAmount - bill.amountPaid))}`,
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${bill.invoiceNumber.replace(/[/\\]/g, "-")}-invoice.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
