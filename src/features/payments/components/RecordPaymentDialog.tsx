import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatINR } from "@/lib/formatters";
import type { Bill, PaymentMethod } from "@/types";

const paymentSchema = z.object({
  billId: z.string().min(1, "Select a bill to pay"),
  paymentDate: z.string().min(1, "Payment date is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  method: z.enum(["Bank Transfer", "UPI", "Cheque", "Cash", "Other"]),
  referenceNumber: z.string().trim().min(2, "Transaction reference is required"),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payableBills: Bill[];
  initialBillId?: string;
  onRecord: (values: {
    billId: string;
    paymentDate: string;
    amount: number;
    method: PaymentMethod;
    referenceNumber: string;
    notes?: string;
  }) => Promise<void>;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  payableBills,
  initialBillId,
  onRecord,
}: RecordPaymentDialogProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const defaultBill =
    payableBills.find((b) => b.id === initialBillId) ?? payableBills[0];
  const defaultOutstanding = defaultBill
    ? Number((defaultBill.totalAmount - defaultBill.amountPaid).toFixed(2))
    : 0;

  const {
    register,
    control,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      billId: defaultBill?.id ?? "",
      paymentDate: "2026-11-19",
      amount: defaultOutstanding,
      method: "Bank Transfer",
      referenceNumber: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      setServerError(null);
      const target = payableBills.find((b) => b.id === initialBillId) ?? payableBills[0];
      const rem = target ? Number((target.totalAmount - target.amountPaid).toFixed(2)) : 0;
      reset({
        billId: target?.id ?? "",
        paymentDate: "2026-11-19",
        amount: rem,
        method: "Bank Transfer",
        referenceNumber: "",
        notes: "",
      });
    }
  }, [open, initialBillId, payableBills, reset]);

  const selectedBillId = watch("billId");
  const enteredAmount = watch("amount") || 0;
  const selectedBill = payableBills.find((b) => b.id === selectedBillId);
  const outstanding = selectedBill
    ? Number((selectedBill.totalAmount - selectedBill.amountPaid).toFixed(2))
    : 0;
  const remainingAfter = Math.max(0, Number((outstanding - enteredAmount).toFixed(2)));
  const exceedsOutstanding = enteredAmount > outstanding + 0.01;

  const onSubmit = async (values: PaymentFormValues) => {
    setServerError(null);
    if (values.amount > outstanding + 0.01) {
      setServerError(
        `Amount cannot exceed outstanding balance of ${formatINR(outstanding)}.`
      );
      return;
    }
    try {
      await onRecord(values);
      onOpenChange(false);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not record payment.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Log a full or partial payment against an outstanding invoice.
          </DialogDescription>
        </DialogHeader>

        {payableBills.length === 0 ? (
          <div className="py-6 text-center text-[13px] text-[var(--text-secondary)]">
            All active bills are currently settled.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {serverError && (
              <div
                role="alert"
                className="rounded-md border border-[var(--status-danger)]/30 bg-[var(--status-danger-bg)] px-3 py-2 text-[12px] text-[var(--status-danger)]"
              >
                {serverError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Bill</Label>
              <Controller
                name="billId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      const nextBill = payableBills.find((b) => b.id === val);
                      if (nextBill) {
                        setValue(
                          "amount",
                          Number((nextBill.totalAmount - nextBill.amountPaid).toFixed(2))
                        );
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an unpaid bill" />
                    </SelectTrigger>
                    <SelectContent>
                      {payableBills.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.invoiceNumber} — {b.vendorName} (Due{" "}
                          {formatINR(b.totalAmount - b.amountPaid)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.billId && (
                <p className="text-[12px] text-[var(--status-danger)]">{errors.billId.message}</p>
              )}
            </div>

            {selectedBill && (
              <div className="grid grid-cols-3 gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-[12px]">
                <div>
                  <span className="text-[var(--text-secondary)]">Invoice total</span>
                  <p className="font-mono-data font-medium tabular-nums">
                    {formatINR(selectedBill.totalAmount)}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Outstanding</span>
                  <p className="font-mono-data font-semibold text-[var(--status-danger)] tabular-nums">
                    {formatINR(outstanding)}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">After payment</span>
                  <p className="font-mono-data font-semibold text-[var(--brand-teal)] tabular-nums">
                    {formatINR(remainingAfter)}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="pay-date">Payment date</Label>
                <Controller
                  name="paymentDate"
                  control={control}
                  render={({ field }) => (
                    <DatePickerField
                      id="pay-date"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.paymentDate && (
                  <p className="text-[12px] text-[var(--status-danger)]">
                    {errors.paymentDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pay-amount">Amount (₹)</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  step="0.01"
                  className="font-mono-data tabular-nums"
                  {...register("amount", { valueAsNumber: true })}
                />
                {(errors.amount || exceedsOutstanding) && (
                  <p className="text-[12px] text-[var(--status-danger)]">
                    {exceedsOutstanding
                      ? `Cannot exceed ${formatINR(outstanding)}`
                      : errors.amount?.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Payment method</Label>
                <Controller
                  name="method"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pay-ref">Transaction reference</Label>
                <Input
                  id="pay-ref"
                  placeholder="NEFT-HDFC-994012"
                  className="font-mono-data"
                  {...register("referenceNumber")}
                />
                {errors.referenceNumber && (
                  <p className="text-[12px] text-[var(--status-danger)]">
                    {errors.referenceNumber.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pay-notes">Notes</Label>
              <Textarea
                id="pay-notes"
                placeholder="Optional settlement remark..."
                {...register("notes")}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || exceedsOutstanding}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Record payment
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
