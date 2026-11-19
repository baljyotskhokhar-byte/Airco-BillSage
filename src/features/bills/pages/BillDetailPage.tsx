import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  Download,
  Edit3,
  FileText,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ElevatedCard } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator, Skeleton } from "@/components/ui/separator";
import { downloadBillDocument } from "@/lib/billDownload";
import { formatDateDisplay, formatINR } from "@/lib/formatters";
import { billService } from "@/mocks/services/billService";
import { BillPaymentsPanel } from "../components/BillPaymentsPanel";
import { DocumentPreviewPane } from "../components/DocumentPreviewPane";

export function BillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const { data: bill, isLoading } = useQuery({
    queryKey: ["bill", id],
    queryFn: () => billService.getById(id!),
    enabled: Boolean(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => billService.deleteDraft(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Bill removed from ledger");
      navigate("/bills");
    },
  });

  const handleDownloadSummary = () => {
    if (!bill) return;
    downloadBillDocument(bill);
    toast.success(`Downloaded ${bill.fileName}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!bill) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5" />}
        title="Bill not found"
        description="This invoice record does not exist or may have been discarded."
        action={
          <Button variant="outline" onClick={() => navigate("/bills")}>
            Back to bills
          </Button>
        }
      />
    );
  }

  const outstanding = Math.max(0, bill.totalAmount - bill.amountPaid);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Bills", to: "/bills" },
          { label: bill.invoiceNumber },
        ]}
        title={bill.invoiceNumber}
        subtitle={`${bill.vendorName} · GSTIN ${bill.vendorGstin}`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/bills/${bill.id}/review`)}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit / Review
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadSummary}>
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
            {outstanding > 0.01 && (
              <Button
                size="sm"
                onClick={() => navigate(`/bank-account?billId=${bill.id}&action=record`)}
              >
                <CreditCard className="h-3.5 w-3.5" />
                Record Payment
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => navigate(`/vendors/${bill.vendorId}`)}>
                  View vendor profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setDeleteOpen(true)}
                  className="text-[var(--status-danger)] focus:bg-[var(--status-danger-bg)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete bill
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* Two-Column Detail View: Bill Image Always Visible on Left + Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 lg:sticky lg:top-20">
          <DocumentPreviewPane bill={bill} />
        </div>

        <div className="lg:col-span-7 space-y-5">
          {/* Metadata Grid */}
          <ElevatedCard className="p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">
              Invoice information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
              <div>
                <p className="text-[11px] text-[var(--text-secondary)]">Vendor</p>
                <Link
                  to={`/vendors/${bill.vendorId}`}
                  className="mt-0.5 block font-medium text-[var(--brand-burgundy)] hover:underline"
                >
                  {bill.vendorName}
                </Link>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-secondary)]">GSTIN</p>
                <p className="mt-0.5 font-mono-data text-[12px] text-[var(--text-primary)]">
                  {bill.vendorGstin}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-secondary)]">Invoice date</p>
                <p className="mt-0.5 text-[var(--text-primary)] tabular-nums">
                  {formatDateDisplay(bill.invoiceDate)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-secondary)]">Due date</p>
                <p className="mt-0.5 text-[var(--text-primary)] tabular-nums">
                  {formatDateDisplay(bill.dueDate)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-secondary)]">PO number</p>
                <p className="mt-0.5 font-mono-data text-[12px] text-[var(--text-primary)]">
                  {bill.poNumber || "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-secondary)]">Place of supply</p>
                <p className="mt-0.5 text-[var(--text-primary)]">{bill.placeOfSupply}</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-secondary)]">Billing address</p>
                <p className="mt-0.5 text-[12px] text-[var(--text-charcoal)] leading-snug">
                  {bill.billingAddress}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-secondary)]">Shipping address</p>
                <p className="mt-0.5 text-[12px] text-[var(--text-charcoal)] leading-snug">
                  {bill.shippingAddress}
                </p>
              </div>
            </div>
          </ElevatedCard>

          {/* Line Items Table */}
          <ElevatedCard className="overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Line items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] font-medium text-[var(--text-secondary)]">
                    <th className="py-2.5 pl-5 pr-3">Description</th>
                    <th className="py-2.5 px-3">HSN/SAC</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">GST</th>
                    <th className="py-2.5 pl-3 pr-5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                  {bill.lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 pl-5 pr-3 font-medium text-[var(--text-primary)] min-w-[170px]">
                        {item.description}
                      </td>
                      <td className="py-3 px-3 font-mono-data text-[12px] text-[var(--text-secondary)]">
                        {item.hsnSac}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-data text-[12px] tabular-nums whitespace-nowrap">
                        {formatINR(item.unitPrice)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">{item.gstRate}%</td>
                      <td className="py-3 pl-3 pr-5 text-right font-mono-data text-[12px] font-semibold tabular-nums whitespace-nowrap">
                        {formatINR(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ElevatedCard>

          {/* Financial Summary */}
          <ElevatedCard className="p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">
              Financial summary
            </h2>
            <div className="space-y-2 text-[13px]">
              <SummaryRow label="Subtotal" value={formatINR(bill.subtotal)} />
              <SummaryRow label="Discount" value={`− ${formatINR(bill.discountTotal)}`} />
              <SummaryRow label="Taxable amount" value={formatINR(bill.taxableAmount)} />
              <SummaryRow label="CGST" value={formatINR(bill.cgst)} />
              <SummaryRow label="SGST" value={formatINR(bill.sgst)} />
              <SummaryRow label="IGST" value={formatINR(bill.igst)} />
              <SummaryRow label="Other charges" value={formatINR(bill.otherCharges)} />
              <SummaryRow label="Round off" value={formatINR(bill.roundOff)} />
              <Separator className="my-2" />
              <div className="flex items-center justify-between pt-1 text-[15px] font-semibold">
                <span>Grand total</span>
                <span className="font-mono-data tabular-nums">{formatINR(bill.totalAmount)}</span>
              </div>
            </div>
            {bill.notes && (
              <>
                <Separator className="my-4" />
                <p className="text-[12px] text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-primary)]">Notes: </span>
                  {bill.notes}
                </p>
              </>
            )}
          </ElevatedCard>

          {/* Payments & Percentage Paid */}
          <BillPaymentsPanel bill={bill} />
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bill {bill.invoiceNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the invoice record from your local demo ledger. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()}>
              Delete bill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-mono-data text-[var(--text-primary)] tabular-nums">{value}</span>
    </div>
  );
}
