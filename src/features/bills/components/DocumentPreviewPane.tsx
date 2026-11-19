import * as React from "react";
import { ChevronLeft, ChevronRight, Download, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildScannedBillImageUrl, downloadBillDocument } from "@/lib/billDownload";
import { formatDateDisplay, formatINR } from "@/lib/formatters";
import type { Bill } from "@/types";

interface DocumentPreviewPaneProps {
  bill: Bill;
}

export function DocumentPreviewPane({ bill }: DocumentPreviewPaneProps) {
  const [zoom, setZoom] = React.useState(100);
  const [fitWidth, setFitWidth] = React.useState(true);
  const [page, setPage] = React.useState(1);

  const isImageBill = bill.fileType === "PNG" || bill.fileType === "JPG" || Boolean(bill.previewDataUrl);
  const totalPages = isImageBill ? 1 : 2;
  const resolvedImageSrc = React.useMemo(() => {
    if (bill.previewDataUrl) return bill.previewDataUrl;
    if (bill.fileType === "PNG" || bill.fileType === "JPG") {
      return buildScannedBillImageUrl(bill);
    }
    return null;
  }, [bill]);

  const handleDownload = () => {
    downloadBillDocument(bill);
    toast.success(`Downloaded ${bill.fileName}`);
  };

  return (
    <div className="flex flex-col rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate text-[12px] font-medium text-[var(--text-primary)] max-w-[160px]">
            {bill.fileName}
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">· {bill.fileType}</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setFitWidth(false);
              setZoom((z) => Math.max(60, z - 15));
            }}
            aria-label="Zoom out"
            className="h-7 w-7 p-0"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="font-mono-data text-[11px] text-[var(--text-secondary)] w-10 text-center tabular-nums">
            {fitWidth ? "Fit" : `${zoom}%`}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setFitWidth(false);
              setZoom((z) => Math.min(175, z + 15));
            }}
            aria-label="Zoom in"
            className="h-7 w-7 p-0"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant={fitWidth ? "secondary" : "ghost"}
            size="sm"
            onClick={() => {
              setFitWidth(true);
              setZoom(100);
            }}
            className="h-7 px-2 text-[11px]"
          >
            <Maximize2 className="h-3 w-3" />
            Fit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            aria-label="Download document"
            className="h-7 w-7 p-0"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[var(--bg-subtle)]/70 p-4 sm:p-5 min-h-[420px] max-h-[680px]">
        <div
          style={{
            width: fitWidth ? "100%" : `${zoom}%`,
            margin: "0 auto",
            transition: "width 150ms ease",
          }}
        >
          {resolvedImageSrc ? (
            <div className="rounded border border-[var(--border-default)] bg-white p-1.5 shadow-sm">
              <img
                src={resolvedImageSrc}
                alt={`Bill image for ${bill.invoiceNumber} (${bill.fileName})`}
                referrerPolicy="no-referrer"
                className="w-full h-auto rounded-sm block"
              />
            </div>
          ) : (
            <div className="rounded border border-[#D8D0C5] bg-white p-6 sm:p-7 text-[#292A28] shadow-sm text-[12px]">
              {page === 1 ? (
                <>
                  <div className="flex items-start justify-between border-b border-[#E7E0D6] pb-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#77736C]">
                        Tax Invoice
                      </p>
                      <h3 className="mt-1 text-[16px] font-semibold text-[#292A28]">
                        {bill.vendorName}
                      </h3>
                      <p className="font-mono-data text-[11px] text-[#4A4A4A]">
                        GSTIN: {bill.vendorGstin}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono-data text-[13px] font-semibold">
                        {bill.invoiceNumber}
                      </p>
                      <p className="mt-1 text-[11px] text-[#77736C]">
                        Date: {formatDateDisplay(bill.invoiceDate)}
                      </p>
                      <p className="text-[11px] text-[#77736C]">
                        Due: {formatDateDisplay(bill.dueDate)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 text-[11px]">
                    <div>
                      <p className="font-semibold text-[#4A4A4A]">Bill To</p>
                      <p className="mt-0.5 text-[#292A28]">Airco Precision Systems Pvt. Ltd.</p>
                      <p className="text-[#77736C] leading-snug">{bill.billingAddress}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#4A4A4A]">Supply Details</p>
                      <p className="mt-0.5 text-[#77736C]">Place of Supply: {bill.placeOfSupply}</p>
                      <p className="text-[#77736C]">PO Reference: {bill.poNumber || "Not specified"}</p>
                    </div>
                  </div>

                  <table className="mt-5 w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="border-y border-[#D8D0C5] bg-[#FAF8F4] text-[#4A4A4A]">
                        <th className="py-2 px-2 text-left">Item &amp; HSN/SAC</th>
                        <th className="py-2 px-2 text-right">Qty</th>
                        <th className="py-2 px-2 text-right">Rate</th>
                        <th className="py-2 px-2 text-right">GST</th>
                        <th className="py-2 px-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E0D6]">
                      {bill.lineItems.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2 px-2">
                            <p className="font-medium text-[#292A28]">{item.description}</p>
                            <p className="font-mono-data text-[10px] text-[#77736C]">
                              HSN: {item.hsnSac}
                            </p>
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2 px-2 text-right font-mono-data tabular-nums">
                            {formatINR(item.unitPrice)}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">{item.gstRate}%</td>
                          <td className="py-2 px-2 text-right font-mono-data font-medium tabular-nums">
                            {formatINR(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-5 flex justify-end">
                    <div className="w-60 space-y-1.5 border-t border-[#D8D0C5] pt-3 text-[11px]">
                      <div className="flex justify-between text-[#4A4A4A]">
                        <span>Taxable Amount</span>
                        <span className="font-mono-data tabular-nums">
                          {formatINR(bill.taxableAmount)}
                        </span>
                      </div>
                      {bill.igst > 0 ? (
                        <div className="flex justify-between text-[#4A4A4A]">
                          <span>IGST</span>
                          <span className="font-mono-data tabular-nums">{formatINR(bill.igst)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between text-[#4A4A4A]">
                            <span>CGST</span>
                            <span className="font-mono-data tabular-nums">{formatINR(bill.cgst)}</span>
                          </div>
                          <div className="flex justify-between text-[#4A4A4A]">
                            <span>SGST</span>
                            <span className="font-mono-data tabular-nums">{formatINR(bill.sgst)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between border-t border-[#D8D0C5] pt-2 text-[13px] font-semibold text-[#292A28]">
                        <span>Grand Total</span>
                        <span className="font-mono-data tabular-nums">
                          {formatINR(bill.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="border-b border-[#E7E0D6] pb-3 flex justify-between items-center">
                    <span className="font-semibold text-[#292A28]">
                      Terms &amp; GST Compliance Annex — {bill.invoiceNumber}
                    </span>
                    <span className="text-[11px] text-[#77736C]">Page 2 of 2</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#4A4A4A]">
                    1. All payments should reference invoice number <strong className="font-mono-data">{bill.invoiceNumber}</strong> via NEFT / RTGS or corporate UPI.
                  </p>
                  <p className="text-[11px] leading-relaxed text-[#4A4A4A]">
                    2. Input tax credit eligibility is subject to GSTR-2B matching under GSTIN <strong className="font-mono-data">{bill.vendorGstin}</strong>.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-[11px] text-[var(--text-secondary)]">
        <span className="tabular-nums">
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-7 px-2 text-[11px]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-7 px-2 text-[11px]"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
