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

const depositSchema = z.object({
  valueDate: z.string().min(1, "Value date is required"),
  description: z.string().trim().min(3, "Description is required"),
  chequeNo: z.string().trim().min(2, "Cheque or UTR reference is required"),
  amount: z.number().positive("Amount must be greater than zero"),
});

type DepositFormValues = z.infer<typeof depositSchema>;

interface RecordDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: DepositFormValues) => Promise<void>;
}

export function RecordDepositDialog({
  open,
  onOpenChange,
  onSave,
}: RecordDepositDialogProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    control,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DepositFormValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      valueDate: "2026-11-19",
      description: "",
      chequeNo: "",
      amount: 0,
    },
  });

  React.useEffect(() => {
    if (open) {
      setServerError(null);
      reset({
        valueDate: "2026-11-19",
        description: "",
        chequeNo: "",
        amount: 0,
      });
    }
  }, [open, reset]);

  const onSubmit = async (values: DepositFormValues) => {
    setServerError(null);
    try {
      await onSave(values);
      onOpenChange(false);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not record deposit.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Record bank deposit (Credit)</DialogTitle>
          <DialogDescription>
            Log an inward customer remittance or credit entry into the corporate current account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {serverError && (
            <div
              role="alert"
              className="rounded-md border border-[var(--status-danger)]/30 bg-[var(--status-danger-bg)] px-3 py-2 text-[12px] text-[var(--status-danger)]"
            >
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="dep-date">Value date</Label>
              <Controller
                name="valueDate"
                control={control}
                render={({ field }) => (
                  <DatePickerField id="dep-date" value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.valueDate && (
                <p className="text-[12px] text-[var(--status-danger)]">{errors.valueDate.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dep-amount">Credit amount (₹)</Label>
              <Input
                id="dep-amount"
                type="number"
                step="0.01"
                className="font-mono-data tabular-nums"
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-[12px] text-[var(--status-danger)]">{errors.amount.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dep-desc">Description</Label>
            <Input
              id="dep-desc"
              placeholder="RTGS INWARD — Customer AR Settlement"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-[12px] text-[var(--status-danger)]">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dep-ref">Cheque / UTR Reference No.</Label>
            <Input
              id="dep-ref"
              placeholder="RTGS-HDFC-41920188"
              className="font-mono-data"
              {...register("chequeNo")}
            />
            {errors.chequeNo && (
              <p className="text-[12px] text-[var(--status-danger)]">{errors.chequeNo.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Record credit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
