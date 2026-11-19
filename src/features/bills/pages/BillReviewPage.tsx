import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  HelpCircle,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ReviewStatusBadge } from "@/components/common/StatusBadge";
import { DatePickerField } from "@/components/forms/DatePickerField";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator, Skeleton } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/formatters";
import { billService, recalculateBillTotals } from "@/mocks/services/billService";
import { vendorService } from "@/mocks/services/vendorService";
import type { Bill, BillLineItem, ConfidenceLevel } from "@/types";
import { cn } from "@/lib/utils";
import { BillPaymentsPanel } from "../components/BillPaymentsPanel";
import { DocumentPreviewPane } from "../components/DocumentPreviewPane";

function ConfidenceIndicator({ level }: { level?: ConfidenceLevel }) {
  if (!level || level === "high") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--status-success)]">
        <CheckCircle2 className="h-3 w-3" />
        Verified
      </span>
    );
  }
  if (level === "attention") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--status-warning)]">
        <AlertTriangle className="h-3 w-3" />
        Needs attention
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--status-danger)]">
      <HelpCircle className="h-3 w-3" />
      Missing
    </span>
  );
}

export function BillReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: loadedBill, isLoading } = useQuery({
    queryKey: ["bill", id],
    queryFn: () => billService.getById(id!),
    enabled: Boolean(id),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => vendorService.list(),
  });

  const [draft, setDraft] = React.useState<Bill | null>(null);
  const [discardOpen, setDiscardOpen] = React.useState(false);

  React.useEffect(() => {
    if (loadedBill) {
      setDraft(loadedBill);
    }
  }, [loadedBill]);

  const saveDraftMutation = useMutation({
    mutationFn: (b: Bill) => billService.update(b.id, b),
    onSuccess: (saved) => {
      queryClient.setQueryData(["bill", saved.id], saved);
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Draft saved");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (b: Bill) => billService.confirmBill(b.id, b),
    onSuccess: (confirmed) => {
      queryClient.setQueryData(["bill", confirmed.id], confirmed);
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      toast.success(`Bill ${confirmed.invoiceNumber} confirmed and added to bill history`);
      navigate(`/bills/${confirmed.id}`);
    },
  });

  const discardMutation = useMutation({
    mutationFn: () => billService.deleteDraft(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Draft discarded");
      navigate("/bills");
    },
  });

  const updateDraft = (updater: (prev: Bill) => Bill) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return recalculateBillTotals(updater(prev));
    });
  };

  const handleVendorChange = (vendorId: string) => {
    const v = vendors.find((item) => item.id === vendorId);
    if (!v) return;
    updateDraft((prev) => ({
      ...prev,
      vendorId: v.id,
      vendorName: v.name,
      vendorGstin: v.gstin,
      category: v.category,
      cgst: v.state === "Maharashtra" ? prev.cgst || 1 : 0,
      sgst: v.state === "Maharashtra" ? prev.sgst || 1 : 0,
      igst: v.state === "Maharashtra" ? 0 : prev.igst || 1,
    }));
  };

  const updateLineItem = (itemId: string, patch: Partial<BillLineItem>) => {
    updateDraft((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((li) => (li.id === itemId ? { ...li, ...patch } : li)),
    }));
  };

  const addLineItem = () => {
    updateDraft((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          id: `li-${Date.now()}`,
          description: "Additional billed item",
          hsnSac: "998315",
          quantity: 1,
          unit: "Units",
          unitPrice: 1000,
          discount: 0,
          taxableValue: 1000,
          gstRate: 18,
          taxAmount: 180,
          total: 1180,
          confidence: "high",
        },
      ],
    }));
  };

  const removeLineItem = (itemId: string) => {
    updateDraft((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((li) => li.id !== itemId),
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-5 h-[560px]" />
          <Skeleton className="lg:col-span-7 h-[560px]" />
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5" />}
        title="Invoice not found"
        description="Return to the bills list to select an invoice for review."
        action={
          <Button variant="outline" onClick={() => navigate("/bills")}>
            Back to bills
          </Button>
        }
      />
    );
  }

  const isInterState = draft.igst > 0 && draft.cgst === 0;

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: "Bills", to: "/bills" },
          { label: draft.invoiceNumber || "Review", to: `/bills/${draft.id}` },
          { label: "Review" },
        ]}
        title="Review extracted invoice"
        subtitle="Verify extracted fields, edit line items, track payments, and confirm."
        actions={
          <>
            <ReviewStatusBadge status={draft.reviewStatus} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDiscardOpen(true)}
            >
              Discard draft
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saveDraftMutation.isPending}
              onClick={() => saveDraftMutation.mutate(draft)}
            >
              <Save className="h-3.5 w-3.5" />
              Save draft
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate(draft)}
            >
              {confirmMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Confirm bill
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2.5 text-[12px]">
        <span className="font-medium text-[var(--text-charcoal)]">Extraction status:</span>
        <ConfidenceIndicator level="high" />
        <ConfidenceIndicator level="attention" />
        <ConfidenceIndicator level="missing" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Document / Bill Image Preview */}
        <div className="lg:col-span-5 lg:sticky lg:top-20">
          <DocumentPreviewPane bill={draft} />
        </div>

        {/* Right: Editable Extracted Data + Payments & Percentage Panel */}
        <div className="lg:col-span-7 space-y-5">
          {/* Payments & Settlement Percentage right in Review */}
          <BillPaymentsPanel bill={draft} />

          {/* Vendor & Metadata */}
          <ElevatedCard className="p-5 sm:p-6 space-y-5">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
              Vendor &amp; invoice metadata
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Vendor</Label>
                  <ConfidenceIndicator level={draft.confidence?.vendorName} />
                </div>
                <Select value={draft.vendorId} onValueChange={handleVendorChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} ({v.gstin})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rev-inv-num">Invoice number</Label>
                  <ConfidenceIndicator level={draft.confidence?.invoiceNumber} />
                </div>
                <Input
                  id="rev-inv-num"
                  value={draft.invoiceNumber}
                  className={cn(
                    "font-mono-data",
                    draft.confidence?.invoiceNumber === "missing" &&
                      "border-[var(--status-danger)] bg-[var(--status-danger-bg)]/30"
                  )}
                  onChange={(e) =>
                    updateDraft((p) => ({
                      ...p,
                      invoiceNumber: e.target.value,
                      confidence: { ...p.confidence, invoiceNumber: "high" },
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rev-po">PO number</Label>
                  <ConfidenceIndicator level={draft.confidence?.poNumber} />
                </div>
                <Input
                  id="rev-po"
                  value={draft.poNumber ?? ""}
                  placeholder="Enter PO reference"
                  className={cn(
                    "font-mono-data",
                    draft.confidence?.poNumber === "missing" &&
                      "border-[var(--status-danger)] bg-[var(--status-danger-bg)]/30",
                    draft.confidence?.poNumber === "attention" &&
                      "border-[var(--status-warning)] bg-[var(--status-warning-bg)]/30"
                  )}
                  onChange={(e) =>
                    updateDraft((p) => ({
                      ...p,
                      poNumber: e.target.value,
                      confidence: {
                        ...p.confidence,
                        poNumber: e.target.value.trim() ? "high" : "missing",
                      },
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rev-inv-date">Invoice date</Label>
                  <ConfidenceIndicator level={draft.confidence?.invoiceDate} />
                </div>
                <DatePickerField
                  id="rev-inv-date"
                  value={draft.invoiceDate}
                  onChange={(val) =>
                    updateDraft((p) => ({
                      ...p,
                      invoiceDate: val,
                      confidence: { ...p.confidence, invoiceDate: "high" },
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rev-due-date">Due date</Label>
                  <ConfidenceIndicator level={draft.confidence?.dueDate} />
                </div>
                <DatePickerField
                  id="rev-due-date"
                  value={draft.dueDate}
                  onChange={(val) =>
                    updateDraft((p) => ({
                      ...p,
                      dueDate: val,
                      confidence: { ...p.confidence, dueDate: "high" },
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rev-pos">Place of supply</Label>
                  <ConfidenceIndicator level={draft.confidence?.placeOfSupply} />
                </div>
                <Input
                  id="rev-pos"
                  value={draft.placeOfSupply}
                  onChange={(e) =>
                    updateDraft((p) => ({
                      ...p,
                      placeOfSupply: e.target.value,
                      confidence: { ...p.confidence, placeOfSupply: "high" },
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>GST regime</Label>
                <Select
                  value={isInterState ? "IGST" : "CGST_SGST"}
                  onValueChange={(val) =>
                    updateDraft((p) => ({
                      ...p,
                      cgst: val === "CGST_SGST" ? 1 : 0,
                      sgst: val === "CGST_SGST" ? 1 : 0,
                      igst: val === "IGST" ? 1 : 0,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CGST_SGST">Intra-state (CGST + SGST)</SelectItem>
                    <SelectItem value="IGST">Inter-state (IGST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ElevatedCard>

          {/* Line Items Editor */}
          <ElevatedCard className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                  Line items
                </h2>
                <ConfidenceIndicator level={draft.confidence?.lineItems} />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-3.5 w-3.5" />
                Add item
              </Button>
            </div>

            <div className="space-y-3">
              {draft.lineItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-md border p-3.5 space-y-3",
                    item.confidence === "missing"
                      ? "border-[var(--status-danger)]/50 bg-[var(--status-danger-bg)]/20"
                      : item.confidence === "attention"
                        ? "border-[var(--status-warning)]/50 bg-[var(--status-warning-bg)]/20"
                        : "border-[var(--border-default)] bg-[var(--bg-surface)]"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                      Item #{idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <ConfidenceIndicator level={item.confidence} />
                      {draft.lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          aria-label="Remove line item"
                          className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--status-danger-bg)] hover:text-[var(--status-danger)] cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                    <div className="sm:col-span-4 space-y-1">
                      <Label className="text-[11px]">Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          updateLineItem(item.id, {
                            description: e.target.value,
                            confidence: "high",
                          })
                        }
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[11px]">HSN / SAC</Label>
                      <Input
                        value={item.hsnSac}
                        className="font-mono-data"
                        onChange={(e) =>
                          updateLineItem(item.id, { hsnSac: e.target.value, confidence: "high" })
                        }
                      />
                    </div>

                    <div className="sm:col-span-1 space-y-1">
                      <Label className="text-[11px]">Qty</Label>
                      <Input
                        type="number"
                        min={0}
                        value={item.quantity}
                        className="tabular-nums"
                        onChange={(e) =>
                          updateLineItem(item.id, {
                            quantity: Number(e.target.value) || 0,
                            confidence: "high",
                          })
                        }
                      />
                    </div>
                    <div className="sm:col-span-1 space-y-1">
                      <Label className="text-[11px]">Unit</Label>
                      <Input
                        value={item.unit}
                        onChange={(e) => updateLineItem(item.id, { unit: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[11px]">Unit price (₹)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        className="font-mono-data tabular-nums"
                        onChange={(e) =>
                          updateLineItem(item.id, {
                            unitPrice: Number(e.target.value) || 0,
                            confidence: "high",
                          })
                        }
                      />
                    </div>
                    <div className="sm:col-span-1 space-y-1">
                      <Label className="text-[11px]">GST %</Label>
                      <Select
                        value={String(item.gstRate)}
                        onValueChange={(v) => updateLineItem(item.id, { gstRate: Number(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="12">12%</SelectItem>
                          <SelectItem value="18">18%</SelectItem>
                          <SelectItem value="28">28%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-1 space-y-1">
                      <Label className="text-[11px]">Line total</Label>
                      <div className="flex h-9 items-center justify-end font-mono-data text-[12px] font-semibold text-[var(--text-primary)] tabular-nums">
                        {formatINR(item.total, { decimals: 0 })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ElevatedCard>

          {/* Tax Breakdown & Financial Summary */}
          <ElevatedCard className="p-5 sm:p-6 space-y-4">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
              Tax breakdown &amp; totals
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rev-other">Other charges (₹)</Label>
                <Input
                  id="rev-other"
                  type="number"
                  value={draft.otherCharges}
                  className="font-mono-data tabular-nums"
                  onChange={(e) =>
                    updateDraft((p) => ({ ...p, otherCharges: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rev-round">Round off (₹)</Label>
                <Input
                  id="rev-round"
                  type="number"
                  step="0.01"
                  value={draft.roundOff}
                  className="font-mono-data tabular-nums"
                  onChange={(e) =>
                    updateDraft((p) => ({ ...p, roundOff: Number(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rev-notes">Reviewer notes</Label>
              <Textarea
                id="rev-notes"
                value={draft.notes ?? ""}
                placeholder="Add reconciliation notes or audit remarks..."
                onChange={(e) => setDraft((p) => (p ? { ...p, notes: e.target.value } : p))}
              />
            </div>

            <Separator />

            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Taxable value</span>
                <span className="font-mono-data tabular-nums">{formatINR(draft.taxableAmount)}</span>
              </div>
              {isInterState ? (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">IGST</span>
                  <span className="font-mono-data tabular-nums">{formatINR(draft.igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">CGST</span>
                    <span className="font-mono-data tabular-nums">{formatINR(draft.cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">SGST</span>
                    <span className="font-mono-data tabular-nums">{formatINR(draft.sgst)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between pt-2 border-t border-[var(--border-subtle)] text-[16px] font-semibold">
                <span className="text-[var(--brand-navy)]">Grand total</span>
                <span className="font-mono-data text-[var(--brand-burgundy)] tabular-nums">
                  {formatINR(draft.totalAmount)}
                </span>
              </div>
            </div>
          </ElevatedCard>
        </div>
      </div>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {draft.invoiceNumber || draft.fileName} from your demo workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => discardMutation.mutate()}>
              Discard draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
