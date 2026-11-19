import * as React from "react";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { DatePickerField } from "@/components/forms/DatePickerField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/formatters";
import type { CreateManualBillInput } from "@/mocks/services/billService";
import type { Vendor } from "@/types";

const lineItemSchema = z.object({
  description: z.string().trim().min(2, "Item description is required"),
  hsnSac: z.string().trim().min(2, "HSN/SAC required"),
  quantity: z.number().positive("Qty > 0"),
  unit: z.string().trim().min(1, "Unit required"),
  unitPrice: z.number().min(0, "Price >= 0"),
  discount: z.number().min(0),
  gstRate: z.number().min(0).max(28),
});

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const manualBillSchema = z.object({
  vendorId: z.string().min(1, "Select a vendor"),
  vendorGstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GSTIN_REGEX, "Enter a valid 15-character Indian GSTIN (e.g. 27AAACT2727Q1ZW)"),
  invoiceNumber: z.string().trim().min(2, "Invoice number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  poNumber: z.string().optional(),
  placeOfSupply: z.string().trim().min(2, "Place of supply is required"),
  gstRegime: z.enum(["CGST_SGST", "IGST"]),
  otherCharges: z.number(),
  roundOff: z.number(),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "Add at least one line item"),
});

type ManualBillFormValues = z.infer<typeof manualBillSchema>;

interface AddBillManuallyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendors: Vendor[];
  onCreateBill: (input: CreateManualBillInput) => Promise<void>;
}

