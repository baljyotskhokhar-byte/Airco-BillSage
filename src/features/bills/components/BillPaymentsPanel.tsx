import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { DatePickerField } from "@/components/forms/DatePickerField";
import { Button } from "@/components/ui/button";
import { ElevatedCard } from "@/components/ui/card";
import { Progress } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatDateDisplay, formatINR } from "@/lib/formatters";
import { paymentService } from "@/mocks/services/paymentService";
import type { Bill, PaymentMethod } from "@/types";

interface BillPaymentsPanelProps {
  bill: Bill;
}

export function BillPaymentsPanel({ bill }: BillPaymentsPanelProps) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = React.useState(false);

  const outstanding = Math.max(0, Number((bill.totalAmount - bill.amountPaid).toFixed(2)));
  const paidPct =
    bill.totalAmount > 0 ? Math.min(100, Number(((bill.amountPaid / bill.totalAmount) * 100).toFixed(1))) : 0;

  const [payDate, setPayDate] = React.useState("2026-11-19");
  const [payAmount, setPayAmount] = React.useState<number>(outstanding);
  const [payMethod, setPayMethod] = React.useState<PaymentMethod>("Bank Transfer");
  const [payRef, setPayRef] = React.useState("");
  const [payNotes, setPayNotes] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPayAmount(outstanding);
  }, [outstanding]);

  const { data: payments = [] } = useQuery({
    queryKey: ["bill-payments", bill.id],
    queryFn: () => paymentService.listByBill(bill.id),
  });

  const recordMutation = useMutation({
    mutationFn: () =>
      paymentService.record({
        billId: bill.id,
        paymentDate: payDate,
        amount: payAmount,
        method: payMethod,
        referenceNumber: payRef.trim() || `REF-${Date.now().toString().slice(-6)}`,
        notes: payNotes.trim() || undefined,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["bill", bill.id] });
      queryClient.invalidateQueries({ queryKey: ["bill-payments", bill.id] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["bank-statement"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      toast.success(`Recorded ${formatINR(res.payment.amount)} payment`);
      setAdding(false);
      setPayRef("");
      setPayNotes("");
      setErrorMsg(null);
    },
    onError: (err) => {
      setErrorMsg(err instanceof Error ? err.message : "Could not record payment");
    },
  });

  const applyQuickPct = (pct: number) => {
    const raw = Number(((bill.totalAmount * pct) / 100).toFixed(2));
    setPayAmount(Math.min(outstanding, raw));
    setErrorMsg(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (payAmount <= 0) {
      setErrorMsg("Payment amount must be greater than zero.");
      return;
    }
    if (payAmount > outstanding + 0.01) {
      setErrorMsg(`Amount cannot exceed remaining balance of ${formatINR(outstanding)}.`);
      return;
    }
    recordMutation.mutate();
  };

  return (
    <ElevatedCard className="p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
            Payments &amp; settlement progress
          </h2>
          <p className="text-[12px] text-[var(--text-secondary)]">
            Track when each payment was made and percentage settled
          </p>
        </div>
        {outstanding > 0.01 && !adding && (
          <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add payment
          </Button>
        )}
      </div>

      {/* Summary & Percentage Bar */}
      <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
          <div>
            <span className="text-[var(--text-secondary)]">Total amount</span>
            <p className="mt-0.5 font-mono-data text-[14px] font-semibold tabular-nums">
              {formatINR(bill.totalAmount)}
            </p>
          </div>
          <div>
            <span className="text-[var(--text-secondary)]">Amount paid</span>
            <p className="mt-0.5 font-mono-data text-[14px] font-semibold text-[var(--status-success)] tabular-nums">
              {formatINR(bill.amountPaid)}
            </p>
          </div>
          <div>
            <span className="text-[var(--text-secondary)]">Balance remaining</span>
            <p className="mt-0.5 font-mono-data text-[14px] font-semibold text-[var(--status-danger)] tabular-nums">
              {formatINR(outstanding)}
            </p>
          </div>
          <div>
            <span className="text-[var(--text-secondary)]">Percentage paid</span>
            <p className="mt-0.5 font-mono-data text-[14px] font-semibold text-[var(--brand-teal)] tabular-nums">
              {paidPct}%
            </p>
          </div>
        </div>
        <Progress value={paidPct} />
      </div>

      {/* Inline Record Payment Form */}
      {adding && outstanding > 0.01 && (
        <form
          onSubmit={handleSave}
          className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 space-y-3.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-[var(--brand-navy)]">
              Record payment against {bill.invoiceNumber}
            </span>
            <div className="flex items-center gap-1.5">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyQuickPct(pct)}
                  className="rounded border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-charcoal)] hover:border-[var(--brand-plum)] hover:bg-[var(--brand-plum-bg)] hover:text-[var(--brand-plum)] cursor-pointer"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <p className="text-[12px] text-[var(--status-danger)]">{errorMsg}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Payment date</Label>
              <DatePickerField value={payDate} onChange={setPayDate} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">
                Amount (₹) ·{" "}
                {bill.totalAmount > 0
                  ? `${((payAmount / bill.totalAmount) * 100).toFixed(1)}%`
                  : "0%"}
              </Label>
              <Input
                type="number"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                className="font-mono-data tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Method</Label>
              <Select value={payMethod} onValueChange={(v) => setPayMethod(v as PaymentMethod)}>
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
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Cheque / Ref #</Label>
              <Input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="NEFT-HDFC-..."
                className="font-mono-data"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Input
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Optional payment note (e.g. 50% milestone tranche)..."
              className="max-w-md"
            />
            <div className="flex items-center gap-2 shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={recordMutation.isPending}>
                {recordMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save payment
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Recorded Payments Table */}
      {payments.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-md border border-dashed border-[var(--border-default)] px-4 py-4 text-[13px] text-[var(--text-secondary)]">
          <CreditCard className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
          <span>No payments have been made for this bill yet (0% settled).</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--border-subtle)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] font-medium text-[var(--text-secondary)]">
                <th className="py-2 pl-4 pr-3">Payment date</th>
                <th className="py-2 px-3">Method</th>
                <th className="py-2 px-3">Reference / Cheque #</th>
                <th className="py-2 px-3 text-right">Share (%)</th>
                <th className="py-2 pl-3 pr-4 text-right">Amount paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[12px]">
              {payments.map((p) => {
                const sharePct =
                  bill.totalAmount > 0 ? ((p.amount / bill.totalAmount) * 100).toFixed(1) : "0.0";
                return (
                  <tr key={p.id}>
                    <td className="py-2.5 pl-4 pr-3 tabular-nums">
                      {formatDateDisplay(p.paymentDate)}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-charcoal)]">{p.method}</td>
                    <td className="py-2.5 px-3 font-mono-data text-[var(--text-secondary)]">
                      {p.referenceNumber}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-data text-[var(--brand-navy)] font-medium tabular-nums">
                      {sharePct}%
                    </td>
                    <td className="py-2.5 pl-3 pr-4 text-right font-mono-data font-semibold text-[var(--status-success)] tabular-nums">
                      {formatINR(p.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ElevatedCard>
  );
}