export function AddBillManuallyDialog({
  open,
  onOpenChange,
  vendors,
  onCreateBill,
}: AddBillManuallyDialogProps) {
  const activeVendors = React.useMemo(
    () => vendors.filter((v) => v.status === "Active"),
    [vendors]
  );

  const {
    register,
    control,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ManualBillFormValues>({
    resolver: zodResolver(manualBillSchema),
    defaultValues: {
      vendorId: activeVendors[0]?.id ?? "",
      vendorGstin: activeVendors[0]?.gstin ?? "",
      invoiceNumber: "",
      invoiceDate: "2026-11-19",
      dueDate: "2026-12-19",
      poNumber: "",
      placeOfSupply: "Maharashtra (27)",
      gstRegime: "CGST_SGST",
      otherCharges: 0,
      roundOff: 0,
      notes: "",
      lineItems: [
        {
          description: "",
          hsnSac: "998315",
          quantity: 1,
          unit: "Units",
          unitPrice: 0,
          discount: 0,
          gstRate: 18,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems",
  });

  React.useEffect(() => {
    if (open) {
      const firstVendor = activeVendors[0];
      reset({
        vendorId: firstVendor?.id ?? "",
        vendorGstin: firstVendor?.gstin ?? "",
        invoiceNumber: `INV/26-27/${Math.floor(1500 + Math.random() * 8000)}`,
        invoiceDate: "2026-11-19",
        dueDate: "2026-12-19",
        poNumber: "",
        placeOfSupply: "Maharashtra (27)",
        gstRegime: firstVendor?.state === "Maharashtra" ? "CGST_SGST" : "IGST",
        otherCharges: 0,
        roundOff: 0,
        notes: "",
        lineItems: [
          {
            description: "",
            hsnSac: "998315",
            quantity: 1,
            unit: "Units",
            unitPrice: 12000,
            discount: 0,
            gstRate: 18,
          },
        ],
      });
    }
  }, [open, activeVendors, reset]);

  const watchedItems = watch("lineItems");
  const watchedOther = watch("otherCharges") || 0;
  const watchedRound = watch("roundOff") || 0;

  const totals = React.useMemo(() => {
    let taxable = 0;
    let tax = 0;
    (watchedItems || []).forEach((item) => {
      const lineTaxable = Math.max(0, (item.quantity || 0) * (item.unitPrice || 0) - (item.discount || 0));
      const lineTax = (lineTaxable * (item.gstRate || 0)) / 100;
      taxable += lineTaxable;
      tax += lineTax;
    });
    const grandTotal = taxable + tax + watchedOther + watchedRound;
    return { taxable, tax, grandTotal };
  }, [watchedItems, watchedOther, watchedRound]);

  const onSubmit = async (values: ManualBillFormValues) => {
    await onCreateBill({
      ...values,
      reviewStatus: "Confirmed",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[740px]">
        <DialogHeader>
          <DialogTitle>Add bill manually</DialogTitle>
          <DialogDescription>
            Enter supplier invoice details and line items directly into the bills ledger.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <Controller
                name="vendorId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      const v = activeVendors.find((item) => item.id === val);
                      if (v) {
                        setValue("vendorGstin", v.gstin, { shouldValidate: true });
                        setValue("gstRegime", v.state === "Maharashtra" ? "CGST_SGST" : "IGST");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeVendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} ({v.gstin})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.vendorId && (
                <p className="text-[12px] text-[var(--status-danger)]">{errors.vendorId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="man-gstin">GSTIN (GST Number)</Label>
              <Input
                id="man-gstin"
                placeholder="27AAACT2727Q1ZW"
                maxLength={15}
                className="font-mono-data uppercase"
                {...register("vendorGstin")}
              />
              {errors.vendorGstin && (
                <p className="text-[12px] text-[var(--status-danger)]">
                  {errors.vendorGstin.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="man-inv-num">Invoice / bill number</Label>
              <Input id="man-inv-num" className="font-mono-data" {...register("invoiceNumber")} />
              {errors.invoiceNumber && (
                <p className="text-[12px] text-[var(--status-danger)]">
                  {errors.invoiceNumber.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="man-po">PO number (optional)</Label>
              <Input
                id="man-po"
                placeholder="PO-2026-910"
                className="font-mono-data"
                {...register("poNumber")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="man-inv-date">Invoice date</Label>
              <Controller
                name="invoiceDate"
                control={control}
                render={({ field }) => (
                  <DatePickerField id="man-inv-date" value={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="man-due-date">Due date</Label>
              <Controller
                name="dueDate"
                control={control}
                render={({ field }) => (
                  <DatePickerField id="man-due-date" value={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="man-pos">Place of supply</Label>
              <Input id="man-pos" {...register("placeOfSupply")} />
            </div>

            <div className="space-y-1.5">
              <Label>GST regime</Label>
              <Controller
                name="gstRegime"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CGST_SGST">Intra-state (CGST + SGST)</SelectItem>
                      <SelectItem value="IGST">Inter-state (IGST)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <Separator />

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[13px] font-semibold">Line items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    description: "",
                    hsnSac: "998315",
                    quantity: 1,
                    unit: "Units",
                    unitPrice: 0,
                    discount: 0,
                    gstRate: 18,
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add line item
              </Button>
            </div>

            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-3 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                    Item #{idx + 1}
                  </span>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      aria-label="Remove item"
                      className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--status-danger-bg)] hover:text-[var(--status-danger)] cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
                  <div className="sm:col-span-4 space-y-1">
                    <Label className="text-[11px]">Description</Label>
                    <Input
                      placeholder="Service or material description"
                      {...register(`lineItems.${idx}.description`)}
                    />
                    {errors.lineItems?.[idx]?.description && (
                      <p className="text-[11px] text-[var(--status-danger)]">
                        {errors.lineItems[idx]?.description?.message}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[11px]">HSN / SAC</Label>
                    <Input
                      className="font-mono-data"
                      {...register(`lineItems.${idx}.hsnSac`)}
                    />
                  </div>

                  <div className="sm:col-span-1 space-y-1">
                    <Label className="text-[11px]">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      className="tabular-nums"
                      {...register(`lineItems.${idx}.quantity`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="sm:col-span-1 space-y-1">
                    <Label className="text-[11px]">Unit</Label>
                    <Input {...register(`lineItems.${idx}.unit`)} />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[11px]">Unit price (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="font-mono-data tabular-nums"
                      {...register(`lineItems.${idx}.unitPrice`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="sm:col-span-1 space-y-1">
                    <Label className="text-[11px]">Discount</Label>
                    <Input
                      type="number"
                      min={0}
                      className="font-mono-data tabular-nums"
                      {...register(`lineItems.${idx}.discount`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="sm:col-span-1 space-y-1">
                    <Label className="text-[11px]">GST %</Label>
                    <Controller
                      name={`lineItems.${idx}.gstRate`}
                      control={control}
                      render={({ field: gstField }) => (
                        <Select
                          value={String(gstField.value)}
                          onValueChange={(v) => gstField.onChange(Number(v))}
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
                      )}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="man-other">Other charges (₹)</Label>
              <Input
                id="man-other"
                type="number"
                className="font-mono-data tabular-nums"
                {...register("otherCharges", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="man-round">Round off (₹)</Label>
              <Input
                id="man-round"
                type="number"
                step="0.01"
                className="font-mono-data tabular-nums"
                {...register("roundOff", { valueAsNumber: true })}
              />
            </div>
            <div className="rounded-md border border-[var(--brand-burgundy)]/20 bg-[var(--brand-burgundy-tint)] px-3.5 py-2 flex flex-col justify-center">
              <span className="text-[11px] text-[var(--text-secondary)]">Grand total</span>
              <span className="font-mono-data text-[16px] font-semibold text-[var(--brand-burgundy)] tabular-nums">
                {formatINR(totals.grandTotal)}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="man-notes">Notes (optional)</Label>
            <Textarea id="man-notes" placeholder="Internal invoice remarks..." {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save manual bill
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
